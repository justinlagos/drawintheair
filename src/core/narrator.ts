/**
 * Safe Narrator System
 * 
 * Uses curated lines via local TTS or pre-recorded audio.
 * Triggers on events, not constantly.
 * No privacy risk, no network dependency.
 */

import { featureFlags } from './featureFlags';

type NarratorEvent = 
    | 'mode_start'
    | 'mode_complete'
    | 'milestone'
    | 'encouragement'
    | 'near_complete'
    | 'success'
    | 'idle';

interface NarratorLine {
    text: string;
    emoji?: string;
    delay?: number; // ms delay before speaking
}

// Curated lines per event type
const NARRATOR_LINES: Record<NarratorEvent, NarratorLine[]> = {
    mode_start: [
        { text: "Let's begin!", emoji: '👋' },
        { text: "Ready to play?", emoji: '🎮' },
        { text: "Here we go!", emoji: '✨' }
    ],
    mode_complete: [
        { text: "Amazing work!", emoji: '⭐' },
        { text: "You did it!", emoji: '🎉' },
        { text: "Fantastic!", emoji: '🌟' }
    ],
    milestone: [
        { text: "Great progress!", emoji: '🎯' },
        { text: "Keep it up!", emoji: '💪' },
        { text: "You're doing great!", emoji: '👍' }
    ],
    encouragement: [
        { text: "You've got this!", emoji: '💪' },
        { text: "Keep going!", emoji: '🚀' },
        { text: "Almost there!", emoji: '✨' }
    ],
    near_complete: [
        { text: "So close!", emoji: '🎯' },
        { text: "You're almost done!", emoji: '🏁' },
        { text: "Just a bit more!", emoji: '⚡' }
    ],
    success: [
        { text: "Perfect!", emoji: '⭐' },
        { text: "Excellent!", emoji: '🌟' },
        { text: "Wonderful!", emoji: '🎉' }
    ],
    idle: [
        { text: "Try pinching to interact", emoji: '👆' },
        { text: "Point and hold to select", emoji: '👉' },
        { text: "Use your finger to draw", emoji: '✏️' }
    ]
};

// Cooldown to prevent too many narrations
const NARRATION_COOLDOWN_MS = 3000; // 3 seconds between narrations
let lastNarrationTime = 0;
let lastEventType: NarratorEvent | null = null;

/**
 * Speak a line using Web Speech API (local TTS)
 */
const speak = (line: NarratorLine): void => {
    if (!featureFlags.getFlag('narrator')) return;
    
    const now = Date.now();
    if (now - lastNarrationTime < NARRATION_COOLDOWN_MS) {
        return; // Too soon, skip
    }

    try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            return;
        }

        const utterance = new SpeechSynthesisUtterance(line.text);
        utterance.rate = 0.9; // Slightly slower for kids
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 0.8;
        
        // Try to use a friendly voice if available
        const voices = window.speechSynthesis.getVoices();
        const friendlyVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha'))
        );
        if (friendlyVoice) {
            utterance.voice = friendlyVoice;
        }

        const delay = line.delay || 0;
        
        if (delay > 0) {
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
                lastNarrationTime = Date.now();
            }, delay);
        } else {
            window.speechSynthesis.speak(utterance);
            lastNarrationTime = Date.now();
        }
    } catch (e) {
        // TTS not supported or blocked - silently fail
        console.debug('Narrator: TTS not available');
    }
};

/**
 * Load voices (required for some browsers)
 */
export const initNarrator = (): void => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Load voices
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                // Voices loaded
            });
        }
    }
};

/**
 * Narrate for an event (randomly selects a line from the event type)
 */
export const narrate = (event: NarratorEvent, force: boolean = false): void => {
    if (!featureFlags.getFlag('narrator')) return;
    
    // Don't repeat same event type too quickly
    if (!force && event === lastEventType && Date.now() - lastNarrationTime < NARRATION_COOLDOWN_MS * 2) {
        return;
    }

    const lines = NARRATOR_LINES[event];
    if (!lines || lines.length === 0) return;

    // Randomly select a line
    try {
        const line = lines[Math.floor(Math.random() * lines.length)];
        lastEventType = event;
        speak(line);
    } catch (error) {
        console.error('[Narrator] Error speaking:', error);
        featureFlags.disableFlag('narrator', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Stop any ongoing narration
 */
export const stopNarrator = (): void => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
};
