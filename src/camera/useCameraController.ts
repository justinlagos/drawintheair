import { useRef, useState, useCallback, useEffect } from 'react';
import type { CameraState, CameraConstraintsProfile } from './types';
import { CAMERA_PROFILES } from './constants';
import { CAMERA_DEBUG } from './debug';

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
}

export interface UseCameraControllerResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    state: CameraState;
    startCamera: (options?: StartCameraOptions) => Promise<void>;
    stopCamera: () => void;
    restartCamera: () => Promise<void>;
    updateVisionMetrics: (fpsVision: number, qualityTier: 'good' | 'ok' | 'poor') => void;
}

export function useCameraController(): UseCameraControllerResult {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [state, setState] = useState<CameraState>(INITIAL_STATE);
    const lastOptionsRef = useRef<StartCameraOptions>({});
    // Guard: prevent concurrent / duplicate requests
    const isRequestingRef = useRef(false);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        isRequestingRef.current = false;
        setState(INITIAL_STATE);
    }, []);

    const startCamera = useCallback(async (options: StartCameraOptions = {}) => {
        // Already running — do nothing. Only stopCamera or an explicit restartCamera can trigger a new request.
        if (streamRef.current?.active || isRequestingRef.current) return;

        isRequestingRef.current = true;
        lastOptionsRef.current = options;
        setState(prev => ({ ...prev, status: 'requesting', errorCode: null }));

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

        let lastError: unknown = null;

        for (const profile of profiles) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: profile.width },
                        height: { ideal: profile.height },
                        frameRate: { ideal: profile.frameRate },
                        facingMode,
                    },
                });

                streamRef.current = stream;

                const video = videoRef.current;
                if (!video) {
                    // No video element yet — cleanup and abort
                    stream.getTracks().forEach(t => t.stop());
                    streamRef.current = null;
                    isRequestingRef.current = false;
                    setState({ ...INITIAL_STATE, status: 'error', errorCode: 'UNKNOWN' });
                    return;
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

                // autoplay may be blocked by browser policy — non-fatal
                await video.play().catch(() => { /* silent */ });

                const track = stream.getVideoTracks()[0];
                const settings = track?.getSettings() ?? {};

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

                if (CAMERA_DEBUG) {
                    console.log(`[Camera] started profile="${profile.id}" ${settings.width}x${settings.height}@${settings.frameRate}fps`);
                }
                return; // success

            } catch (err) {
                lastError = err;

                if (err instanceof DOMException) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'PERMISSION_DENIED' });
                        return;
                    }
                    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'NO_DEVICE' });
                        return;
                    }
                    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                        isRequestingRef.current = false;
                        setState({ ...INITIAL_STATE, status: 'error', errorCode: 'DEVICE_BUSY' });
                        return;
                    }
                    // OverconstrainedError / ConstraintNotSatisfiedError → try next profile
                    if (CAMERA_DEBUG) {
                        console.log(`[Camera] profile "${profile.id}" overconstrained, trying next`);
                    }
                }
                // Any other error → try next profile
            }
        }

        // All profiles exhausted
        isRequestingRef.current = false;
        const supported = typeof navigator.mediaDevices?.getUserMedia === 'function';
        setState({ ...INITIAL_STATE, status: 'error', errorCode: supported ? 'UNKNOWN' : 'NOT_SUPPORTED' });
        if (CAMERA_DEBUG) {
            console.error('[Camera] all profiles failed', lastError);
        }
    }, []);

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
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, []);

    return { videoRef, state, startCamera, stopCamera, restartCamera, updateVisionMetrics };
}
