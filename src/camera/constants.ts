import type { CameraConstraintsProfile } from './types';

/**
 * Ordered fallback profiles. Index 0 is tried first.
 * On OverconstrainedError the next profile is tried automatically.
 */
export const CAMERA_PROFILES: CameraConstraintsProfile[] = [
    // Profile 1 – default
    { id: 'default', width: 640, height: 480, frameRate: 30, facingMode: 'user', aspectLock: false },
    // Profile 2 – medium
    { id: 'medium', width: 960, height: 540, frameRate: 30, facingMode: 'user', aspectLock: false },
    // Profile 3 – high
    { id: 'high', width: 1280, height: 720, frameRate: 30, facingMode: 'user', aspectLock: false },
    // Profile 4 – low-end fallback
    { id: 'low', width: 480, height: 360, frameRate: 24, facingMode: 'user', aspectLock: false },
];

export const VISION_FPS_TARGET = 30;
export const VISION_FPS_MIN = 20;
export const CAPTURE_FPS_TARGET = 30;
