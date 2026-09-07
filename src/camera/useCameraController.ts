import { useRef, useState, useCallback, useEffect } from 'react';
import type { CameraState, CameraConstraintsProfile, CameraErrorCode } from './types';
import { CAMERA_PROFILES } from './constants';
import { CAMERA_DEBUG } from './debug';
import { logEvent } from '../lib/analytics';
import {
    INITIAL_CAMERA_LOSS_STATE,
    reduceCameraLoss,
    type CameraLossEvent,
    type CameraLossState,
} from './cameraLoss';

const INITIAL_STATE: CameraState = {
    status: 'idle',
    errorCode: null,
    streamActive: false,
    videoWidth: 0,
    videoHeight: 0,
    fpsCapture: 0,
    fpsVision: 0,
    qualityTier: 'good',
};

export interface StartCameraOptions {
    preferredFacingMode?: 'user' | 'environment';
    profileId?: string;
    /** Exact device to open. Used when re-acquiring after a camera loss. */
    deviceId?: string;
}

export interface UseCameraControllerResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    state: CameraState;
    /** Camera loss machine state (DIA-022). Read `status` to know whether
     *  the child-facing "camera went away" panel should show. */
    loss: CameraLossState;
    startCamera: (options?: StartCameraOptions) => Promise<void>;
    stopCamera: () => void;
    restartCamera: () => Promise<void>;
    /** Retry after a mid-session camera loss. Re-enumerates devices, prefers
     *  the device we had, otherwise the first available, and re-attaches
     *  the stream without a page reload. */
    reacquireCamera: () => void;
    updateVisionMetrics: (fpsVision: number, qualityTier: 'good' | 'ok' | 'poor') => void;
}

type AcquireOutcome = 'ok' | 'aborted' | Exclude<CameraErrorCode, null>;

/** Video input deviceIds. Empty when enumerateDevices is unavailable. */
async function listVideoInputIds(): Promise<string[]> {
    try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'videoinput').map(d => d.deviceId);
    } catch {
        return [];
    }
}

