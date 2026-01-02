import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export class HandTracker {
    private handLandmarker: HandLandmarker | null = null;
    private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';

    async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: 'GPU',
                },
                runningMode: this.runningMode,
                numHands: 1, // MVP constraint: single child
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            console.log('HandLandmarker initialized');
        } catch (error) {
            console.error('Failed to initialize HandLandmarker:', error);
            throw error;
        }
    }

    detect(video: HTMLVideoElement, startTimeMs: number): HandLandmarkerResult | null {
        if (!this.handLandmarker) return null;

        try {
            return this.handLandmarker.detectForVideo(video, startTimeMs);
        } catch (e) {
            console.error('Detection error:', e);
            return null;
        }
    }

    close() {
        this.handLandmarker?.close();
    }
}

export const handTracker = new HandTracker();
