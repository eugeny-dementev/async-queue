export type Branches = {
  then: IAction[]
  else?: IAction[]
  err?: IAction
};

export type QueueContext = {
  push: (actions: IAction[]) => void
  extend: (obj: Partial<object>) => void
  stop: () => void
  err?: Error | unknown
};

export interface IAction {
  delay: number
  execute: (context: any) => Promise<void>
}
