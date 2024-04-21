import { describe, test, expect } from '@jest/globals'

import { Action } from './action.js';

describe('Action', () => {
  type Context = { some: string }
  class A<C> extends Action<C> {
    delay: number = 0

    async execute(context: C): Promise<void> {
      console.log(context);
      return new Promise(res => setTimeout(res, this.delay))
    };
  }
  test('some', async () => {
    const a = new A<Context>();

    await a.execute({ some: 'hello' })

    expect(true).toBe(true);
  })
});
