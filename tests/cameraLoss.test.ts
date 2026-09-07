/**
 * WP2B.4 / DIA-022: camera loss state machine.
 * Pure logic: events in, state + effects out.
 */
import { describe, it, expect } from 'vitest';
import {
    INITIAL_CAMERA_LOSS_STATE,
    reduceCameraLoss,
    pickDeviceId,
    isCameraLostVisible,
    type CameraLossState,
    type CameraLossEvent,
} from '../src/camera/cameraLoss';

function run(events: CameraLossEvent[], from: CameraLossState = INITIAL_CAMERA_LOSS_STATE) {
    let state = from;
    const effects = [];
    for (const e of events) {
        const t = reduceCameraLoss(state, e);
        state = t.state;
        effects.push(...t.effects);
    }
    return { state, effects };
}

const started = (deviceId: string | null = 'cam-a', devices?: string[]): CameraLossEvent =>
    ({ type: 'stream-started', deviceId, devices });

describe('pickDeviceId', () => {
    it('prefers the previously used device when it is available', () => {
        expect(pickDeviceId('cam-a', ['cam-b', 'cam-a'])).toBe('cam-a');
    });
    it('falls back to a newly appeared device, then the first available', () => {
        expect(pickDeviceId('cam-a', ['cam-b', 'cam-c'], ['cam-b'])).toBe('cam-c');
        expect(pickDeviceId('cam-a', ['cam-b', 'cam-c'], ['cam-b', 'cam-c'])).toBe('cam-b');
        expect(pickDeviceId(null, ['cam-b'])).toBe('cam-b');
    });
    it('ignores empty deviceIds and returns null when nothing usable is listed', () => {
        expect(pickDeviceId('cam-a', ['', ''])).toBeNull();
        expect(pickDeviceId(null, [])).toBeNull();
    });
});

describe('reduceCameraLoss: happy path', () => {
    it('starts inactive and becomes active with the stream device recorded', () => {
        const { state, effects } = run([started('cam-a', ['cam-a', 'cam-b'])]);
        expect(state.status).toBe('active');
        expect(state.activeDeviceId).toBe('cam-a');
        expect(state.lastDeviceId).toBe('cam-a');
        expect(state.knownDevices).toEqual(['cam-a', 'cam-b']);
        expect(effects).toEqual([]);
        expect(isCameraLostVisible(state)).toBe(false);
    });

    it('a deliberate stop returns to inactive and keeps lastDeviceId for a later restart', () => {
        const { state } = run([started('cam-a'), { type: 'stream-stopped' }]);
        expect(state.status).toBe('inactive');
        expect(state.activeDeviceId).toBeNull();
        expect(state.lastDeviceId).toBe('cam-a');
        expect(isCameraLostVisible(state)).toBe(false);
    });

    it('devicechange while active with our device still present only updates the list', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a']),
            { type: 'devices-changed', devices: ['cam-a', 'cam-b'] },
        ]);
        expect(state.status).toBe('active');
        expect(state.knownDevices).toEqual(['cam-a', 'cam-b']);
        expect(effects).toEqual([]);
    });
});

describe('reduceCameraLoss: unplug mid-game', () => {
    it('track ended on a live stream moves to lost and shows the panel', () => {
        const { state, effects } = run([started('cam-a'), { type: 'track-ended' }]);
        expect(state.status).toBe('lost');
        expect(state.cause).toBe('track-ended');
        expect(state.activeDeviceId).toBeNull();
        expect(state.lastDeviceId).toBe('cam-a');
        expect(effects).toEqual([]);
        expect(isCameraLostVisible(state)).toBe(true);
    });

    it('devicechange that drops our device moves to lost even without a track ended event', () => {
        const { state } = run([
            started('cam-a', ['cam-a', 'cam-b']),
            { type: 'devices-changed', devices: ['cam-b'] },
        ]);
        expect(state.status).toBe('lost');
        expect(state.cause).toBe('device-removed');
        expect(state.knownDevices).toEqual(['cam-b']);
    });

    it('track ended after we already stopped or replaced the stream is ignored', () => {
        expect(run([{ type: 'track-ended' }]).state.status).toBe('inactive');
        const { state } = run([started('cam-a'), { type: 'stream-stopped' }, { type: 'track-ended' }]);
        expect(state.status).toBe('inactive');
    });

    it('a second track ended while already lost changes nothing', () => {
        const { state, effects } = run([started('cam-a'), { type: 'track-ended' }, { type: 'track-ended' }]);
        expect(state.status).toBe('lost');
        expect(effects).toEqual([]);
    });
});

