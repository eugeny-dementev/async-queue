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
        if (size !== 0) {
          return;
        }

        try {
          expect(order.toString()).toEqual(['first', 'second', 'third'].toString());
        } catch (e) {
          rej(e)
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

  test('should abort queue if util.abort is used', async () => {
    const order: string[] = []; // queue should fill that array in particular order

    const testQueue = [
      anyAction(() => { order.push('first') }),
      anyAction(() => { order.push('second') }),
      util.abort,
      anyAction(() => { order.push('third') }),
    ];

    return new Promise((res, rej) => {
      const runner = new QueueRunner({ logger });

      runner.addEndListener((name, size) => {
        try {
          expect(order.toString()).toEqual(['first', 'second'].toString());
        } catch (e) {
          rej(e)
          return;
        }

        res(null);
      });

      runner.add(testQueue);
    });
  });

  test('add passes context and uses provided name', async () => {
    const seen: string[] = [];

    return new Promise((res, rej) => {
      const runner = new QueueRunner({ logger });

      runner.addEndListener((name, size) => {
        try {
          expect(name).toBe('named-queue');
          expect(size).toBe(0);
          expect(seen).toStrictEqual(['named-queue-ok']);
        } catch (e) {
          rej(e)
          return;
        }

        res(null);
      });

      runner.add([
        anyAction<{ tag: string }>(({ tag, name }) => {
          seen.push(`${name()}-${tag}`);
        }),
      ], { tag: 'ok' }, 'named-queue');
    });
  });
});
