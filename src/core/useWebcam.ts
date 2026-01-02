import { useEffect, useState, useRef } from 'react';

interface UseWebcamOptions {
    width?: number;
    height?: number;
    facingMode?: 'user' | 'environment';
}

interface UseWebcamResult {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    stream: MediaStream | null;
    error: Error | null;
    isLoading: boolean;
}

export const useWebcam = ({
    width = 1280,
    height = 720,
    facingMode = 'user',
}: UseWebcamOptions = {}): UseWebcamResult => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;

        const startWebcam = async () => {
            try {
                setIsLoading(true);
                const constraints = {
                    video: {
                        width: { ideal: width },
                        height: { ideal: height },
                        facingMode,
                    },
                };

                const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

                if (mounted) {
                    setStream(mediaStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                        videoRef.current.onloadedmetadata = () => {
                            videoRef.current?.play();
                        }
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error('Failed to access webcam'));
                    setIsLoading(false);
                }
            }
        };

        startWebcam();

        return () => {
            mounted = false;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [width, height, facingMode]);

    return { videoRef, stream, error, isLoading };
};
