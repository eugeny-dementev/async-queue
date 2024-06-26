import { AsyncQueue, ILogger } from "./queue.js";
import { QueueAction } from "./types.js";

export type EndListener = (name: string, size: number) => void;

export type RunnerOpts = {
  logger?: ILogger
}

type ReversePromise = {
  promise: Promise<unknown>
  resolve: (value?: unknown) => void
}
function reversePromiseFactory(): ReversePromise {
  let resolve = (value?: unknown) => { };
  const promise = new Promise((res) => {
    resolve = res;
  })

  return {
    promise,
    resolve,
  };
}

export type LockingContext = {
  isLocked: (scope: string) => boolean,
  lock: (scope: string) => void,
  unlock: (scope: string) => void,
  wait: (scope: string) => Promise<unknown>,
}

export class QueueRunner {
  queues = new Map();
  listeners: EndListener[] = [];
  logger?: ILogger;
  locking: LockingContext;

  constructor(opts: RunnerOpts = {}) {
    if (opts.logger) {
      this.logger = opts.logger;
    }

    this.locking = this.preparteLockingContext();
  }

  preparteLockingContext(): LockingContext {
    const lockedScopes = new Map<string, ReversePromise>();

    const unlock = (scope: string): void => {
      if (!lockedScopes.has(scope)) {
        return;
      }


      lockedScopes.get(scope)!.resolve();

      lockedScopes.delete(scope)
    }

    const wait = (scope: string): Promise<unknown> => {
      if (!lockedScopes.has(scope)) {
        return Promise.resolve();
      }


      return lockedScopes.get(scope)!.promise;
    }

    const lock = (scope: string): void => {
      if (lockedScopes.has(scope)) {
        throw new Error(`scope "${scope}" is already locked`);
      }

      lockedScopes.set(scope, reversePromiseFactory());
    }

    const isLocked = (scope: string): boolean => {
      return lockedScopes.has(scope);
    }

    return {
      isLocked,
      lock,
      unlock,
      wait,
    }
  }

  add(actions: QueueAction[], context: object = {}, name: string = this.getName()) {
    const queue = new AsyncQueue({
      name, actions,
      end: () => {
        this.queues.delete(name);
        this.endEvent(name);
      },
      logger: this.logger,
      lockingContext: this.locking,
    });

    this.queues.set(name, queue);

    queue.run(context);
  }

  addEndListener(listener: EndListener) {
    this.listeners.push(listener);
  }

  endEvent(name: string) {
    for (const listener of this.listeners) {
      listener(name, this.queues.size);
    }
  }

  getName() {
    return Math.random().toString(36).substring(2, 10);
  }
}
