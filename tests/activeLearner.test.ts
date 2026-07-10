import { describe, it, expect } from 'vitest';
import { isSelectionExpired, SELECTION_INACTIVITY_MS } from '../src/features/parent/activeLearner';

describe('isSelectionExpired', () => {
  const now = 1_000_000_000_000;

  it('never expires a selection with no timestamp (ts = 0)', () => {
    expect(isSelectionExpired(0, now)).toBe(false);
  });

  it('is valid within the inactivity window', () => {
    expect(isSelectionExpired(now - (SELECTION_INACTIVITY_MS - 1000), now)).toBe(false);
  });

  it('expires once the inactivity window is exceeded', () => {
    expect(isSelectionExpired(now - (SELECTION_INACTIVITY_MS + 1000), now)).toBe(true);
  });

  it('respects a custom window', () => {
    expect(isSelectionExpired(now - 6000, now, 5000)).toBe(true);
    expect(isSelectionExpired(now - 4000, now, 5000)).toBe(false);
  });
});
