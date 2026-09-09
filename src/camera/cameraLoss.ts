/**
 * Camera loss state machine (DIA-022).
 *
 * Pure logic: events in, state + effects out. No DOM, no React, so it can
 * be unit tested on its own. useCameraController feeds it browser events
 * (track 'ended', mediaDevices 'devicechange', retry taps, acquire
 * outcomes) and runs the effects it returns.
 *
 * Statuses
 *   inactive     no stream and nobody is waiting for one
 *   waiting      we tried to start and found no camera; a camera that
 *                appears later is picked up automatically
 *   active       a stream is live on activeDeviceId
 *   lost         the live stream disappeared mid-session (unplugged)
 *   reacquiring  a retry is in flight after a loss
 */

export type CameraLossStatus = 'inactive' | 'waiting' | 'active' | 'lost' | 'reacquiring';

export type CameraLossCause = 'track-ended' | 'device-removed' | null;

export interface CameraLossState {
    status: CameraLossStatus;
    /** deviceId of the stream that is (or was last) live. */
    activeDeviceId: string | null;
    /** Last known good deviceId, preferred when re-acquiring. */
    lastDeviceId: string | null;
    /** Video input deviceIds from the most recent enumeration. */
    knownDevices: string[];
    cause: CameraLossCause;
    /** True when the current reacquire was started by a device appearing
     *  rather than a tap on Try again. */
    autoRetry: boolean;
}

export type CameraLossEvent =
    | { type: 'stream-started'; deviceId: string | null; devices?: string[] }
    | { type: 'stream-stopped' }
    | { type: 'track-ended' }
    | { type: 'devices-changed'; devices: string[] }
    | { type: 'retry' }
    | { type: 'acquire-failed'; code: string | null };

export type CameraLossEffect =
    | { type: 'reacquire'; preferredDeviceId: string | null; auto: boolean };

export interface CameraLossTransition {
    state: CameraLossState;
    effects: CameraLossEffect[];
}

export const INITIAL_CAMERA_LOSS_STATE: CameraLossState = {
    status: 'inactive',
    activeDeviceId: null,
    lastDeviceId: null,
    knownDevices: [],
    cause: null,
    autoRetry: false,
};

/** Error codes where a retry on another device cannot help; the ordinary
 *  cause-specific recovery screen must take over. */
const HARD_FAILURE_CODES = new Set(['PERMISSION_DENIED', 'NOT_SUPPORTED']);

function dedupe(ids: string[]): string[] {
    const out: string[] = [];
    for (const id of ids) {
        if (typeof id === 'string' && !out.includes(id)) out.push(id);
    }
    return out;
}

/**
 * Pick the device to try next. Preference order:
 *   1. the device we were using before, if it is back
 *   2. a device that was not in the previous enumeration (newly plugged in)
 *   3. the first available device
 *   4. null, meaning "let getUserMedia choose"
 */
export function pickDeviceId(
    preferred: string | null,
    available: string[],
    knownBefore: string[] = [],
): string | null {
    const usable = available.filter(id => id.length > 0);
    if (preferred && usable.includes(preferred)) return preferred;
    const fresh = usable.find(id => !knownBefore.includes(id));
    if (fresh) return fresh;
    return usable[0] ?? null;
}

function same(state: CameraLossState): CameraLossTransition {
    return { state, effects: [] };
}

export function reduceCameraLoss(state: CameraLossState, event: CameraLossEvent): CameraLossTransition {
    switch (event.type) {
        case 'stream-started': {
            const knownDevices = event.devices ? dedupe(event.devices) : state.knownDevices;
            return same({
                status: 'active',
                activeDeviceId: event.deviceId,
                lastDeviceId: event.deviceId ?? state.lastDeviceId,
                knownDevices,
                cause: null,
                autoRetry: false,
            });
        }

        case 'stream-stopped':
            return same({
                ...state,
                status: 'inactive',
                activeDeviceId: null,
                cause: null,
                autoRetry: false,
            });

        case 'track-ended':
            // Only a live stream can be lost. An 'ended' from a track we
            // already replaced or stopped is ignored.
            if (state.status !== 'active') return same(state);
            return same({
                ...state,
                status: 'lost',
                activeDeviceId: null,
                cause: 'track-ended',
                autoRetry: false,
            });

        case 'devices-changed': {
            const devices = dedupe(event.devices);
            const fresh = devices.filter(id => id.length > 0 && !state.knownDevices.includes(id));

            if (state.status === 'active') {
                // Our device vanished from the list before (or without)
                // the track firing 'ended'.
                if (state.activeDeviceId && !devices.includes(state.activeDeviceId)) {
                    return same({
                        ...state,
                        status: 'lost',
                        activeDeviceId: null,
                        knownDevices: devices,
                        cause: 'device-removed',
                        autoRetry: false,
                    });
                }
                return same({ ...state, knownDevices: devices });
            }

            if (state.status === 'lost' && fresh.length > 0) {
                // A camera came back (or a different one was plugged in)
                // while we were showing the recovery panel: try it.
                const preferredDeviceId = pickDeviceId(state.lastDeviceId, devices, state.knownDevices);
                return {
                    state: { ...state, status: 'reacquiring', knownDevices: devices, autoRetry: true },
                    effects: [{ type: 'reacquire', preferredDeviceId, auto: true }],
                };
            }

            if (state.status === 'waiting' && devices.some(id => id.length > 0)) {
                const preferredDeviceId = pickDeviceId(state.lastDeviceId, devices, state.knownDevices);
                return {
                    state: { ...state, status: 'reacquiring', knownDevices: devices, autoRetry: true },
                    effects: [{ type: 'reacquire', preferredDeviceId, auto: true }],
                };
            }

            return same({ ...state, knownDevices: devices });
        }

        case 'retry': {
            if (state.status !== 'lost') return same(state);
            const preferredDeviceId = pickDeviceId(state.lastDeviceId, state.knownDevices);
            return {
                state: { ...state, status: 'reacquiring', autoRetry: false },
                effects: [{ type: 'reacquire', preferredDeviceId, auto: false }],
            };
        }

        case 'acquire-failed': {
            const hard = event.code !== null && HARD_FAILURE_CODES.has(event.code);
            if (state.status === 'reacquiring') {
                if (hard) {
                    return same({ ...state, status: 'inactive', cause: null, autoRetry: false });
                }
                return same({ ...state, status: 'lost', autoRetry: false });
            }
            if (state.status === 'inactive' && event.code === 'NO_DEVICE') {
                return same({ ...state, status: 'waiting' });
            }
            return same(state);
        }

        default:
            return same(state);
    }
}

/** True when the child-facing "camera went away" panel should be visible. */
export function isCameraLostVisible(state: CameraLossState): boolean {
    return state.status === 'lost' || state.status === 'reacquiring';
}
