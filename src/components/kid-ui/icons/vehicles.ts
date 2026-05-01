/**
 * Vehicle illustrations — red car, blue car, plane, boat.
 * Used by Sort & Place "Animals vs Vehicles" stage.
 *
 * Side-view silhouettes — instantly recognisable as vehicles even
 * without colour cues, so the sort task can rely on category-not-colour.
 */

import type { KidIconDef } from '../kidIcons';

const buildCar = (bodyColor: string): KidIconDef => ({
    viewBox: { w: 100, h: 90 },
    intrinsicColor: true,
    body: `
        <!-- Side-view sedan body -->
        <path d="M 6 60 L 12 56 L 22 42 Q 26 36 36 36 L 64 36 Q 74 36 78 42 L 88 56 L 94 60 L 94 70 L 6 70 Z"
              fill="${bodyColor}"/>
        <!-- Window -->
        <path d="M 26 42 L 32 50 L 50 50 L 50 42 Z" fill="#7DD3FC"/>
        <path d="M 50 42 L 50 50 L 68 50 L 74 42 Z" fill="#7DD3FC"/>
        <!-- Door line -->
        <line x1="50" y1="50" x2="50" y2="68" stroke="rgba(0,0,0,0.20)" stroke-width="1.5"/>
        <!-- Body shine -->
        <rect x="20" y="58" width="60" height="3" rx="1.5" fill="#FFFFFF" opacity="0.4"/>
        <!-- Headlight (right) -->
        <circle cx="90" cy="58" r="2.5" fill="#FFD84D"/>
        <!-- Wheels -->
        <circle cx="26" cy="72" r="9" fill="#3F4052"/>
        <circle cx="26" cy="72" r="4.5" fill="#A8A8B8"/>
        <circle cx="26" cy="72" r="1.8" fill="#3F4052"/>
        <circle cx="74" cy="72" r="9" fill="#3F4052"/>
        <circle cx="74" cy="72" r="4.5" fill="#A8A8B8"/>
        <circle cx="74" cy="72" r="1.8" fill="#3F4052"/>
        <!-- Outline -->
        <path d="M 6 60 L 12 56 L 22 42 Q 26 36 36 36 L 64 36 Q 74 36 78 42 L 88 56 L 94 60 L 94 70 L 6 70 Z"
              fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
    `,
});

export const VEHICLE_ICONS: Record<string, KidIconDef> = {
    'vehicle.car.red':    buildCar('#E84545'),
    'vehicle.car.blue':   buildCar('#4C7DFF'),
    'vehicle.car.green':  buildCar('#5BB04A'),
    'vehicle.car.yellow': buildCar('#FFD13D'),

    'vehicle.plane': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Wing back-left (under fuselage) -->
            <polygon points="34,52 14,68 30,68 46,54" fill="#9CA0AC"/>
            <!-- Fuselage -->
            <ellipse cx="50" cy="50" rx="44" ry="9" fill="#F4F6FB"/>
            <ellipse cx="50" cy="49" rx="44" ry="3" fill="#FFFFFF" opacity="0.7"/>
            <!-- Top wing -->
            <polygon points="44,42 36,28 50,38 60,38" fill="#D6DAE6"/>
            <!-- Vertical tail -->
            <polygon points="86,50 90,28 94,50" fill="#D6DAE6"/>
            <!-- Horizontal tail -->
            <polygon points="80,52 96,52 96,46 86,46" fill="#D6DAE6"/>
            <!-- Cockpit window (nose) -->
            <path d="M 6 50 L 16 46 L 16 54 Z" fill="#7DD3FC"/>
            <!-- Cabin windows -->
            <rect x="22" y="46" width="50" height="3" rx="1.5" fill="#7DD3FC" opacity="0.7"/>
            <!-- Body underside shadow -->
            <rect x="14" y="55" width="72" height="3" rx="1.5" fill="rgba(0,0,0,0.10)"/>
            <!-- Outlines -->
            <ellipse cx="50" cy="50" rx="44" ry="9" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <polygon points="44,42 36,28 50,38 60,38" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <polygon points="86,50 90,28 94,50" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'vehicle.boat': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Water ripples -->
            <path d="M 4 88 Q 10 86 16 88 Q 22 86 28 88" fill="none"
                  stroke="#7DD3FC" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
            <path d="M 72 88 Q 78 86 84 88 Q 90 86 96 88" fill="none"
                  stroke="#7DD3FC" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
            <!-- Hull (warm wood) -->
            <path d="M 8 70 L 14 82 Q 50 88 86 82 L 92 70 Z" fill="#A86533"/>
            <path d="M 14 78 Q 50 84 86 78" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.55"/>
            <!-- Cabin / hull stripe -->
            <rect x="24" y="64" width="52" height="6" fill="#E84545"/>
            <!-- Mast -->
            <rect x="49" y="14" width="2.5" height="50" fill="#7A4F1F"/>
            <!-- Big triangular sail -->
            <path d="M 51 16 L 80 64 L 51 64 Z" fill="#FFFFFF"/>
            <!-- Sail shading -->
            <path d="M 56 38 L 70 60" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="1"/>
            <!-- Smaller front sail -->
            <path d="M 50 18 L 28 64 L 50 64 Z" fill="#F5F5F5"/>
            <!-- Flag -->
            <polygon points="51,14 60,17 51,20" fill="#E84545"/>
            <!-- Outline (hull) -->
            <path d="M 8 70 L 14 82 Q 50 88 86 82 L 92 70 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <!-- Outlines (sails) -->
            <path d="M 51 16 L 80 64 L 51 64 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M 50 18 L 28 64 L 50 64 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },
};
