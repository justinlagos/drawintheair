export interface CameraConstraintsProfile {
    id: string;
    width: number;
    height: number;
    frameRate: number;
    facingMode: 'user' | 'environment';
    aspectLock: boolean;
}

export type CameraErrorCode =
    | 'PERMISSION_DENIED'
    | 'NO_DEVICE'
    | 'DEVICE_BUSY'
    | 'NOT_SUPPORTED'
    | 'UNKNOWN'
    | null;

export interface CameraState {
    status: 'idle' | 'requesting' | 'running' | 'error';
    errorCode: CameraErrorCode;
    streamActive: boolean;
    videoWidth: number;
    videoHeight: number;
    fpsCapture: number;
    fpsVision: number;
    qualityTier: 'good' | 'ok' | 'poor';
}
