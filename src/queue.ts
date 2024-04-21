import { IAction, QueueContext } from './types.js';

export type QueueOpts<T> = {
  actions: T[],
  name: string
  end: () => void,
}

export class AsyncQueue<C> {
  name: string = 'default queue name';
  queue: IAction<C | QueueContext<C>>[] = [];
  end: () => void;
  loopAction = false;
  context: QueueContext<C> = { push: this.push, extend: (obj: Partial<C>) => {
    Object.assign(this.context, obj);
  } }

  constructor(opts: QueueOpts<IAction<Partial<C> | QueueContext<C>>>) {
    this.queue = opts.actions;
    this.name = opts.name;
    this.end = opts.end;

    this.push = this.push.bind(this);
  }

  async delay(timeout: number) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  async run(context: Partial<C>) {
    console.log('Queue started');

    while (this.loopAction) {
      if (this.queue.length === 0) {
        this.loopAction = false;
        console.log('Queue stopped');

        this.end();

        return;
      }

      await this.iterate(context);
    }
  }

  async iterate(context: Partial<C>) {
    const action = this.queue.shift();

    if (action === undefined) {
      console.log('No action found');
      return;
    }

    console.log(`running ${action.constructor.name || 'some undefined'} action`)

    action

    await action.execute(Object.assign({}, context, this.context));

    await this.delay(action.delay);
  }

  push(actions: IAction<C | QueueContext<C>>[]) {
    this.queue.unshift(...actions);
  }
}

function isObject(obj: object) {
  return typeof obj === 'object' && obj !== null;
}
