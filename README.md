# async-queue-runner

Library to run extendable async queues with branching, context mutation, and optional locking scopes.

## Install

```sh
npm install async-queue-runner
```

```sh
yarn add async-queue-runner
```

## Quick start

```ts
import { Action, QueueRunner, QueueContext } from 'async-queue-runner';

type Ctx = { value: number };

class Increment extends Action<Ctx> {
  async execute({ value, extend }: Ctx & QueueContext): Promise<void> {
    extend({ value: value + 1 });
  }
}

class StopIfTooHigh extends Action<Ctx> {
  async execute({ value, abort }: Ctx & QueueContext): Promise<void> {
    if (value >= 3) abort();
  }
}

const runner = new QueueRunner();
runner.add([Increment, Increment, StopIfTooHigh, Increment], { value: 0 });
```

## Core concepts

### QueueAction

Queue items can be either:
- `IAction` instances (created actions), or
- `Action` classes (constructors).

```ts
runner.add([
  new Increment(),
  Increment,
]);
```

Action classes are instantiated with no arguments. If you need constructor
options, pass an instance instead of a class.

### QueueContext

Each action receives a context that can be extended at runtime.

```ts
type QueueContext = {
  push(actions: QueueAction[]): void
  extend(obj: object): void
  name(): string
  abort(): void
}
```

- `push` inserts new actions at the front of the remaining queue.
- `extend` merges new fields into the context.
- `name` returns the queue name.
- `abort` clears the remaining queue (preventive stop).

### Error handling per action

Every action has `onError(error, context)`. The default implementation:
- logs to `context.logger.error(error)` when present, and
- calls `context.abort()` to stop the queue.

Override it to implement recovery:

```ts
class Recoverable extends Action<{ recovered?: boolean }> {
  async execute(): Promise<void> {
    throw new Error('boom');
  }

  async onError(_error: Error, context: QueueContext): Promise<void> {
    context.extend({ recovered: true });
  }
}
```

## Locking

Locking ensures that actions with the same scope do not run at the same time across queues.

### Define a locking action

```ts
import { lockingClassFactory } from 'async-queue-runner';

class WithBrowserLock extends lockingClassFactory<{ url: string }>('browser') {
  async execute({ url }: { url: string } & QueueContext): Promise<void> {
    // protected by lock scope "browser"
  }
}
```

### Provide a lock manager

`QueueRunner` provides a shared lock manager automatically.
For direct `AsyncQueue` use, pass a `LockManager` instance.

```ts
import { AsyncQueue, LockManager } from 'async-queue-runner';

const queue = new AsyncQueue({
  name: 'q1',
  actions: [WithBrowserLock],
  lockingContext: new LockManager(),
});
```

Lock scopes must be non-empty strings. Invalid scopes throw early.

## Utilities

```ts
import { util } from 'async-queue-runner';

// fixed delay
util.delay(500);

// branching
util.if<{ flag: boolean }>(
  ({ flag }) => flag,
  { then: [SomeAction], else: [OtherAction] }
);

// conditional actions
util.valid<{ count: number }>(
  ({ count }) => count > 0,
  [SomeAction]
);

// immediate abort action
util.abort;
```

## QueueRunner vs AsyncQueue

- `QueueRunner` manages multiple queues and shared locking.
- `AsyncQueue` runs a single queue directly.

```ts
import { QueueRunner } from 'async-queue-runner';

const runner = new QueueRunner();
runner.add([SomeAction], { initial: true }, 'my-queue');
```

## Logging

`AsyncQueue` accepts a logger for queue-level logs.  
Default `onError` uses `context.logger.error` if available in context.

```ts
const runner = new QueueRunner({ logger: myQueueLogger });
runner.add([SomeAction], { logger: myActionLogger });
```
