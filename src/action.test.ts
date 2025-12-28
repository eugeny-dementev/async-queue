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

  test('lockingClassFactory throws when scope is not a string', () => {
    expect(() => lockingClassFactory(123 as unknown as string)).toThrow(TypeError);
  });

  test('lockingClassFactory sets scope and locking flag', async () => {
    class ScopedAction extends lockingClassFactory<Record<string, never>>('browser') {
      async execute(_context: QueueContext): Promise<void> {
        return Promise.resolve();
      }
    }

    const instance = new ScopedAction();

    expect(instance.locking).toBe(true);
    expect(instance.scope).toBe('browser');
    expect(instance instanceof Action).toBe(true);
  });
});
