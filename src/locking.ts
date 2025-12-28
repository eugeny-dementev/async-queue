import { IAction, ILockingAction } from './types.js';

type ReversePromise = {
  promise: Promise<void>
  resolve: () => void
};

function reversePromiseFactory(): ReversePromise {
  let resolve = () => {};
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve,
  };
}

export type LockingContext = {
  isLocked: (scope: string) => boolean
  lock: (scope: string) => void
  unlock: (scope: string) => void
  wait: (scope: string) => Promise<void>
  runWithLock: (scope: string, fn: () => Promise<void>) => Promise<void>
};

export class LockManager implements LockingContext {
  private lockedScopes = new Map<string, ReversePromise>();

  isLocked(scope: string): boolean {
    return this.lockedScopes.has(scope);
  }

  lock(scope: string): void {
    if (this.lockedScopes.has(scope)) {
      throw new Error(`scope "${scope}" is already locked`);
    }

    this.lockedScopes.set(scope, reversePromiseFactory());
  }

  unlock(scope: string): void {
    if (!this.lockedScopes.has(scope)) {
      return;
    }

    this.lockedScopes.get(scope)!.resolve();
    this.lockedScopes.delete(scope);
  }

  wait(scope: string): Promise<void> {
    if (!this.lockedScopes.has(scope)) {
      return Promise.resolve();
    }

    return this.lockedScopes.get(scope)!.promise;
  }

  async runWithLock(scope: string, fn: () => Promise<void>): Promise<void> {
    if (this.isLocked(scope)) {
      await this.wait(scope);
    }

    this.lock(scope);
    try {
      await fn();
    } finally {
      this.unlock(scope);
    }
  }
}

export function isLockingAction(action: IAction): action is IAction & ILockingAction {
  return (action as unknown as ILockingAction).locking === true;
}

export function assertValidScope(scope: unknown): string {
  if (typeof scope !== 'string' || scope.trim().length === 0) {
    throw new TypeError('Lock scope must be a non-empty string');
  }

  return scope;
}
