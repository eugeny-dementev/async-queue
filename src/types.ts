export interface IAction {
  delay: number
  execute: (context: any) => Promise<void>
}

export type ActionClass = new (...args: any[]) => IAction;

export type QueueAction = IAction | ActionClass;

export type Branches = {
  then: QueueAction[]
  else?: QueueAction[]
};

export type QueueContext = {
  push: (actions: QueueAction[]) => void
  extend: (obj: Partial<object>) => void
  stop: () => void
  name: () => string
};
