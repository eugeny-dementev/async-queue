import { assertValidScope, isLockingAction, LockingContext } from './locking.js';
import { IAction, QueueAction, QueueContext } from './types.js';

type QueueContextRuntime = QueueContext & {
  initialize: (context: object) => void
};

type QueueExecutorOptions = {
  name: string
  queue: QueueAction[]
  logger: {
    info: (message: string) => void
    setContext: (context: string) => void
    error: (e: Error) => void
  }
  lockManager: LockingContext
  context: QueueContextRuntime
  end: () => void
  processQueueItem: (item: QueueAction) => IAction
  iterate: (action: IAction) => Promise<void>
  handleActionError: (action: IAction, error: unknown) => Promise<void>
};

export class QueueExecutor {
  private readonly opts: QueueExecutorOptions;

  constructor(opts: QueueExecutorOptions) {
    this.opts = opts;
  }

  async run(context: object): Promise<void> {
    this.opts.context.initialize(context);

    try {
      while (true) {
        if (this.opts.queue.length === 0) {
          this.opts.logger.info(`Queue(${this.opts.name}): stopped`);
          break;
        }

        const item = this.opts.queue.shift();

        const action = this.opts.processQueueItem(item!);
        const actionName = action.constructor.name || 'some undefined';
        this.opts.logger.setContext(actionName);

        this.opts.logger.info(`Queue(${this.opts.name}): running action`);

        const runAction = async () => {
          try {
            await this.opts.iterate(action);
          } catch (e) {
            await this.opts.handleActionError(action, e);
          }
        };

        if (isLockingAction(action)) {
          const scope = assertValidScope(action.scope);

          if (this.opts.lockManager.isLocked(scope)) {
            this.opts.logger.info(`Queue(${this.opts.name}): waiting for scope to unlock`);
          }

          await this.opts.lockManager.runWithLock(scope, runAction);
        } else {
          await runAction();
        }
      }

      this.opts.end();
    } catch (e) {
      this.opts.logger.info(`Queue(${this.opts.name}) failed`);
      this.opts.logger.error(e as Error);
    }
  }
}
