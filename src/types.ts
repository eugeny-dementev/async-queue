export type QueueContext<C> = {
  push: (actions: IAction<any>[]) => void
  extend: (obj: Partial<C>) => void
};

export type NextFunction<C> = (contextExtention?: C) => Promise<void>

export interface IAction<C> {
  delay: number
  execute: (context: C) => Promise<void>
}
