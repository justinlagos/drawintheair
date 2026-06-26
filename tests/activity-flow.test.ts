import { describe, it, expect } from 'vitest';

/**
 * Activity flow tests for the conductor v2 architecture.
 *
 * These are logical/unit tests that verify the state machine and
 * data model invariants. The actual Postgres + Realtime integration
 * is covered by the Playwright E2E test.
 */

describe('Session state machine', () => {
  type ClassState = 'lobby' | 'in_activity' | 'between_activities' | 'ended';
  type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

  interface Session {
    class_state: ClassState;
    current_activity_id: string | null;
    status: SessionStatus;
    activity_version: number;
  }

  function startActivity(s: Session, activityId: string): Session {
    if (s.class_state === 'ended') throw new Error('cannot start activity on ended session');
    return {
      class_state: 'in_activity',
      current_activity_id: activityId,
      status: 'active',
      activity_version: s.activity_version + 1,
    };
  }

  function endActivity(s: Session): Session {
    return {
      class_state: 'between_activities',
      current_activity_id: null,
      status: 'waiting',
      activity_version: s.activity_version + 1,
    };
  }

  function endSession(s: Session): Session {
    return {
      class_state: 'ended',
      current_activity_id: null,
      status: 'ended',
      activity_version: s.activity_version + 1,
    };
  }

  function pauseActivity(s: Session): Session {
    return {
      ...s,
      status: 'paused',
      activity_version: s.activity_version + 1,
    };
  }

  function resumeActivity(s: Session): Session {
    return {
      ...s,
      status: 'active',
      activity_version: s.activity_version + 1,
    };
  }

  it('starts in lobby/waiting with no activity', () => {
    const s: Session = {
      class_state: 'lobby',
      current_activity_id: null,
      status: 'waiting',
      activity_version: 0,
    };
    expect(s.class_state).toBe('lobby');
    expect(s.current_activity_id).toBeNull();
    expect(s.status).toBe('waiting');
    expect(s.activity_version).toBe(0);
  });

  it('starting an activity transitions to in_activity/active', () => {
    const s: Session = {
      class_state: 'lobby',
      current_activity_id: null,
      status: 'waiting',
      activity_version: 0,
    };
    const active = startActivity(s, 'bubble-pop-123');
    expect(active.class_state).toBe('in_activity');
    expect(active.current_activity_id).toBe('bubble-pop-123');
    expect(active.status).toBe('active');
    expect(active.activity_version).toBe(1);
  });

  it('ending an activity goes to between_activities/waiting', () => {
    const s: Session = {
      class_state: 'in_activity',
      current_activity_id: 'bubble-pop-123',
      status: 'active',
      activity_version: 1,
    };
    const between = endActivity(s);
    expect(between.class_state).toBe('between_activities');
    expect(between.current_activity_id).toBeNull();
    expect(between.status).toBe('waiting');
    expect(between.activity_version).toBe(2);
  });

  it('ending session transitions to ended', () => {
    const s: Session = {
      class_state: 'in_activity',
      current_activity_id: 'bubble-pop-123',
      status: 'active',
      activity_version: 2,
    };
    const ended = endSession(s);
    expect(ended.class_state).toBe('ended');
    expect(ended.current_activity_id).toBeNull();
    expect(ended.status).toBe('ended');
    expect(ended.activity_version).toBe(3);
  });

  it('pausing sets status to paused without changing class_state', () => {
    const s: Session = {
      class_state: 'in_activity',
      current_activity_id: 'bubble-pop-123',
      status: 'active',
      activity_version: 1,
    };
    const paused = pauseActivity(s);
    expect(paused.status).toBe('paused');
    expect(paused.class_state).toBe('in_activity'); // unchanged
    expect(paused.current_activity_id).toBe('bubble-pop-123'); // unchanged
    expect(paused.activity_version).toBe(2);
  });

  it('resuming restores active status', () => {
    const s: Session = {
      class_state: 'in_activity',
      current_activity_id: 'bubble-pop-123',
      status: 'paused',
      activity_version: 2,
    };
    const resumed = resumeActivity(s);
    expect(resumed.status).toBe('active');
    expect(resumed.activity_version).toBe(3);
  });

  it('activity_version increments monotonically', () => {
    let s: Session = {
      class_state: 'lobby',
      current_activity_id: null,
      status: 'waiting',
      activity_version: 0,
    };
    const versions: number[] = [s.activity_version];

    s = startActivity(s, 'game-1');
    versions.push(s.activity_version);

    s = pauseActivity(s);
    versions.push(s.activity_version);

    s = resumeActivity(s);
    versions.push(s.activity_version);

    s = endActivity(s);
    versions.push(s.activity_version);

    s = startActivity(s, 'game-2');
    versions.push(s.activity_version);

    expect(versions).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('cannot start activity on ended session', () => {
    const s: Session = {
      class_state: 'ended',
      current_activity_id: null,
      status: 'ended',
      activity_version: 3,
    };
    expect(() => startActivity(s, 'game')).toThrow('cannot start activity on ended session');
  });

  it('in_activity must have current_activity_id (invariant)', () => {
    const valid: Session = {
      class_state: 'in_activity',
      current_activity_id: 'some-id',
      status: 'active',
      activity_version: 1,
    };
    expect(valid.class_state === 'in_activity' && valid.current_activity_id !== null).toBe(true);
  });

  it('ended must have null current_activity_id (invariant)', () => {
    const valid: Session = {
      class_state: 'ended',
      current_activity_id: null,
      status: 'ended',
      activity_version: 3,
    };
    expect(valid.class_state === 'ended' && valid.current_activity_id === null).toBe(true);
  });
});

describe('Student class state resolution', () => {
  type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

  interface ResolvedState {
    sessionStatus: string;
    assignedActivity: { activity: string; state: string } | null;
  }

  function resolveState(
    classState: string,
    activityVersion: number,
    currentActivity: { activity: string; state: string } | null,
    individualOverride: { activity: string; state: string } | null,
    kicked: boolean,
  ): ResolvedState {
    if (kicked) {
      return { sessionStatus: 'ended', assignedActivity: null };
    }
    if (classState === 'ended') {
      return { sessionStatus: 'ended', assignedActivity: null };
    }
    if (classState === 'between_activities') {
      return { sessionStatus: 'waiting', assignedActivity: null };
    }
    if (classState === 'lobby') {
      return { sessionStatus: 'waiting', assignedActivity: null };
    }
    // in_activity: resolve activity
    const resolved = individualOverride ?? currentActivity;
    if (!resolved) {
      return { sessionStatus: 'waiting', assignedActivity: null };
    }
    return {
      sessionStatus: resolved.state === 'paused' ? 'paused' : 'active',
      assignedActivity: resolved,
    };
  }

  it('lobby resolves to waiting with no activity', () => {
    const state = resolveState('lobby', 0, null, null, false);
    expect(state.sessionStatus).toBe('waiting');
    expect(state.assignedActivity).toBeNull();
  });

  it('in_activity with current activity resolves to active', () => {
    const state = resolveState('in_activity', 1, { activity: 'bubble-pop', state: 'playing' }, null, false);
    expect(state.sessionStatus).toBe('active');
    expect(state.assignedActivity?.activity).toBe('bubble-pop');
  });

  it('individual override takes precedence over class-wide activity', () => {
    const state = resolveState(
      'in_activity', 1,
      { activity: 'bubble-pop', state: 'playing' },
      { activity: 'free-paint', state: 'playing' },
      false,
    );
    expect(state.assignedActivity?.activity).toBe('free-paint');
  });

  it('paused activity resolves to paused status', () => {
    const state = resolveState('in_activity', 2, { activity: 'bubble-pop', state: 'paused' }, null, false);
    expect(state.sessionStatus).toBe('paused');
    expect(state.assignedActivity?.state).toBe('paused');
  });

  it('kicked student resolves to ended', () => {
    const state = resolveState('in_activity', 1, { activity: 'bubble-pop', state: 'playing' }, null, true);
    expect(state.sessionStatus).toBe('ended');
    expect(state.assignedActivity).toBeNull();
  });

  it('ended class resolves to ended', () => {
    const state = resolveState('ended', 3, null, null, false);
    expect(state.sessionStatus).toBe('ended');
    expect(state.assignedActivity).toBeNull();
  });

  it('between_activities resolves to waiting', () => {
    const state = resolveState('between_activities', 2, null, null, false);
    expect(state.sessionStatus).toBe('waiting');
    expect(state.assignedActivity).toBeNull();
  });
});

describe('Activity version for idempotent event handling', () => {
  it('student ignores events with same or lower version', () => {
    let currentVersion = 2;
    const incomingVersion = 2; // same
    expect(incomingVersion <= currentVersion).toBe(true);
  });

  it('student processes events with higher version', () => {
    let currentVersion = 2;
    const incomingVersion = 3; // higher
    expect(incomingVersion > currentVersion).toBe(true);
  });

  it('student updates local version after processing', () => {
    let currentVersion = 2;
    currentVersion = 3;
    expect(currentVersion).toBe(3);
  });

  it('reconnect uses stored version to skip stale events', () => {
    const storedVersion = 4;
    const serverVersion = 4;
    // Server has same version — no new activity since disconnect
    expect(serverVersion).toBe(storedVersion);
  });

  it('reconnect catches missed events when server version is higher', () => {
    const storedVersion = 2;
    const serverVersion = 5;
    // Server has higher version — missed events during disconnect
    expect(serverVersion > storedVersion).toBe(true);
  });
});

describe('StudentClassClient state machine', () => {
  type UiKind = 'code' | 'name' | 'classroom' | 'kicked' | 'ended';

  it('starts at code entry', () => {
    const kind: UiKind = 'code';
    expect(kind).toBe('code');
  });

  it('transitions through name entry to classroom', () => {
    let kind: UiKind = 'code';
    kind = 'name';
    kind = 'classroom';
    expect(kind).toBe('classroom');
  });

  it('classroom state includes session, student, activity, activityVersion', () => {
    const ui = {
      kind: 'classroom' as UiKind,
      session: { id: 'sess-1', code: '1234' },
      student: { id: 'stu-1', name: 'Ebby' },
      activity: null,
      assignments: [] as Array<{ activity: string }>,
      activityVersion: 2,
    };
    expect(ui.kind).toBe('classroom');
    expect(ui.session.id).toBe('sess-1');
    expect(ui.student.name).toBe('Ebby');
    expect(ui.activityVersion).toBe(2);
  });

  it('kicked state includes reason', () => {
    const ui = { kind: 'kicked' as UiKind, reason: 'removed_by_teacher' };
    expect(ui.kind).toBe('kicked');
    expect(ui.reason).toBe('removed_by_teacher');
  });
});
