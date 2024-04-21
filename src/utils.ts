import { Action } from "./action.js";

export class Delay extends Action<null> {
  async execute(): Promise<void> {
    return new Promise(res => {
      setTimeout(res, this.delay);
    })
  }
}

export function delay(timeout: number) {
  return new Delay({ delay: timeout });
}

