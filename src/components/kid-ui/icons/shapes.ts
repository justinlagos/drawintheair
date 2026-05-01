/**
 * Shape illustrations — circle, oval, square, rectangle, triangle, star,
 * heart, diamond. Used by Sort & Place "Curved vs Straight" stage.
 *
 * Each shape:
 *   - Solid colour fill from the item's data colour (color-tintable)
 *   - Glossy gradient overlay for 2.5D depth
 *   - White highlight + catchlight for "lit from above" feel
 *   - Thin dark outline for silhouette clarity
 */

import type { KidIconDef } from '../kidIcons';
import { HIGHLIGHT, OUTLINE_STROKE, OUTLINE_WIDTH } from './_helpers';

export const SHAPE_ICONS: Record<string, KidIconDef> = {
    'shape.circle': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <radialGradient id="cg" cx="35%" cy="35%" r="75%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
                    <stop offset="55%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="{color}"/>
                </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="46" fill="{color}"/>
            <circle cx="50" cy="50" r="46" fill="url(#cg)"/>
            ${HIGHLIGHT}
            <circle cx="50" cy="50" r="46" fill="none"
                    stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
        `,
    },

    'shape.oval': {
        viewBox: { w: 130, h: 100 },
        body: `
            <defs>
                <radialGradient id="og" cx="35%" cy="35%" r="80%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
                    <stop offset="55%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="{color}"/>
                </radialGradient>
            </defs>
            <ellipse cx="65" cy="50" rx="60" ry="44" fill="{color}"/>
            <ellipse cx="65" cy="50" rx="60" ry="44" fill="url(#og)"/>
            <ellipse cx="44" cy="32" rx="20" ry="8" fill="#FFFFFF" opacity="0.45"/>
            <ellipse cx="40" cy="30" rx="6" ry="3" fill="#FFFFFF" opacity="0.85"/>
            <ellipse cx="65" cy="50" rx="60" ry="44" fill="none"
                     stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
        `,
    },

    'shape.square': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
                    <stop offset="50%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
                </linearGradient>
            </defs>
            <rect x="6" y="6" width="88" height="88" rx="14" fill="{color}"/>
            <rect x="6" y="6" width="88" height="88" rx="14" fill="url(#sg)"/>
            ${HIGHLIGHT}
            <rect x="6" y="6" width="88" height="88" rx="14" fill="none"
                  stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
        `,
    },

    'shape.rectangle': {
        viewBox: { w: 140, h: 90 },
        body: `
            <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
                    <stop offset="50%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
                </linearGradient>
            </defs>
            <rect x="6" y="6" width="128" height="78" rx="12" fill="{color}"/>
            <rect x="6" y="6" width="128" height="78" rx="12" fill="url(#rg)"/>
            <ellipse cx="36" cy="24" rx="22" ry="7" fill="#FFFFFF" opacity="0.45"/>
            <ellipse cx="32" cy="22" rx="7" ry="3" fill="#FFFFFF" opacity="0.85"/>
            <rect x="6" y="6" width="128" height="78" rx="12" fill="none"
                  stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"/>
        `,
    },

    'shape.triangle': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
                    <stop offset="60%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
                </linearGradient>
            </defs>
            <polygon points="50,8 92,86 8,86" fill="{color}"
                     stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"
                     stroke-linejoin="round"/>
            <polygon points="50,8 92,86 8,86" fill="url(#tg)"/>
            <ellipse cx="40" cy="42" rx="9" ry="14" fill="#FFFFFF" opacity="0.4"
                     transform="rotate(-22 40 42)"/>
            <circle cx="38" cy="38" r="3" fill="#FFFFFF" opacity="0.85"/>
        `,
    },

    'shape.star': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <linearGradient id="stg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
                </linearGradient>
            </defs>
            <polygon points="50,6 61,38 95,40 68,60 78,94 50,74 22,94 32,60 5,40 39,38"
                fill="{color}" stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"
                stroke-linejoin="round"/>
            <polygon points="50,6 61,38 95,40 68,60 78,94 50,74 22,94 32,60 5,40 39,38"
                fill="url(#stg)"/>
            <circle cx="42" cy="34" r="4" fill="#FFFFFF" opacity="0.75"/>
        `,
    },

    'shape.heart': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
                    <stop offset="55%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.20)"/>
                </linearGradient>
            </defs>
            <path d="M 50 88 L 12 50 A 22 22 0 0 1 50 26 A 22 22 0 0 1 88 50 Z"
                fill="{color}" stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"
                stroke-linejoin="round"/>
            <path d="M 50 88 L 12 50 A 22 22 0 0 1 50 26 A 22 22 0 0 1 88 50 Z"
                fill="url(#hg)"/>
            <ellipse cx="32" cy="40" rx="11" ry="6" fill="#FFFFFF" opacity="0.55"
                     transform="rotate(-32 32 40)"/>
            <circle cx="29" cy="36" r="3" fill="#FFFFFF" opacity="0.95"/>
        `,
    },

    'shape.diamond': {
        viewBox: { w: 100, h: 100 },
        body: `
            <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/>
                    <stop offset="55%" stop-color="{color}" stop-opacity="0"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.18)"/>
                </linearGradient>
            </defs>
            <polygon points="50,6 94,50 50,94 6,50"
                fill="{color}" stroke="${OUTLINE_STROKE}" stroke-width="${OUTLINE_WIDTH}"
                stroke-linejoin="round"/>
            <polygon points="50,6 94,50 50,94 6,50" fill="url(#dg)"/>
            <polygon points="50,12 50,50 14,50" fill="#FFFFFF" opacity="0.18"/>
            <ellipse cx="38" cy="34" rx="10" ry="5" fill="#FFFFFF" opacity="0.55"
                     transform="rotate(-30 38 34)"/>
        `,
    },
};
