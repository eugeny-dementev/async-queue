import { describe, expect, test } from '@jest/globals';

import { Action, lockingClassFactory } from './action.js';
import { AsyncQueue } from './queue.js';
import { QueueRunner } from './runner.js';
import { logger } from './testlib.js';
import { ILockingAction, QueueContext } from './types.js';

function anyAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}

function lockingAction<C = null>(execute: (context: C & QueueContext) => Promise<void>): ILockingAction {
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
      logger,
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

    let scopedCounter = 0;

    const queue = new AsyncQueue({
      actions: [
        anyAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(false)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
        lockingAction(async () => {
          scopedCounter += 1;
          try {
            expect(lockingContext.isLocked('browser')).toBe(true)
            expect(scopedCounter).toBe(1);
          } catch (e) {
            errors.push(e as Error)
          }
          scopedCounter -= 1;
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
      logger,
    });
    const queue2 = new AsyncQueue({
      actions: [
        anyAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(false)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
        lockingAction(async () => {
          scopedCounter += 1;
          try {
            expect(lockingContext.isLocked('browser')).toBe(true)
            expect(scopedCounter).toBe(1);
          } catch (e) {
            errors.push(e as Error)
          }
          scopedCounter -= 1;
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
      logger,
    });
    const queue3 = new AsyncQueue({
      actions: [
        anyAction(() => {
          try {
            expect(lockingContext.isLocked('browser')).toBe(false)
          } catch (e) {
            errors.push(e as Error)
          }
        }),
        lockingAction(async () => {
          scopedCounter += 1;
          try {
            expect(lockingContext.isLocked('browser')).toBe(true)
            expect(scopedCounter).toBe(1);
          } catch (e) {
            errors.push(e as Error)
          }
          scopedCounter -= 1;
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
      logger,
    });

    await Promise.all([
      queue.run({}),
      queue2.run({}),
      queue3.run({}),
    ]);

    if (errors.length > 0) {
      throw errors[0];
    }

    expect(ended).toBe(true);
  });

  test('context push inserts actions before the remaining queue', async () => {
    const order: string[] = [];

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        anyAction(({ push }) => {
          order.push('first');
          push([
            anyAction(() => { order.push('pushed-1') }),
            anyAction(() => { order.push('pushed-2') }),
          ]);
        }),
        anyAction(() => { order.push('second') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({});

    expect(order).toStrictEqual(['first', 'pushed-1', 'pushed-2', 'second']);
  });

  test('context extend and name are available to actions', async () => {
    const seen: string[] = [];

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        anyAction(({ extend }) => {
          extend({ tag: 'alpha' });
        }),
        anyAction<{ tag: string }>(({ name, tag }) => {
          seen.push(`${name()}-${tag}`);
        }),
      ],
      name: 'QueueAlpha',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({});

    expect(seen).toStrictEqual(['QueueAlpha-alpha']);
  });

  test('context abort clears remaining actions', async () => {
    const order: string[] = [];

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        anyAction(({ abort }) => {
          order.push('first');
          abort();
        }),
        anyAction(() => { order.push('second') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({});

    expect(order).toStrictEqual(['first']);
  });

  test('queue accepts action classes as items', async () => {
    const order: string[] = [];

    class ClassAction extends Action<QueueContext> {
      async execute(_context: QueueContext): Promise<void> {
        order.push('class');
      }
    }

    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        ClassAction,
        anyAction(() => { order.push('instance') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({});

    expect(order).toStrictEqual(['class', 'instance']);
  });
});
