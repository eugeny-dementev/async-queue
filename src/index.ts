import { Action } from './action.js';
import { IAction, NextFunction, QueueContext } from './types.js';

export class AsyncQueue<C extends QueueContext> {
  queue: IAction<C>[] = [];
  loopAction = false;

  constructor(actions: IAction<C>[]) {
    this.queue = actions;
    this.push = this.push.bind(this);
  }

  async delay(timeout: number) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  async run() {
    console.log('starting loop');
    const context: QueueContext = { push: this.push };

    while (this.loopAction) {
      if (this.queue.length === 0) {
        this.loopAction = false;
        return;
      }

      await this.iterate(context as C);
    }
  }

  async iterate(context: C) {
    const action = this.queue.shift();

    console.log(`running ${action.constructor.name || 'some undefined'} action`)
    const next: NextFunction<C> = (contextExtension: C) => {

      if (contextExtension) {
        if (!isObject(contextExtension)) throw new Error('contextExtension is not an object');

        Object.assign(context, contextExtension);
      }
    }

    await action.execute(context, next);

    await this.delay(action.delay);
  }

  push(actions: IAction<C>[]) {
    this.queue.unshift(...actions);
  }
}

function isObject(obj: object) {
  return typeof obj === 'object' && obj !== null;
}
