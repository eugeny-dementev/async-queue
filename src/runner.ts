import { AsyncQueue, ILogger } from "./queue.js";
import { LockManager, LockingContext as LockingContextType } from "./locking.js";
import { QueueAction } from "./types.js";

export type EndListener = (name: string, size: number) => void;

export type RunnerOpts = {
  logger?: ILogger
}

export type LockingContext = LockingContextType;

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
    return new LockManager();
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
