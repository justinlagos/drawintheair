import { useEffect, useState, useRef } from 'react';
import { perf } from './perf';

interface UseWebcamOptions {
    width?: number;
    height?: number;
    facingMode?: 'user' | 'environment';
    autoStart?: boolean;
}

interface UseWebcamResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    stream: MediaStream | null;
    error: Error | null;
    isLoading: boolean;
    requestAccess: () => Promise<void>;
}

export const useWebcam = ({
    width,
    height,
    facingMode = 'user',
    autoStart = true,
}: UseWebcamOptions & { autoStart?: boolean } = {}): UseWebcamResult => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(autoStart);

    const startWebcam = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // Use perf config for camera resolution, or fallback to provided/default values
            const perfConfig = perf.getConfig();
            const cameraWidth = width ?? perfConfig.cameraWidth;
            const cameraHeight = height ?? perfConfig.cameraHeight;
            
            const constraints = {
                video: {
                    width: { ideal: cameraWidth },
                    height: { ideal: cameraHeight },
                    frameRate: { ideal: 30 },
                    facingMode,
                },
            };

            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                }
            }
            setIsLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to access webcam'));
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (autoStart) {
            startWebcam();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // Note: perf config may change, but we don't want to restart camera on every change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode, autoStart]);

    return { videoRef, stream, error, isLoading, requestAccess: startWebcam };
};
