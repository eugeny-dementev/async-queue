import { describe, test, expect } from '@jest/globals';

import { AsyncQueue } from './queue.js';
import { ILockingAction, QueueContext } from './types.js';
import { Action, lockingClassFactory } from './action.js';
import { QueueRunner } from './runner.js';

function anyAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}

function lockingAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void): ILockingAction {
  class Lock extends lockingClassFactory<C>('browser') {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new Lock();
}

describe('Queue', () => {
  test('order', async () => {
    const order: string[] = [];
    let ended: boolean = false;

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        anyAction(() => { order.push('action') }),
        anyAction(() => { order.push('action') }),
        anyAction(() => { order.push('action') }),
        anyAction(({ abort }) => abort()),
        anyAction(() => { order.push('action') }),
        anyAction(() => { order.push('action') }),
        anyAction(() => { order.push('action') }),
      ],
      name: 'TestQueue',
      end: () => {
        ended = true;
      },
      lockingContext,
    });

    await queue.run({});

    expect(ended).toBe(true);
    expect(order).toStrictEqual(['action', 'action', 'action']);
  });

  test('locking', async () => {
    let ended: boolean = false;

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const errors: Error[] = [];

    const queue = new AsyncQueue({
      actions: [
        anyAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(false)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
        lockingAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(true)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
        anyAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(false)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
      ],
      name: 'TestQueue',
      end: () => {
        ended = true;
      },
      lockingContext,
    });

    await queue.run({});

    if (errors.length > 0) {
      throw errors[0];
    }

    expect(ended).toBe(true);
  });
});


