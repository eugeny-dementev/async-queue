import { QueueAction, QueueContext } from './types.js';

type QueueContextOptions = {
  push: (actions: QueueAction[]) => void
  name: () => string
  abort: () => void
};

export class QueueContextImpl implements QueueContext {
  private readonly pushFn: (actions: QueueAction[]) => void;
  private readonly nameFn: () => string;
  private readonly abortFn: () => void;

  constructor(opts: QueueContextOptions) {
    this.pushFn = opts.push;
    this.nameFn = opts.name;
    this.abortFn = opts.abort;
  }

  push = (actions: QueueAction[]) => {
    this.pushFn(actions);
  };

  extend = (obj: Partial<object>) => {
    Object.assign(this, obj);
  };

  name = () => {
    return this.nameFn();
  };

  abort = () => {
    this.abortFn();
  };

  initialize = (context: object) => {
    Object.assign(this, context);
  };
}
