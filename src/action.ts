import { IAction, QueueContext } from "./types.js";

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

export function LockingAction(scope: string) {
  abstract class LockingAction<C> extends Action<C> {

  }

  Object.defineProperty(LockingAction, 'name', { value: `${LockingAction.constructor.name}(${scope})` });

  return LockingAction;
}
