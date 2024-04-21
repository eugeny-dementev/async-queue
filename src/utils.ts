import { Action } from "./action.js";
import { Branches, QueueContext, IAction } from "./types.js";

export class Delay extends Action<null> {
  async execute(): Promise<void> {
    return new Promise(res => {
      setTimeout(res, this.delay);
    })
  }
}

export const util = {
  delay(timeout: number) {
    return new Delay({ delay: timeout });
  },
  if<C>(condition: (context: C) => Promise<boolean>, branches: Branches) {
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
  },
  valid<C>(validator: (context: C) => Promise<boolean>, actions: IAction[]) {
    class Validator extends Action<C> {
      async execute(context: C & QueueContext): Promise<void> {
        const valid = await validator(context);

        if (valid) {
          context.push(actions);
        }
      }
    }

    return new Validator();
  },
}
