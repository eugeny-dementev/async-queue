import { Action } from "./action.js";
import { Branches, IAction, QueueContext } from "./types.js";

export function ifTask<C>(condition: (context: C) => Promise<boolean>, branches: Branches) {
  class IfAction extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      const result = await condition(context);

      if (result) {
        context.push(branches.then);
      } else if (branches.else) {
        context.push(branches.else);
      }
    }
  }

  return new IfAction();
}

export function validate<C>(validator: (context: C) => Promise<boolean>, actions: IAction[]) {
  class Validator extends Action<C> {
    async execute(context: C & QueueContext): Promise<void> {
      const valid = await validator(context);

      if (valid) {
        context.push(actions);
      }
    }
  }

  return new Validator();
}
