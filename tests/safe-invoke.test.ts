import { describe, it, expect, vi } from 'vitest';
import { safeInvoke, safeInvokeAsync } from '../src/lib/observability/safeInvoke';

// Issue 2, task 9 — instrumentation failure must never crash the app.
describe('safeInvoke', () => {
  it('returns the call result on success', () => {
    expect(safeInvoke(() => 42)).toBe(42);
  });

  it('NEVER throws when the call throws; returns fallback', () => {
    const run = () => safeInvoke(() => { throw new Error('Java object is gone'); }, { fallback: 'noop' });
    expect(run).not.toThrow();
    expect(run()).toBe('noop');
  });

  it('skips the call (and does not throw) when feature-detection says unavailable', () => {
    const fn = vi.fn(() => 'ran');
    const result = safeInvoke(fn, { available: () => false, fallback: 'skipped' });
    expect(result).toBe('skipped');
    expect(fn).not.toHaveBeenCalled();
  });

  it('treats a throwing availability probe as unavailable', () => {
    const fn = vi.fn(() => 'ran');
    const result = safeInvoke(fn, { available: () => { throw new Error('bridge gone'); }, fallback: 'skipped' });
    expect(result).toBe('skipped');
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns undefined fallback by default on failure', () => {
    expect(safeInvoke(() => { throw new Error('x'); })).toBeUndefined();
  });
});

describe('safeInvokeAsync', () => {
  it('resolves the call result on success', async () => {
    await expect(safeInvokeAsync(async () => 7)).resolves.toBe(7);
  });

  it('resolves to fallback (never rejects) when the async call rejects', async () => {
    await expect(
      safeInvokeAsync(async () => { throw new Error('boom'); }, { fallback: 'fb' }),
    ).resolves.toBe('fb');
  });

  it('resolves to fallback when the call exceeds the timeout', async () => {
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50));
    await expect(
      safeInvokeAsync(slow, { timeoutMs: 5, fallback: 'timed-out' }),
    ).resolves.toBe('timed-out');
  });

  it('skips when unavailable', async () => {
    const fn = vi.fn(async () => 'ran');
    await expect(safeInvokeAsync(fn, { available: () => false, fallback: 'skip' })).resolves.toBe('skip');
    expect(fn).not.toHaveBeenCalled();
  });
});
