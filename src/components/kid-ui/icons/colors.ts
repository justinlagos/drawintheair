/**
 * Colour swatch illustrations — 8 colours used by Sort & Place "Warm vs
 * Cool" stage. Each is a glossy 2.5D sphere with the palette colour
 * baked in (intrinsic) so the data colour drives the appearance.
 *
 * White is rendered with a soft grey rim so it's visible on the bright
 * sky backdrop.
 */

import type { KidIconDef } from '../kidIcons';
import { colourSphere } from './_helpers';

export const COLOR_ICONS: Record<string, KidIconDef> = {
    'color.red':    colourSphere('#FF4757'),
    'color.orange': colourSphere('#FF8A2A'),
    'color.yellow': colourSphere('#FFD84D'),
    'color.pink':   colourSphere('#FF6B9D'),
    'color.blue':   colourSphere('#4C7DFF'),
    'color.green':  colourSphere('#7ED957'),
    'color.purple': colourSphere('#A855F7'),
    // White gets a darker rim so it doesn't disappear into the bright sky.
    'color.white': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <defs>
                <radialGradient id="csw" cx="35%" cy="35%" r="80%">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="60%" stop-color="#F4F6FB"/>
                    <stop offset="100%" stop-color="#D6DAE6"/>
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="url(#csw)"/>
            <ellipse cx="36" cy="32" rx="14" ry="9" fill="#FFFFFF" opacity="0.7"/>
            <ellipse cx="34" cy="30" rx="5" ry="3" fill="#FFFFFF"/>
            <circle cx="50" cy="50" r="46" fill="none"
                    stroke="rgba(20, 15, 40, 0.30)" stroke-width="2.5"/>
        `,
    },
};
