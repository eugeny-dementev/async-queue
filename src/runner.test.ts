import { describe, test, expect } from '@jest/globals';

import { QueueRunner } from './runner.js';
import { util } from './utils.js';
import { QueueContext } from './types.js';
import { Action } from './action.js';
import { logger } from './queue.test.js';

function anyAction<C>(execute: (context: C & QueueContext) => Promise<void> | void) {
  class AnyAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      return execute(context);
    }
  }

  return new AnyAction();
}


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

describe('Runner', () => {
  test('order', async () => {
    return new Promise((res) => {
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
});

