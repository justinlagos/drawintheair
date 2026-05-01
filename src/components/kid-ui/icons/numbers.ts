/**
 * Number tile illustrations — 1 through 8.
 *
 * Each tile is a rounded coloured card with a single bold Fredoka digit.
 * Odd numbers and even numbers use distinct colour ranges so the
 * "odd vs even" sorting task has a subtle visual scaffold without
 * giving the answer away.
 */

import type { KidIconDef } from '../kidIcons';
import { tileIcon } from './_helpers';

export const NUMBER_ICONS: Record<string, KidIconDef> = {
    // Odd — coral / sunshine / warm orange / rose
    'number.1': tileIcon('#FF6B6B', '#FFFFFF', '1'),
    'number.3': tileIcon('#FFB14D', '#FFFFFF', '3'),
    'number.5': tileIcon('#FF8A2A', '#FFFFFF', '5'),
    'number.7': tileIcon('#FF6B9D', '#FFFFFF', '7'),
    // Even — aqua / meadow / plum / violet
    'number.2': tileIcon('#55DDE0', '#3F4052', '2'),
    'number.4': tileIcon('#7ED957', '#FFFFFF', '4'),
    'number.6': tileIcon('#6C3FA4', '#FFFFFF', '6'),
    'number.8': tileIcon('#A855F7', '#FFFFFF', '8'),
};
