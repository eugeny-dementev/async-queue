import { describe, test, expect } from '@jest/globals';
import { Delay } from './utils.js';
import { Action, lockingClassFactory } from './action.js';
import { QueueContext, ILockingAction } from './types.js';

function lockingAction<C = null>(execute: (context: C & QueueContext) => Promise<void> | void): ILockingAction {
  class Lock extends lockingClassFactory<C>('browser') {
      async execute(context: C & QueueContext): Promise<void> {
          return execute(context);
      }
  }

  return new Lock();
}

describe('Action', () => {
  test('some', async () => {
    const a = new Delay({ delay: 10 });

    let run = false;

    await a.execute().then(() => run = true)

    expect(run).toBe(true);
  })

  test('Each action should be instance of Action', async () => {
    expect(lockingAction(() => {}) instanceof Action).toBe(true);
  }); 
});
