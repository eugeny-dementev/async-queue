import { AsyncQueue } from "./queue.js";
import { IAction } from "./types.js";

export class QueueRunner {
  queues = new Map();

  add(actions: IAction[], context: object, name: string = this.getName()) {
    const queue = new AsyncQueue({ name, actions, end: () => { this.queues.delete(name) } });

    this.queues.set(name, queue);

    queue.run(context);
  }


  getName() {
    return Math.random().toString(36).substring(2, 10);
  }
}
