import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { trackingFeatures } from './trackingFeatures';

export class HandTracker {
    private handLandmarker: HandLandmarker | null = null;
    private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
    private currentNumHands: number = 1;
    private initialized: boolean = false;

    async initialize() {
        if (this.initialized && this.handLandmarker) {
            return;
        }
        
        try {
            // Check if two-hand mode is enabled
            const flags = trackingFeatures.getFlags();
            const numHands = flags.enableTwoHandMode ? 2 : 1;
            this.currentNumHands = numHands;
            
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: 'GPU',
                },
                runningMode: this.runningMode,
                numHands: numHands, // 1 for single hand, 2 for two-hand mode
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            this.initialized = true;
            console.log(`HandLandmarker initialized with ${numHands} hand(s)`);
        } catch (error) {
            console.error('Failed to initialize HandLandmarker:', error);
            throw error;
        }
    }
    
    isReady(): boolean {
        return this.initialized && this.handLandmarker !== null;
    }
    
    /**
     * Reinitialize with different numHands (requires closing first)
     */
    async reinitialize(numHands: number): Promise<void> {
        if (this.currentNumHands === numHands && this.handLandmarker) {
            return; // Already initialized with correct numHands
        }
        
        this.close();
        this.currentNumHands = numHands;
        await this.initialize();
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
