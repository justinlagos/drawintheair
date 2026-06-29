/**
 * Picture tokens for the §11 teacher-assigned classroom join (P3b).
 *
 * The teacher assigns each rostered learner one picture for the session; the
 * child enters the code then picks THEIR picture from this fixed palette. The
 * palette is a client-side constant on purpose: the server only ever confirms
 * one specific token, so an anonymous client never learns the class roster or
 * its size. Tokens are re-assignable per session.
 *
 * `id` is the value stored in public.class_session_tokens.token.
 */

export interface PictureToken {
    /** Stable id stored server-side. */
    id: string;
    /** Child-facing label (also read aloud / shown to the teacher). */
    label: string;
    /** Emoji picture. */
    emoji: string;
    /** Card background colour (from the Bright Sky palette in src/styles/tokens.ts). */
    color: string;
}

export const PICTURE_TOKENS: PictureToken[] = [
    { id: 'star', label: 'Star', emoji: '⭐', color: '#FFC83D' },
    { id: 'fox', label: 'Fox', emoji: '🦊', color: '#F07A5C' },
    { id: 'rocket', label: 'Rocket', emoji: '🚀', color: '#7BB6FF' },
    { id: 'turtle', label: 'Turtle', emoji: '🐢', color: '#5BCE9A' },
    { id: 'flower', label: 'Flower', emoji: '🌸', color: '#E5A8FF' },
    { id: 'apple', label: 'Apple', emoji: '🍎', color: '#FF8A8A' },
    { id: 'moon', label: 'Moon', emoji: '🌙', color: '#8A66F0' },
    { id: 'fish', label: 'Fish', emoji: '🐟', color: '#7BD9A8' },
    { id: 'sun', label: 'Sun', emoji: '☀️', color: '#FFB23D' },
    { id: 'cat', label: 'Cat', emoji: '🐱', color: '#FFB6C1' },
    { id: 'tree', label: 'Tree', emoji: '🌳', color: '#5BCE9A' },
    { id: 'car', label: 'Car', emoji: '🚗', color: '#7BB6FF' },
    { id: 'balloon', label: 'Balloon', emoji: '🎈', color: '#F07A5C' },
    { id: 'frog', label: 'Frog', emoji: '🐸', color: '#9CD67A' },
    { id: 'bee', label: 'Bee', emoji: '🐝', color: '#FFC83D' },
    { id: 'whale', label: 'Whale', emoji: '🐳', color: '#7BB6FF' },
];

const TOKEN_BY_ID = new Map(PICTURE_TOKENS.map((t) => [t.id, t]));

export function tokenById(id: string | null | undefined): PictureToken | undefined {
    return id ? TOKEN_BY_ID.get(id) : undefined;
}
