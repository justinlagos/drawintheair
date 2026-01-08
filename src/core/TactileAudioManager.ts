/**
 * Tactile Audio Manager
 * 
 * Provides subtle, premium audio feedback:
 * - Pinch down: soft tack sound
 * - Pinch up: soft release sound
 * - Movement: low hum with pitch change by speed
 * - Success cues: mode-specific
 * 
 * Respects mute settings and low volume by default.
 */

import { trackingFeatures } from './trackingFeatures';
import type { TactileAudioConfig } from './trackingFeatures';

export class TactileAudioManager {
    private config: TactileAudioConfig;
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;
    private lastPinchState: boolean = false;
    private movementOscillator: OscillatorNode | null = null;
    private movementGain: GainNode | null = null;
    private lastPosition: { x: number; y: number } | null = null;
    private lastPositionTime: number = 0;
    private currentSpeed: number = 0;
    
    constructor() {
        this.config = trackingFeatures.getTactileAudioConfig();
        this.initializeAudio();
        this.checkMuteState();
    }
    
    private initializeAudio(): void {
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass({ sampleRate: 44100 });
            }
        } catch (e) {
            console.warn('Audio context initialization failed:', e);
        }
    }
    
    private checkMuteState(): void {
        if (!this.config.respectMute) return;
        
        // Check if device is muted (heuristic: try to play a silent sound)
        // Note: Browser APIs don't directly expose mute state, so we'll check periodically
        // For now, we'll rely on user preference or system settings
        // This can be enhanced with a user preference toggle
    }
    
    /**
     * Play pinch down sound (soft tack)
     */
    playPinchDown(): void {
        if (!this.audioContext || this.isMuted || !this.config.respectMute) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(this.config.pinchDownFreq, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                this.config.masterVolume * 0.4,
                this.audioContext.currentTime + 0.01
            );
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + 0.08
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.08);
        } catch (e) {
            // Audio not available or blocked
        }
    }
    
    /**
     * Play pinch up sound (soft release)
     */
    playPinchUp(): void {
        if (!this.audioContext || this.isMuted || !this.config.respectMute) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(this.config.pinchUpFreq, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                this.config.pinchUpFreq * 0.7,
                this.audioContext.currentTime + 0.1
            );
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                this.config.masterVolume * 0.3,
                this.audioContext.currentTime + 0.01
            );
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + 0.12
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.12);
        } catch (e) {
            // Audio not available or blocked
        }
    }
    
    /**
     * Update movement hum (continuous low hum with pitch change by speed)
     */
    updateMovement(position: { x: number; y: number } | null, timestamp: number): void {
        if (!this.audioContext || this.isMuted || !this.config.respectMute) return;
        
        // Calculate speed
        if (this.lastPosition && position) {
            const dt = Math.max((timestamp - this.lastPositionTime) / 1000, 0.001);
            const distance = Math.hypot(
                position.x - this.lastPosition.x,
                position.y - this.lastPosition.y
            );
            this.currentSpeed = distance / dt;
        } else {
            this.currentSpeed = 0;
        }
        
        this.lastPosition = position;
        this.lastPositionTime = timestamp;
        
        // Update or create movement hum
        if (position && this.currentSpeed > 0.001) {
            // Start or update movement hum
            if (!this.movementOscillator || !this.movementGain) {
                try {
                    this.movementOscillator = this.audioContext.createOscillator();
                    this.movementGain = this.audioContext.createGain();
                    
                    this.movementOscillator.connect(this.movementGain);
                    this.movementGain.connect(this.audioContext.destination);
                    
                    this.movementOscillator.type = 'sine';
                    this.movementOscillator.start();
                    
                    this.movementGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                } catch (e) {
                    // Audio not available
                    return;
                }
            }
            
            // Adjust pitch based on speed (subtle change)
            const speedFactor = Math.min(this.currentSpeed * this.config.speedToPitchFactor, 2.0);
            const targetFreq = this.config.movementHumFreq * (1 + speedFactor * 0.3);
            
            if (this.movementOscillator) {
                this.movementOscillator.frequency.setTargetAtTime(
                    targetFreq,
                    this.audioContext.currentTime,
                    0.1
                );
            }
            
            // Adjust volume based on speed (subtle)
            const volume = Math.min(this.currentSpeed * 0.5, 1.0) * this.config.masterVolume * 0.2;
            if (this.movementGain) {
                this.movementGain.gain.setTargetAtTime(
                    volume,
                    this.audioContext.currentTime,
                    0.1
                );
            }
        } else {
            // Stop movement hum if not moving
            this.stopMovementHum();
        }
    }
    
    private stopMovementHum(): void {
        if (this.movementGain && this.audioContext) {
            try {
                this.movementGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
                // Stop oscillator after fade
                setTimeout(() => {
                    if (this.movementOscillator) {
                        this.movementOscillator.stop();
                        this.movementOscillator = null;
                    }
                    if (this.movementGain) {
                        this.movementGain.disconnect();
                        this.movementGain = null;
                    }
                }, 100);
            } catch (e) {
                // Ignore
            }
        }
    }
    
    /**
     * Play success cue (mode-specific)
     */
    playSuccess(mode: 'tracing' | 'sorting' | 'bubble' | 'paint' = 'tracing'): void {
        if (!this.audioContext || this.isMuted || !this.config.respectMute) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            
            // Mode-specific success sound
            if (mode === 'tracing') {
                // Ascending two-tone
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(554, this.audioContext.currentTime + 0.1);
            } else if (mode === 'sorting') {
                // Pleasant chime
                oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime);
            } else if (mode === 'bubble') {
                // Pop-like sound
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.15);
            } else {
                // Generic success
                oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
            }
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(
                this.config.masterVolume * 0.5,
                this.audioContext.currentTime + 0.02
            );
            gainNode.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + (mode === 'bubble' ? 0.2 : 0.3)
            );
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + (mode === 'bubble' ? 0.2 : 0.3));
        } catch (e) {
            // Audio not available or blocked
        }
    }
    
    /**
     * Update pinch state (call on each frame to detect state changes)
     */
    updatePinchState(isPinching: boolean): void {
        if (this.lastPinchState !== isPinching) {
            if (isPinching) {
                this.playPinchDown();
            } else {
                this.playPinchUp();
            }
            this.lastPinchState = isPinching;
        }
    }
    
    /**
     * Set mute state
     */
    setMuted(muted: boolean): void {
        this.isMuted = muted;
        if (muted) {
            this.stopMovementHum();
        }
    }
    
    /**
     * Cleanup
     */
    cleanup(): void {
        this.stopMovementHum();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Singleton instance
export const tactileAudioManager = new TactileAudioManager();
