import { AsyncQueue } from "./queue.js";
import { IAction } from "./types.js";

export type EndListener = (name: string, size: number) => void;

export class QueueRunner {
  queues = new Map();
  listeners: EndListener[] = [];

  add(actions: IAction[], context: object = {}, name: string = this.getName()) {
    const queue = new AsyncQueue({
      name, actions,
      end: () => {
        this.queues.delete(name);
        this.endEvent(name);
      }
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
