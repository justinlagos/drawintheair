/**
 * Letter tile illustrations — A, E, I, O, U, B, C, D.
 *
 * Each tile is a rounded coloured card with a single bold Fredoka
 * character on top. Vowels and consonants share the same visual language;
 * the "what makes them different" question is the cognitive task.
 *
 * Tile colours rotate through the design system palette so adjacent
 * letters never share a background — kids can tell them apart at a glance.
 */

import type { KidIconDef } from '../kidIcons';
import { tileIcon } from './_helpers';

// Vowels — warm tones (sunshine, coral, warm orange, sunshine, rose)
// Consonants — cool tones (aqua, plum, meadow, violet)
// White text on every tile keeps the character maximally readable.
export const LETTER_ICONS: Record<string, KidIconDef> = {
    'letter.a': tileIcon('#FF6B6B', '#FFFFFF', 'A'),
    'letter.e': tileIcon('#FFB14D', '#FFFFFF', 'E'),
    'letter.i': tileIcon('#FFD84D', '#3F4052', 'I'),
    'letter.o': tileIcon('#FF6B9D', '#FFFFFF', 'O'),
    'letter.u': tileIcon('#FF8A2A', '#FFFFFF', 'U'),
    'letter.b': tileIcon('#55DDE0', '#3F4052', 'B'),
    'letter.c': tileIcon('#7ED957', '#FFFFFF', 'C'),
    'letter.d': tileIcon('#6C3FA4', '#FFFFFF', 'D'),
};
