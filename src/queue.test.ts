import { describe, test, expect } from '@jest/globals';

import { AsyncQueue } from './queue.js';
import { QueueContext } from './types.js';
import { Action, lockingClassFactory } from './action.js';

function anyAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}

function lockingAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void) {
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
    });

    await queue.run({});

    expect(ended).toBe(true);
    expect(order).toStrictEqual(['action', 'action', 'action']);
  });

  test('locking', async () => {

  });
});


