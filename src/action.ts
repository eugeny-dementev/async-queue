import { IAction, NextFunction, QueueContext } from "./types";

type Options = {
  delay?: number,
};

export abstract class Action<C extends QueueContext> implements IAction<C> {
  delay: number = 0
  next: IAction<C>[]

  constructor(opts: Options) {
    if (opts.delay) this.delay = opts.delay;
  }

  abstract execute(context: C, next: NextFunction<C>): Promise<void>
}
