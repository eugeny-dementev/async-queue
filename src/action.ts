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

  async onError(error: Error, context: QueueContext): Promise<void> {
    const logger = (context as { logger?: { error?: (e: Error) => void } }).logger;

    if (typeof logger?.error === 'function') {
      logger.error(error);
    }

    context.abort();
  }
}

export abstract class LockingAction<C> extends Action<C> implements ILockingAction {
    locking = true
    scope: string | null = null;
}

export function lockingClassFactory<C>(scope: string) {
  if (typeof scope !== 'string') {
    throw new TypeError('scope must be a string')
  }

  abstract class NoName extends LockingAction<C> {
    scope = scope
  }

  Object.defineProperty(NoName, 'name', { value: `${LockingAction.constructor.name}(${scope})` });

  return NoName;
}
