import { describe, expect, test } from '@jest/globals';

import { Action } from './action.js';
import { AsyncQueue } from './queue.js';
import { QueueRunner } from './runner.js';
import { logger } from './testlib.js';
import { QueueContext } from './types.js';
import { util } from './utils.js';

function anyAction<C = Record<string, never>>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}

describe('util', () => {
  test('if pushes then branch before remaining queue', async () => {
    const order: string[] = [];
    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        util.if<{ flag: boolean }>((context) => context.flag, {
          then: [
            anyAction(() => { order.push('then-1') }),
            anyAction(() => { order.push('then-2') }),
          ],
          else: [
            anyAction(() => { order.push('else') }),
          ],
        }),
        anyAction(() => { order.push('after') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({ flag: true });

    expect(order).toStrictEqual(['then-1', 'then-2', 'after']);
  });

  test('if pushes else branch when condition is false', async () => {
    const order: string[] = [];
    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        util.if<{ flag: boolean }>((context) => context.flag, {
          then: [
            anyAction(() => { order.push('then') }),
          ],
          else: [
            anyAction(() => { order.push('else') }),
          ],
        }),
        anyAction(() => { order.push('after') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({ flag: false });

    expect(order).toStrictEqual(['else', 'after']);
  });

  test('valid pushes actions only when validator passes', async () => {
    const order: string[] = [];
    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        util.valid<{ count: number }>((context) => context.count > 0, [
          anyAction(() => { order.push('valid') }),
        ]),
        anyAction(() => { order.push('after') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({ count: 1 });

    expect(order).toStrictEqual(['valid', 'after']);
  });

  test('valid skips actions when validator fails', async () => {
    const order: string[] = [];
    const runner = new QueueRunner();
    const lockingContext = runner.preparteLockingContext();

    const queue = new AsyncQueue({
      actions: [
        util.valid<{ count: number }>((context) => context.count > 0, [
          anyAction(() => { order.push('valid') }),
        ]),
        anyAction(() => { order.push('after') }),
      ],
      name: 'TestQueue',
      end: () => {},
      lockingContext,
      logger,
    });

    await queue.run({ count: 0 });

    expect(order).toStrictEqual(['after']);
  });
});
