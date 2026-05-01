/**
 * Shared SVG fragments and helpers for the Kid-UI icon library.
 *
 * Re-usable bits that show up across multiple category files. Centralised
 * so the visual language stays consistent — touch a constant, every icon
 * picks it up.
 */

import type { KidIconDef } from '../kidIcons';

// Glossy highlight at top-left — sells the "lit-from-above 2.5D" feel.
// Tuned for a 100x100 viewBox.
export const HIGHLIGHT = `
  <ellipse cx="36" cy="32" rx="14" ry="9" fill="#FFFFFF" opacity="0.45"/>
  <ellipse cx="34" cy="30" rx="5" ry="3" fill="#FFFFFF" opacity="0.85"/>
`;

// Standard outline stroke — thin charcoal at low opacity so silhouettes
// stay clear without looking heavy.
export const OUTLINE_STROKE = 'rgba(20, 15, 40, 0.22)';
export const OUTLINE_WIDTH = '2';

// Bright tile colour rotation — used by letter / number tiles so each
// instance reads as a distinct "card" while staying on-palette.
export const TILE_COLOURS = [
    '#6C3FA4', // deep plum
    '#FF6B6B', // coral
    '#55DDE0', // aqua
    '#7ED957', // meadow green
    '#FFD84D', // sunshine
    '#FFB14D', // warm orange
    '#A855F7', // violet
    '#FF6B9D', // rose
];

/**
 * Build a tile-style icon (rounded square with a single bold character).
 * Used by both letters and numbers.
 */
export const tileIcon = (bg: string, fg: string, char: string): KidIconDef => ({
    viewBox: { w: 100, h: 100 },
    intrinsicColor: true,
    body: `
        <rect x="6" y="6" width="88" height="88" rx="22" fill="${bg}"/>
        <rect x="6" y="6" width="88" height="44" rx="22" fill="rgba(255,255,255,0.30)"/>
        <text x="50" y="72" font-family="Fredoka, 'Baloo 2', system-ui, sans-serif"
              font-weight="700" font-size="62" fill="${fg}" text-anchor="middle">${char}</text>
        <rect x="6" y="6" width="88" height="88" rx="22"
              fill="none" stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
    `,
});

/**
 * Build a colour-swatch sphere — used for `color.*` items where the item
 * is literally just a coloured ball. Has intrinsic colour because the
 * stage data already specifies the colour.
 */
export const colourSphere = (color: string): KidIconDef => ({
    viewBox: { w: 100, h: 100 },
    intrinsicColor: true,
    body: `
        <defs>
            <radialGradient id="cs" cx="35%" cy="35%" r="80%">
                <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.7"/>
                <stop offset="40%" stop-color="${color}" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="${color}"/>
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="${color}"/>
        <circle cx="50" cy="50" r="46" fill="url(#cs)"/>
        ${HIGHLIGHT}
        <circle cx="50" cy="50" r="46" fill="none"
                stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
    `,
});
