import { describe, expect, it } from 'vitest';

/**
 * Smoke test for the vitest toolchain. If this fails the stack is broken;
 * if it passes, richer unit tests in `engine/` and `lib/` will work too.
 */
describe('vitest toolchain', () => {
  it('runs arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('supports async', async () => {
    const value = await Promise.resolve('ok');
    expect(value).toBe('ok');
  });
});
