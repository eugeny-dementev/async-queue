import { Action } from './action.js';
import { LockingContext } from './locking.js';
import { QueueContextImpl } from './queue-context.js';
import { QueueExecutor } from './queue-executor.js';
import { IAction, QueueAction } from './types.js';

export interface ILogger {
  info: (message: string) => void
  setContext: (context: string) => void
  error: (e: Error) => void
}
const logger = {
  info(message: string) {
    console.log(message);
  },
  setContext(context: string) { },
  error(e: Error) { console.error(e) },
} as ILogger

export type QueueOpts = {
  actions: QueueAction[],
  name: string
  end?: () => void,
  logger?: ILogger
  lockingContext: LockingContext,
}

export class AsyncQueue {
  name: string = 'default queue name';
  queue: QueueAction[] = [];
  end: () => void;
  logger: ILogger;
  lockManager: LockingContext;
  context: QueueContextImpl;

  constructor(opts: QueueOpts) {
    this.queue = opts.actions;
    this.name = opts.name;
    this.end = opts.end || (() => { });
    this.logger = opts.logger || logger;
    this.lockManager = opts.lockingContext;
    this.context = new QueueContextImpl({
      push: (actions: QueueAction[]) => this.push(actions),
      name: () => this.name,
      abort: () => {
        while (this.queue.length > 0) {
          this.queue.pop();
        }
      },
    });
  }

  async delay(timeout: number) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  async run(context: object): Promise<void> {
    const executor = new QueueExecutor({
      name: this.name,
      queue: this.queue,
      logger: this.logger,
      lockManager: this.lockManager,
      context: this.context,
      end: this.end,
      processQueueItem: (item) => this.processQueueItem(item),
      iterate: (action) => this.iterate(action),
      handleActionError: (action, error) => this.handleActionError(action, error),
    });

    await executor.run(context);
  }

  async iterate(action: IAction) {
    await action.execute(this.context);

    await this.delay(action.delay);
  }

  async handleActionError(action: IAction, error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));

    try {
      await action.onError(err, this.context);
    } catch (handlerError) {
      this.logger.info(`Queue(${this.name}) onError failed`);
      this.logger.error(handlerError as Error);
      this.context.abort();
    }
  }

  push(actions: QueueAction[]) {
    this.queue.unshift(...actions);
  }

  processQueueItem(item: QueueAction): IAction {
    if (item instanceof Action) {
      return item
    } else return new (item as new (...args: any[]) => IAction);
  }
}
