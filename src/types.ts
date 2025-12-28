import { LockingAction } from "./action";

export interface IAction {
  delay: number
  execute: (context: any) => Promise<void>
}

export interface ILockingAction {
  locking: boolean
  scope: string | null
}

export type ActionClass = new (...args: any[]) => IAction;

export type QueueAction = IAction | ActionClass | Partial<ILockingAction>;

export type Branches = {
  then: QueueAction[]
  else?: QueueAction[]
};

export type QueueContext = {
  push: (actions: QueueAction[]) => void
  extend: (obj: Partial<object>) => void
  name: () => string
  abort: () => void
};
