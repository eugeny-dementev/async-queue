import { ILogger } from "./queue";

export const logger: ILogger = {
  info: function (message: string): void {},
  setContext: function (context: string): void {},
  error: function (e: Error): void {}
}

