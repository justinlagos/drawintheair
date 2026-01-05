import { useEffect, useState, useRef } from 'react';

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
    width = 1280,
    height = 720,
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
            const constraints = {
                video: {
                    width: { ideal: width },
                    height: { ideal: height },
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height, facingMode, autoStart]);

    return { videoRef, stream, error, isLoading, requestAccess: startWebcam };
};
