import { IAction } from "./types.js";

type Options = {
  delay?: number,
};

export abstract class Action<C> implements IAction<C> {
  delay: number = 0

  constructor(opts: Options = {}) {
    if (opts.delay) this.delay = opts.delay;
  }

  abstract execute(context: C): Promise<void>
}