describe('reduceCameraLoss: retry path', () => {
    it('tapping retry while lost requests a reacquire preferring the old device', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a', 'cam-b']),
            { type: 'track-ended' },
            { type: 'retry' },
        ]);
        expect(state.status).toBe('reacquiring');
        expect(state.autoRetry).toBe(false);
        expect(effects).toEqual([{ type: 'reacquire', preferredDeviceId: 'cam-a', auto: false }]);
        expect(isCameraLostVisible(state)).toBe(true);
    });

    it('retry falls back to the first remaining device when ours is gone from the list', () => {
        const { effects } = run([
            started('cam-a', ['cam-a', 'cam-b']),
            { type: 'devices-changed', devices: ['cam-b'] },
            { type: 'retry' },
        ]);
        expect(effects.at(-1)).toEqual({ type: 'reacquire', preferredDeviceId: 'cam-b', auto: false });
    });

    it('retry with no known devices passes null so getUserMedia may choose', () => {
        const { effects } = run([started(null), { type: 'track-ended' }, { type: 'retry' }]);
        expect(effects).toEqual([{ type: 'reacquire', preferredDeviceId: null, auto: false }]);
    });

    it('retry is ignored unless we are lost', () => {
        expect(run([{ type: 'retry' }]).effects).toEqual([]);
        expect(run([started('cam-a'), { type: 'retry' }]).effects).toEqual([]);
        const { effects } = run([started('cam-a'), { type: 'track-ended' }, { type: 'retry' }, { type: 'retry' }]);
        expect(effects).toHaveLength(1);
    });

    it('a successful reacquire returns to active on the new device', () => {
        const { state } = run([
            started('cam-a'),
            { type: 'track-ended' },
            { type: 'retry' },
            started('cam-b'),
        ]);
        expect(state.status).toBe('active');
        expect(state.activeDeviceId).toBe('cam-b');
        expect(state.lastDeviceId).toBe('cam-b');
        expect(state.cause).toBeNull();
        expect(isCameraLostVisible(state)).toBe(false);
    });

    it('a failed reacquire (no device yet) goes back to lost so the panel stays up', () => {
        const { state } = run([
            started('cam-a'),
            { type: 'track-ended' },
            { type: 'retry' },
            { type: 'acquire-failed', code: 'NO_DEVICE' },
        ]);
        expect(state.status).toBe('lost');
        expect(state.cause).toBe('track-ended');
        expect(isCameraLostVisible(state)).toBe(true);
    });

    it('a hard failure during reacquire (permission, unsupported) hands over to the standard recovery screen', () => {
        for (const code of ['PERMISSION_DENIED', 'NOT_SUPPORTED']) {
            const { state } = run([
                started('cam-a'),
                { type: 'track-ended' },
                { type: 'retry' },
                { type: 'acquire-failed', code },
            ]);
            expect(state.status).toBe('inactive');
            expect(isCameraLostVisible(state)).toBe(false);
        }
    });
});

describe('reduceCameraLoss: a camera appears while none is active', () => {
    it('the same camera plugged back in while lost auto-reacquires it', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a']),
            { type: 'track-ended' },
            { type: 'devices-changed', devices: [] },
            { type: 'devices-changed', devices: ['cam-a'] },
        ]);
        expect(state.status).toBe('reacquiring');
        expect(state.autoRetry).toBe(true);
        expect(effects).toEqual([{ type: 'reacquire', preferredDeviceId: 'cam-a', auto: true }]);
    });

    it('a different camera plugged in while lost auto-reacquires that one', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a']),
            { type: 'track-ended' },
            { type: 'devices-changed', devices: [] },
            { type: 'devices-changed', devices: ['cam-z'] },
        ]);
        expect(state.status).toBe('reacquiring');
        expect(effects).toEqual([{ type: 'reacquire', preferredDeviceId: 'cam-z', auto: true }]);
    });

    it('a devicechange while lost that adds nothing new does not retry', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a', 'cam-b']),
            { type: 'track-ended' },
            { type: 'devices-changed', devices: ['cam-b'] },
        ]);
        expect(state.status).toBe('lost');
        expect(effects).toEqual([]);
    });

    it('does not double-fire when devicechange arrives during an in-flight reacquire', () => {
        const { state, effects } = run([
            started('cam-a', ['cam-a']),
            { type: 'track-ended' },
            { type: 'retry' },
            { type: 'devices-changed', devices: ['cam-a'] },
        ]);
        expect(state.status).toBe('reacquiring');
        expect(effects).toHaveLength(1);
    });

    it('no camera at start (NO_DEVICE) waits, then picks up the first camera that appears', () => {
        const { state, effects } = run([
            { type: 'acquire-failed', code: 'NO_DEVICE' },
            { type: 'devices-changed', devices: ['cam-a'] },
        ]);
        expect(state.status).toBe('reacquiring');
        expect(effects).toEqual([{ type: 'reacquire', preferredDeviceId: 'cam-a', auto: true }]);
        // The waiting state is not the child-facing lost panel.
        expect(isCameraLostVisible(run([{ type: 'acquire-failed', code: 'NO_DEVICE' }]).state)).toBe(false);
    });

    it('other start-up failures do not wait for a device', () => {
        const { state } = run([{ type: 'acquire-failed', code: 'PERMISSION_DENIED' }]);
        expect(state.status).toBe('inactive');
    });

    it('a devicechange listing only empty ids does not wake a waiting state', () => {
        const { state, effects } = run([
            { type: 'acquire-failed', code: 'NO_DEVICE' },
            { type: 'devices-changed', devices: [''] },
        ]);
        expect(state.status).toBe('waiting');
        expect(effects).toEqual([]);
    });
});

describe('reduceCameraLoss: determinism', () => {
    it('never mutates the input state', () => {
        const before = run([started('cam-a', ['cam-a'])]).state;
        const snapshot = JSON.stringify(before);
        reduceCameraLoss(before, { type: 'track-ended' });
        reduceCameraLoss(before, { type: 'devices-changed', devices: ['cam-b'] });
        expect(JSON.stringify(before)).toBe(snapshot);
    });

    it('dedupes device lists', () => {
        const { state } = run([started('cam-a', ['cam-a', 'cam-a', 'cam-b'])]);
        expect(state.knownDevices).toEqual(['cam-a', 'cam-b']);
    });
});
