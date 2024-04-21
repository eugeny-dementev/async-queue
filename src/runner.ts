import { AsyncQueue } from "./queue.js";
import { IAction } from "./types.js";

export class QueueRunner {
  queues = new Map();

  add<C>(actions: IAction<any>[], context: Partial<C>, name: string = this.getName()) {
    const queue = new AsyncQueue<C>({ name, actions, end: () => { this.queues.delete(name) } });

    this.queues.set(name, queue);

    queue.run(context);
  }


  getName() {
    return Math.random().toString(36).substring(2, 10);
  }
}
