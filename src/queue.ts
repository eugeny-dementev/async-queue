import { Action } from './action.js';
import { IAction, QueueAction, QueueContext } from './types.js';

export type QueueOpts = {
  actions: QueueAction[],
  name: string
  end: () => void,
}

export class AsyncQueue {
  name: string = 'default queue name';
  queue: QueueAction[] = [];
  end: () => void;

  loopAction = false;

  context: QueueContext = {
    push: this.push,
    stop: () => { this.loopAction = false; },
    extend: (obj: object) => Object.assign(this.context, obj),
  };

  constructor(opts: QueueOpts) {
    this.queue = opts.actions;
    this.name = opts.name;
    this.end = opts.end;

    this.push = this.push.bind(this);
  }

  async delay(timeout: number) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  async run(context: object) {
    this.loopAction = true;
    Object.assign(this.context, context);

    try {
      while (this.loopAction) {
        if (this.queue.length === 0) {
          this.loopAction = false;
          console.log('Queue stopped');

          break;
        }

        const item = this.queue.shift();

        const action =  this.processQueueItem(item!);

        await this.iterate(action!);
      }

      this.end();
    } catch (e) {
      console.log(`Queue(${this.name} failed`);
      console.error(e);
    }
  }

  async iterate(action: IAction) {
    console.log(`running ${action.constructor.name || 'some undefined'} action`)

    await action.execute(this.context);

    await this.delay(action.delay);
  }

  push(actions: QueueAction[]) {
    this.queue.unshift(...actions);
  }

  processQueueItem(item: QueueAction) {
    if (item instanceof Action) {
      return item
    } else return new (item as new (...args: any[]) => IAction);
  }
}
