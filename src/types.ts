export type QueueContext = {
  push: (actions: IAction<QueueContext>[]) => void
};

export type NextFunction<C extends QueueContext> = (contextExtention?: C) => void

export interface IAction<C extends QueueContext> {
  delay: number
  execute: (context: C, next: NextFunction<C>) => Promise<void>
}
