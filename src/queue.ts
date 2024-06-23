import { Action } from './action.js';
import { LockingContext } from './runner.js';
import { IAction, ILockingAction, QueueAction, QueueContext } from './types.js';

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
  locker: LockingContext;

  loopAction = false;

  context: QueueContext = {
    push: (actions: QueueAction[]) => this.push(actions),
    stop: () => { this.loopAction = false; },
    extend: (obj: object) => Object.assign(this.context, obj),
    name: () => this.name,
    abort: () => {
      while (this.queue.length > 0) {
        this.queue.pop();
      }
    },
  };

  constructor(opts: QueueOpts) {
    this.queue = opts.actions;
    this.name = opts.name;
    this.end = opts.end || (() => { });
    this.logger = opts.logger || logger;
    this.locker = opts.lockingContext;
  }

  async delay(timeout: number) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  async run(context: object): Promise<void> {
    this.loopAction = true;
    Object.assign(this.context, context);

    try {
      while (this.loopAction) {
        if (this.queue.length === 0) {
          this.loopAction = false;
          this.logger.info(`Queue(${this.name}): stopped`);

          break;
        }

        const item = this.queue.shift();

        const action = this.processQueueItem(item!);

        const isLocking = (action as unknown as ILockingAction).locking;
        const scope = (action as unknown as ILockingAction).scope as string;

        if (isLocking) {
          if (this.locker.isLocked(scope)) {
            await this.locker.wait(scope);
          }

          this.locker.lock(scope)
        }

        await this.iterate(action!);

        if (isLocking) {
          this.locker.unlock(scope);
        }
      }

      this.end();
    } catch (e) {
      this.logger.info(`Queue(${this.name}) failed`);
      this.logger.error(e as Error);
    }
  }

  async iterate(action: IAction) {
    const actionName = action.constructor.name || 'some undefined';
    this.logger.setContext(actionName);
    this.logger.info(`Queue(${this.name}): running action`);

    await action.execute(this.context);

    await this.delay(action.delay);
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
