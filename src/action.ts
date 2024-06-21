import { IAction, ILockingAction, QueueContext } from "./types.js";

export type Options = {
  delay?: number,
};

export abstract class Action<C> implements IAction {
  delay: number = 0

  constructor(opts: Options = {}) {
    if (opts.delay) this.delay = opts.delay;
  }

  abstract execute(context: C & QueueContext): Promise<void>
}

export abstract class LockingAction<C> extends Action<C> implements ILockingAction {
    locking = true
}

export function lockingClassFactory<C>(scope: string) {
  abstract class NoName extends Action<C> {
  }

  Object.defineProperty(NoName, 'name', { value: `${LockingAction.constructor.name}(${scope})` });

  return NoName;
}
