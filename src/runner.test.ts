import { describe, test, expect } from '@jest/globals';

import { QueueRunner } from './runner.js';
import { util } from './utils.js';
import { QueueContext } from './types.js';
import { Action } from './action.js';
import { logger } from './testlib.js';

function anyAction<C>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}

describe('Runner', () => {
  test('order', async () => {
    const order: string[] = []; // queue should fill that array in particular order

    const testQueue = [
      util.delay(10),
      anyAction(() => { order.push('second') }),
    ];
    const testQueue2 = [
      anyAction(() => { order.push('first') }),
      util.delay(15),
      anyAction(() => { order.push('third') }),
    ];

    return new Promise((res, rej) => {
      const runner = new QueueRunner({ logger });

      runner.addEndListener((name, size) => {
        if (size === 1) {
          try {
            expect(order.toString()).toEqual(['first', 'second'].toString());
          } catch (e) {
            res(e)
          }
          return
        }

        try {
          expect(size).toEqual(0);
          expect(order.toString()).toEqual(['first', 'second', 'third'].toString());
        } catch (e) {
          res(e)
          return;
        }

        res(null);
      });

      runner.add(testQueue);
      runner.add(testQueue2);
    });
  });

  test('locking context', async () => {
    const runner = new QueueRunner({ logger });
    const lockingContext = runner.preparteLockingContext();

    lockingContext.lock('browser');

    expect(lockingContext.isLocked('browser')).toBe(true);

    await Promise.all([
      lockingContext.wait('browser'),
      lockingContext.unlock('browser'),
    ]);
  });
});

