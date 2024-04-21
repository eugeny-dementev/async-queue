import { IAction, QueueContext } from './types.js';

export type QueueOpts = {
  actions: IAction[],
  name: string
  end: () => void,
}

export class AsyncQueue {
  name: string = 'default queue name';
  queue: IAction[] = [];
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

        const action = this.queue.shift();

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

  push(actions: IAction[]) {
    this.queue.unshift(...actions);
  }
}
