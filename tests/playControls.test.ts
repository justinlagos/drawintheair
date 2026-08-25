import { describe, it, expect } from 'vitest';
import { evaluatePlayControls } from '../src/features/parent/playControlsGate';
import { localDateKey } from '../src/features/parent/dailyPlayTime';
import type { ParentControls } from '../src/lib/parentApi';

function controls(overrides: Partial<ParentControls> = {}): ParentControls {
  return {
    child_profile_id: 'c1',
    parent_id: 'p1',
    daily_play_limit_minutes: null,
    allowed_categories: null,
    paused: false,
    sound_enabled: true,
    camera_reassurance: 'standard',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('evaluatePlayControls', () => {
  it('is unrestricted for anonymous play (no controls)', () => {
    const r = evaluatePlayControls({ controls: null, todaySeconds: 99999 });
    expect(r).toEqual({
      blocked: false,
      reason: null,
      soundEnabled: true,
      cameraReassurance: 'standard',
      remainingSeconds: null,
    });
  });

  it('blocks entry when paused, regardless of time used', () => {
    const r = evaluatePlayControls({ controls: controls({ paused: true }), todaySeconds: 0 });
    expect(r.blocked).toBe(true);
    expect(r.reason).toBe('paused');
  });

  it('pause takes precedence over the daily limit', () => {
    const r = evaluatePlayControls({
      controls: controls({ paused: true, daily_play_limit_minutes: 10 }),
      todaySeconds: 6000,
    });
    expect(r.reason).toBe('paused');
  });

  it('allows play below the daily limit and reports remaining seconds', () => {
    const r = evaluatePlayControls({
      controls: controls({ daily_play_limit_minutes: 20 }),
      todaySeconds: 300, // 5 min used
    });
    expect(r.blocked).toBe(false);
    expect(r.remainingSeconds).toBe(20 * 60 - 300);
  });

  it('blocks when the daily limit is reached', () => {
    const r = evaluatePlayControls({
      controls: controls({ daily_play_limit_minutes: 10 }),
      todaySeconds: 600,
    });
    expect(r.blocked).toBe(true);
    expect(r.reason).toBe('daily-limit');
    expect(r.remainingSeconds).toBe(0);
  });

  it('treats a zero/absent limit as no limit', () => {
    expect(evaluatePlayControls({ controls: controls({ daily_play_limit_minutes: 0 }), todaySeconds: 99999 }).blocked).toBe(false);
    expect(evaluatePlayControls({ controls: controls({ daily_play_limit_minutes: null }), todaySeconds: 99999 }).blocked).toBe(false);
  });

  it('passes through sound and camera settings', () => {
    const r = evaluatePlayControls({
      controls: controls({ sound_enabled: false, camera_reassurance: 'gentle' }),
      todaySeconds: 0,
    });
    expect(r.soundEnabled).toBe(false);
    expect(r.cameraReassurance).toBe('gentle');
  });
});

describe('localDateKey', () => {
  it('formats a local calendar day as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('changes across a day boundary', () => {
    const a = localDateKey(new Date(2026, 5, 30, 23, 59));
    const b = localDateKey(new Date(2026, 6, 1, 0, 1));
    expect(a).not.toBe(b);
  });
});
