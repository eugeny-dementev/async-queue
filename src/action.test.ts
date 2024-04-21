import { describe, test, expect } from '@jest/globals';
import { Delay } from './utils.js';

describe('Action', () => {
  test('some', async () => {
    const a = new Delay({ delay: 10 });

    let run = false;

    await a.execute().then(() => run = true)

    expect(run).toBe(true);
  })
});