export function useCameraController(): UseCameraControllerResult {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [state, setState] = useState<CameraState>(INITIAL_STATE);
    const lastOptionsRef = useRef<StartCameraOptions>({});
    // Guard: prevent concurrent / duplicate requests
    const isRequestingRef = useRef(false);

    // Camera loss machine. The ref is the source of truth for event
    // handlers (they fire outside React's render cycle); the state mirror
    // is what the UI reads.
    const lossRef = useRef<CameraLossState>(INITIAL_CAMERA_LOSS_STATE);
    const [loss, setLoss] = useState<CameraLossState>(INITIAL_CAMERA_LOSS_STATE);
    // Detaches the 'ended' listener from the current video track.
    const detachTrackListenerRef = useRef<(() => void) | null>(null);
    // Set from the effect below; lets dispatch run effects that need acquire.
    const runReacquireRef = useRef<(preferredDeviceId: string | null, auto: boolean) => void>(() => { /* bound below */ });

    const dispatchLoss = useCallback((event: CameraLossEvent) => {
        const { state: next, effects } = reduceCameraLoss(lossRef.current, event);
        lossRef.current = next;
        setLoss(next);
        for (const effect of effects) {
            if (effect.type === 'reacquire') {
                runReacquireRef.current(effect.preferredDeviceId, effect.auto);
            }
        }
    }, []);

    /** Stops tracks and detaches listeners without touching React state. */
    const releaseStream = useCallback(() => {
        if (detachTrackListenerRef.current) {
            detachTrackListenerRef.current();
            detachTrackListenerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const stopCamera = useCallback(() => {
        releaseStream();
        isRequestingRef.current = false;
        setState(INITIAL_STATE);
        dispatchLoss({ type: 'stream-stopped' });
    }, [releaseStream, dispatchLoss]);

    /** Called when the live video track ends on its own (camera unplugged,
     *  OS revoked the device, another app grabbed it). A track we stopped
     *  ourselves never reaches here because releaseStream detaches first. */
    const handleTrackLost = useCallback((stream: MediaStream) => {
        if (streamRef.current !== stream) return;
        if (CAMERA_DEBUG) console.warn('[Camera] video track ended unexpectedly');
        logEvent('camera_lost', { meta: { cause: 'track-ended' } });
        releaseStream();
        isRequestingRef.current = false;
        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'CAMERA_LOST' });
        dispatchLoss({ type: 'track-ended' });
    }, [releaseStream, dispatchLoss]);

    const acquire = useCallback(async (options: StartCameraOptions = {}): Promise<AcquireOutcome> => {
        // Already running, do nothing. Only stopCamera or an explicit restartCamera can trigger a new request.
        if (streamRef.current?.active || isRequestingRef.current) return 'aborted';

        isRequestingRef.current = true;
        // Remember facing/profile for restarts but not the deviceId: a
        // later plain restart should let the browser choose again.
        lastOptionsRef.current = { preferredFacingMode: options.preferredFacingMode, profileId: options.profileId };
        setState(prev => ({ ...prev, status: 'requesting', errorCode: null }));

        // Activation funnel: a single camera_requested event per startCamera
        // call. Profile fallbacks below are an internal retry, they don't
        // count as separate user-facing requests.
        const cameraRequestedAt = Date.now();
        logEvent('camera_requested', { meta: { profile_id: options.profileId ?? 'auto' } });

        const facingMode = options.preferredFacingMode ?? 'user';

        // Build ordered profile list
        let profiles: CameraConstraintsProfile[];
        if (options.profileId) {
            const preferred = CAMERA_PROFILES.find(p => p.id === options.profileId);
            const rest = CAMERA_PROFILES.filter(p => p.id !== options.profileId);
            profiles = preferred ? [preferred, ...rest] : [...CAMERA_PROFILES];
        } else {
            profiles = [...CAMERA_PROFILES];
        }

        // When a deviceId is given, try each profile on that device first,
        // then repeat without the deviceId so a vanished device does not
        // block a fallback to whatever camera is left.
        const attempts: Array<{ profile: CameraConstraintsProfile; deviceId?: string }> = options.deviceId
            ? [
                ...profiles.map(profile => ({ profile, deviceId: options.deviceId })),
                ...profiles.map(profile => ({ profile })),
            ]
            : profiles.map(profile => ({ profile }));

        let lastError: unknown = null;

        for (const { profile, deviceId } of attempts) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: profile.width },
                        height: { ideal: profile.height },
                        frameRate: { ideal: profile.frameRate },
                        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode }),
                    },
                });

                streamRef.current = stream;

                const video = videoRef.current;
                if (!video) {
                    // No video element yet, cleanup and abort
                    stream.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                    isRequestingRef.current = false;
                    setState({ ...INITIAL_STATE, status: 'error', errorCode: 'UNKNOWN' });
                    return 'UNKNOWN';
                }

                // Do NOT set width / height attributes (distorts aspect).
                // Use CSS contain on the parent instead.
                video.playsInline = true;
                video.muted = true;
                video.autoplay = true;
                video.srcObject = stream;

                // Wait for metadata so videoWidth/Height are available
                if (video.readyState < 1) {
                    await new Promise<void>((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            video.removeEventListener('loadedmetadata', onMeta);
                            reject(new Error('loadedmetadata timeout'));
                        }, 8000);
                        const onMeta = () => {
                            clearTimeout(timeout);
                            video.removeEventListener('loadedmetadata', onMeta);
                            resolve();
                        };
                        video.addEventListener('loadedmetadata', onMeta);
                    });
                }

                // autoplay may be blocked by browser policy, non-fatal
                await video.play().catch(() => { /* silent */ });

                const track = stream.getVideoTracks()[0];
                const settings = track?.getSettings() ?? {};

                // Watch for the device disappearing mid-session (DIA-022).
                if (track) {
                    const onEnded = () => handleTrackLost(stream);
                    track.addEventListener('ended', onEnded);
                    detachTrackListenerRef.current = () => track.removeEventListener('ended', onEnded);
                }

                isRequestingRef.current = false;
                setState({
                    status: 'running',
                    errorCode: null,
                    streamActive: true,
                    videoWidth: (settings.width as number) || video.videoWidth,
                    videoHeight: (settings.height as number) || video.videoHeight,
                    fpsCapture: (settings.frameRate as number) || profile.frameRate,
                    fpsVision: 0,
                    qualityTier: 'good',
                });

                const activeDeviceId = typeof settings.deviceId === 'string' && settings.deviceId.length > 0
                    ? settings.deviceId
                    : null;
                dispatchLoss({ type: 'stream-started', deviceId: activeDeviceId });
                // Seed the known-device list now that permission is granted
                // (deviceIds are only populated after a grant).
                void listVideoInputIds().then(devices => {
                    if (streamRef.current === stream && devices.length > 0) {
                        dispatchLoss({ type: 'devices-changed', devices });
                    }
                });

                if (CAMERA_DEBUG) {
                    console.log(`[Camera] started profile="${profile.id}" ${settings.width}x${settings.height}@${settings.frameRate}fps`);
                }

                logEvent('camera_granted', {
                    value_number: Date.now() - cameraRequestedAt,
                    meta: {
                        profile_id: profile.id,
                        width: (settings.width as number) || video.videoWidth,
                        height: (settings.height as number) || video.videoHeight,
                        frame_rate: (settings.frameRate as number) || profile.frameRate,
                    },
                });
                return 'ok'; // success

            } catch (err) {
                lastError = err;

                if (err instanceof DOMException) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'PERMISSION_DENIED' });
                        logEvent('camera_denied', { meta: { code: 'PERMISSION_DENIED', name: err.name } });
                        return 'PERMISSION_DENIED';
                    }
                    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        // With an exact deviceId a vanished device reports
                        // NotFound; fall through to the deviceId-free attempts.
                        if (deviceId) continue;
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'NO_DEVICE' });
                        logEvent('camera_denied', { meta: { code: 'NO_DEVICE', name: err.name } });
                        return 'NO_DEVICE';
                    }
                    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                        if (deviceId) continue;
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'DEVICE_BUSY' });
                        logEvent('camera_denied', { meta: { code: 'DEVICE_BUSY', name: err.name } });
                        return 'DEVICE_BUSY';
                    }
                    // OverconstrainedError / ConstraintNotSatisfiedError: try next attempt
                    if (CAMERA_DEBUG) {
                        console.log(`[Camera] profile "${profile.id}" overconstrained, trying next`);
                    }
                }
                // Any other error: try next attempt
            }
        }

        // All profiles exhausted
        isRequestingRef.current = false;
        const supported = typeof navigator.mediaDevices?.getUserMedia === 'function';
        const finalCode = supported ? 'UNKNOWN' : 'NOT_SUPPORTED';
        setState({ ...INITIAL_STATE, status: 'error', errorCode: finalCode });
        logEvent('camera_denied', {
            meta: {
                code: finalCode,
                name: lastError instanceof Error ? lastError.name : 'unknown',
                message: lastError instanceof Error ? lastError.message : String(lastError ?? ''),
                profiles_tried: profiles.length,
            },
        });
        if (CAMERA_DEBUG) {
            console.error('[Camera] all profiles failed', lastError);
        }
        return finalCode;
    }, [handleTrackLost, dispatchLoss]);

    const startCamera = useCallback(async (options: StartCameraOptions = {}) => {
        const outcome = await acquire(options);
        if (outcome !== 'ok' && outcome !== 'aborted') {
            dispatchLoss({ type: 'acquire-failed', code: outcome });
        }
    }, [acquire, dispatchLoss]);

    // Bind the reacquire effect. Runs outside stopCamera on purpose: the
    // recovery panel must stay up (status stays 'reacquiring') while the
    // new stream is requested, so the child never sees a flash of the game
    // with no camera behind it.
    useEffect(() => {
        runReacquireRef.current = (preferredDeviceId, auto) => {
            releaseStream();
            isRequestingRef.current = false;
            logEvent('camera_recovery_retry', { meta: { cause: 'CAMERA_LOST', auto, has_preferred: preferredDeviceId !== null } });
            void (async () => {
                // Fresh enumeration right before the request: the reducer's
                // list may predate the latest devicechange.
                const devices = await listVideoInputIds();
                const deviceId = preferredDeviceId && devices.includes(preferredDeviceId)
                    ? preferredDeviceId
                    : (devices.find(id => id.length > 0) ?? preferredDeviceId ?? undefined);
                const outcome = await acquire({ ...lastOptionsRef.current, deviceId: deviceId ?? undefined });
                if (outcome !== 'ok' && outcome !== 'aborted') {
                    // Keep the child on the "camera went away" panel unless
                    // the failure is one a retry cannot fix.
                    if (outcome !== 'PERMISSION_DENIED' && outcome !== 'NOT_SUPPORTED') {
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'CAMERA_LOST' });
                    }
                    dispatchLoss({ type: 'acquire-failed', code: outcome });
                }
            })();
        };
    }, [acquire, releaseStream, dispatchLoss]);

    const reacquireCamera = useCallback(() => {
        dispatchLoss({ type: 'retry' });
    }, [dispatchLoss]);

    // Only used on explicit user action (e.g. a "retry" button)
    const restartCamera = useCallback(async () => {
        stopCamera();
        await startCamera(lastOptionsRef.current);
    }, [stopCamera, startCamera]);

    // Called by useVisionLoop to push fps + quality into CameraState
    const updateVisionMetrics = useCallback((fpsVision: number, qualityTier: 'good' | 'ok' | 'poor') => {
        setState(prev => {
            if (prev.fpsVision === fpsVision && prev.qualityTier === qualityTier) return prev;
            return { ...prev, fpsVision, qualityTier };
        });
    }, []);

    // Device hot-plug (DIA-022): re-enumerate on every devicechange and let
    // the loss machine decide. Covers the active device vanishing without
    // an 'ended' event, and a camera appearing while we are lost/waiting.
    useEffect(() => {
        const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
        if (!md || typeof md.addEventListener !== 'function') return;
        const onDeviceChange = () => {
            void listVideoInputIds().then(devices => {
                const track = streamRef.current?.getVideoTracks()[0];
                if (track && track.readyState === 'ended' && streamRef.current) {
                    // Some browsers mark the track ended without firing the event.
                    handleTrackLost(streamRef.current);
                }
                const before = lossRef.current.status;
                dispatchLoss({ type: 'devices-changed', devices });
                if (before === 'active' && lossRef.current.status === 'lost') {
                    logEvent('camera_lost', { meta: { cause: 'device-removed' } });
                    releaseStream();
                    isRequestingRef.current = false;
                    setState({ ...INITIAL_STATE, status: 'error', errorCode: 'CAMERA_LOST' });
                }
            });
        };
        md.addEventListener('devicechange', onDeviceChange);
        return () => md.removeEventListener('devicechange', onDeviceChange);
    }, [dispatchLoss, handleTrackLost, releaseStream]);

    // Page visibility: pause video to release decoder when tab is hidden,
    // resume without restarting the stream when tab is visible again.
    useEffect(() => {
        const onVisibilityChange = () => {
            const video = videoRef.current;
            if (!video) return;
            if (document.hidden) {
                video.pause();
            } else if (streamRef.current?.active) {
                video.play().catch(() => { /* silent */ });
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    // Cleanup stream on unmount
    useEffect(() => {
        return () => {
            if (detachTrackListenerRef.current) {
                detachTrackListenerRef.current();
                detachTrackListenerRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    return { videoRef, state, loss, startCamera, stopCamera, restartCamera, reacquireCamera, updateVisionMetrics };
}
