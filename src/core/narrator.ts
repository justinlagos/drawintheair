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

// ── Voice selection ─────────────────────────────────────────────────────
// The Web Speech API exposes a wildly different set of voices across
// browser+OS combinations. The default voice on most systems is a flat,
// robotic one that fails the "warm and friendly for a 4-year-old" bar.
// We try to pick the most natural-sounding voice available, in priority
// order. Anything with "Natural", "Neural" or "Online" in the name is
// usually a modern neural voice (Edge, Chrome OS, recent Safari).
//
// Cache the resolved voice so we don't search the list on every utterance —
// voices can take a few hundred ms to populate after page load.
let cachedVoice: SpeechSynthesisVoice | null = null;
let lastVoiceListSize = 0;

const VOICE_PREFERENCES: ReadonlyArray<RegExp> = [
    // Edge / Chromium neural voices — the highest-quality free option in 2026.
    /Microsoft (Aria|Jenny|Ava|Sonia|Libby) (Online|Natural)/i,
    /Natural .* (en[-_]?(US|GB|AU|IE))/i,
    /Neural .* (en[-_]?(US|GB|AU|IE))/i,
    // Google Cloud voices on Chrome — friendly, fairly natural.
    /Google (UK|US) English Female/i,
    /Google English Female/i,
    /Google UK English/i,
    /Google US English/i,
    // Apple system voices — warm and lively.
    /^Samantha\b/i,        // US English, default macOS friendly
    /^Karen\b/i,           // AU English, kid-friendly accent
    /^Tessa\b/i,           // South African English, warm
    /^Moira\b/i,           // Irish English, lyrical
    /^Daniel\b/i,          // UK English male — fallback if no female option
    /^Fiona\b/i,           // Scottish English
    // Generic female-coded English fallback.
    /female.*en/i,
    /en.*female/i,
];

const pickVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    // If the voice list hasn't changed since our last resolution, reuse cache.
    if (cachedVoice && voices.length === lastVoiceListSize) return cachedVoice;
    lastVoiceListSize = voices.length;

    for (const pattern of VOICE_PREFERENCES) {
        const hit = voices.find(v => pattern.test(v.name));
        if (hit) { cachedVoice = hit; return hit; }
    }
    // Last-ditch: any English voice that isn't the system default.
    const englishFallback = voices.find(v => v.lang.startsWith('en') && !v.default)
        ?? voices.find(v => v.lang.startsWith('en'))
        ?? null;
    cachedVoice = englishFallback;
    return englishFallback;
};

/**
 * Speak a line using Web Speech API (local TTS).
 *
 * Limitation we accept here: even with the best voice picker, browser
 * SpeechSynthesis is robotic compared to dedicated TTS services
 * (ElevenLabs, PlayHT, OpenAI TTS). The architecturally correct upgrade
 * path is pre-recorded audio files: drop MP3s in `public/audio/cues/`
 * keyed by event/line name, and replace this `speechSynthesis.speak`
 * call with `new Audio(...).play()`. We'd ship better voice quality and
 * make the network-free privacy guarantee even cleaner.
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
        // Slightly slower + a touch higher pitch reads as warm-and-friendly
        // to most listeners; faster/lower starts to sound clinical or stern.
        // Volume a little under 1.0 leaves headroom for music + SFX.
        utterance.rate   = 0.92;
        utterance.pitch  = 1.06;
        utterance.volume = 0.82;

        const voice = pickVoice();
        if (voice) {
            utterance.voice = voice;
            // Match the lang to the selected voice — some browsers reset
            // pitch/rate if the lang on the utterance doesn't match the
            // voice's lang, producing the flat default voice instead.
            utterance.lang = voice.lang;
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
    } catch {
        // TTS not supported or blocked - silently fail
        if (typeof console !== 'undefined') console.debug('Narrator: TTS not available');
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

/**
 * Speak an arbitrary line of text. Subject to the same feature-flag gate
 * and cooldown as `narrate(event)`. Used by modes that need to speak
 * dynamic content the curated lists can't cover — e.g. "Find the purple
 * stone" in Rainbow Bridge, "Spell the word BIRD" in Spelling Stars.
 *
 * Pass `urgent: true` to bypass the same-event cooldown when the prompt
 * is a re-prompt after a stuck moment (still respects the global
 * cooldown so we never spam).
 */
export const narrateText = (text: string, opts: { urgent?: boolean } = {}): void => {
    if (!featureFlags.getFlag('narrator')) return;
    if (!text) return;

    // We don't have an event type for custom text, so the same-event
    // cooldown check inside narrate() doesn't apply. The global cooldown
    // inside speak() still does.
    if (opts.urgent) {
        // Cancel any in-flight utterance so the urgent line lands fast.
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            // Reset the global cooldown timer so speak() will actually fire.
            lastNarrationTime = 0;
        }
    }

    speak({ text });
};
