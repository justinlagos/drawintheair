/**
 * Avatar generator — deterministic emoji + bright color from a name.
 *
 * Goal: every kid joining the class instantly gets a memorable
 * little persona ("🦊 Lila") that the teacher can find on the
 * roster card AND that the kid sees on their own screen. Same input
 * → same output, so a reconnect after a tablet sleep keeps the same
 * avatar.
 *
 * Animals + colors picked to be friendly, varied, and high-contrast
 * against the Kid-UI cream background. Emoji-only on purpose: no
 * asset pipeline, no licensing, works on every device.
 */

const ANIMALS = [
    '🦊', '🐯', '🐼', '🦁', '🐻', '🐰', '🦄', '🐸',
    '🦋', '🐝', '🐙', '🐳', '🦒', '🦘', '🦦', '🐢',
    '🦅', '🐧', '🐬', '🦔', '🐿️', '🦝', '🦥', '🐨',
];

const COLORS = [
    '#FFD84D', '#55DDE0', '#FF6B6B', '#7ED957',
    '#FFB14D', '#A78BFA', '#F472B6', '#34D399',
    '#FBBF24', '#60A5FA', '#FB7185', '#22D3EE',
];

/** Cheap deterministic hash — good enough for a 24-bucket choice. */
function hashCode(input: string): number {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) - h) + input.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

export interface Avatar {
    emoji: string;
    color: string;
    seed: string;
}

/**
 * Generate a stable avatar for a (sessionId, name) pair. The pair
 * is the seed so two kids called "Lila" in different classes get
 * different animals; same kid in same class always gets the same.
 *
 * The returned `seed` is what we persist in
 * session_students.avatar_seed so the avatar survives a reconnect.
 */
export function avatarForStudent(sessionId: string, name: string): Avatar {
    const seed = `${sessionId}:${name.toLowerCase().trim()}`;
    const h = hashCode(seed);
    return {
        emoji: ANIMALS[h % ANIMALS.length],
        color: COLORS[h % COLORS.length],
        seed,
    };
}

/** Resolve an avatar from a stored seed — used when the row
 *  already has avatar_seed and we just need to hydrate. */
export function avatarFromSeed(seed: string | null | undefined): Avatar {
    if (!seed) {
        return { emoji: '🐣', color: '#FFD84D', seed: '' };
    }
    const h = hashCode(seed);
    return {
        emoji: ANIMALS[h % ANIMALS.length],
        color: COLORS[h % COLORS.length],
        seed,
    };
}

/**
 * Names dedupe within a session — if Lila already exists, second
 * Lila becomes "Lila B" (not "Lila2"). Feels human.
 *
 * @param desiredName  the name the kid typed
 * @param existingNames list of names already in the session
 * @returns           the deduped name to actually use
 */
export function dedupeName(desiredName: string, existingNames: string[]): string {
    const trimmed = desiredName.trim();
    if (trimmed.length === 0) return trimmed;
    const lowered = trimmed.toLowerCase();
    const lowerSet = new Set(existingNames.map((n) => n.toLowerCase()));
    if (!lowerSet.has(lowered)) return trimmed;
    // Try B, C, D, ...
    for (let i = 1; i < 26; i++) {
        const suffix = String.fromCharCode(65 + i); // 'B', 'C', ...
        const candidate = `${trimmed} ${suffix}`;
        if (!lowerSet.has(candidate.toLowerCase())) return candidate;
    }
    // Last resort
    return `${trimmed} ${Date.now() % 100}`;
}
