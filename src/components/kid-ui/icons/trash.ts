/**
 * Trash illustrations — banana peel, candy wrapper, used tissue, paper cup.
 * Used by Sort & Place "Recycle vs Trash" stage.
 *
 * Each silhouette signals "used/discarded" — split peel, crinkled wrapper,
 * crumpled tissue, used cup with straw — to contrast with the clean,
 * intact recyclable items.
 */

import type { KidIconDef } from '../kidIcons';

export const TRASH_ICONS: Record<string, KidIconDef> = {
    'trash.banana': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Center exposed pulp (brown, oxidised) -->
            <ellipse cx="50" cy="62" rx="14" ry="11" fill="#9B6B3F"/>
            <ellipse cx="50" cy="60" rx="10" ry="7" fill="#C8956B"/>
            <!-- Peel — three flopped-down sections -->
            <path d="M 50 60 Q 30 50 18 28 Q 16 50 28 70 Q 38 78 50 60 Z" fill="#FFD13D"/>
            <path d="M 50 60 Q 70 50 82 28 Q 84 50 72 70 Q 62 78 50 60 Z" fill="#FFD13D"/>
            <path d="M 50 60 L 44 26 L 56 26 Z" fill="#FFE680"/>
            <!-- Brown bruise spots -->
            <ellipse cx="34" cy="48" rx="4" ry="3" fill="#7A4F1F" opacity="0.55"/>
            <ellipse cx="66" cy="52" rx="3" ry="2" fill="#7A4F1F" opacity="0.55"/>
            <ellipse cx="46" cy="32" rx="3" ry="2" fill="#7A4F1F" opacity="0.45"/>
            <!-- Stem at top -->
            <rect x="48" y="14" width="4" height="14" fill="#7A4F1F" rx="1"/>
            <!-- Highlight along peel -->
            <path d="M 22 38 Q 26 50 30 60" fill="none"
                  stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
            <path d="M 78 38 Q 74 50 70 60" fill="none"
                  stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
            <!-- Outlines -->
            <path d="M 50 60 Q 30 50 18 28 Q 16 50 28 70 Q 38 78 50 60 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M 50 60 Q 70 50 82 28 Q 84 50 72 70 Q 62 78 50 60 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <path d="M 50 60 L 44 26 L 56 26 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'trash.wrapper': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Twisted left end -->
            <path d="M 14 50 L 26 36 L 28 50 L 26 64 Z" fill="#FF6B6B"/>
            <!-- Twisted right end -->
            <path d="M 86 50 L 74 36 L 72 50 L 74 64 Z" fill="#FF6B6B"/>
            <!-- Middle bulge -->
            <ellipse cx="50" cy="50" rx="26" ry="20" fill="#FFD84D"/>
            <!-- Diagonal stripe pattern -->
            <path d="M 30 40 L 40 60 M 50 38 L 60 62 M 70 40 L 60 62"
                  stroke="#FF6B6B" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
            <!-- Crinkle radiating lines (left twist) -->
            <line x1="28" y1="50" x2="34" y2="44" stroke="#3F4052" stroke-width="0.8" opacity="0.4"/>
            <line x1="28" y1="50" x2="34" y2="56" stroke="#3F4052" stroke-width="0.8" opacity="0.4"/>
            <!-- Crinkle radiating lines (right twist) -->
            <line x1="72" y1="50" x2="66" y2="44" stroke="#3F4052" stroke-width="0.8" opacity="0.4"/>
            <line x1="72" y1="50" x2="66" y2="56" stroke="#3F4052" stroke-width="0.8" opacity="0.4"/>
            <!-- Highlight on middle -->
            <ellipse cx="44" cy="42" rx="9" ry="5" fill="#FFFFFF" opacity="0.5"/>
            <!-- Outline -->
            <path d="M 14 50 L 26 36 Q 30 32 50 30 Q 70 32 74 36 L 86 50 L 74 64 Q 70 68 50 70 Q 30 68 26 64 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'trash.paper': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Crumpled blob silhouette -->
            <path d="M 28 32 Q 22 50 28 70 Q 50 80 72 70 Q 78 50 72 30 Q 50 24 28 32 Z"
                  fill="#F4F6FB"/>
            <!-- Inner shadow shape -->
            <path d="M 32 38 Q 28 50 32 64 Q 50 72 68 64 Q 72 50 68 36 Q 50 32 32 38 Z"
                  fill="#FFFFFF"/>
            <!-- Crumple shadow lines -->
            <path d="M 38 38 Q 40 50 36 62" fill="none" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M 50 32 Q 48 50 52 70" fill="none" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M 62 38 Q 60 50 64 62" fill="none" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M 36 50 Q 50 52 64 50" fill="none" stroke="#A8B0C0" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Highlight -->
            <ellipse cx="40" cy="42" rx="8" ry="5" fill="#FFFFFF" opacity="0.7"/>
            <!-- Outline -->
            <path d="M 28 32 Q 22 50 28 70 Q 50 80 72 70 Q 78 50 72 30 Q 50 24 28 32 Z"
                  fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'trash.cup': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Body (trapezoid - paper cup) -->
            <polygon points="26,32 74,32 70,86 30,86" fill="#F4F6FB"/>
            <!-- Lid -->
            <rect x="22" y="22" width="56" height="10" rx="2" fill="#FFFFFF"/>
            <!-- Lid lip -->
            <rect x="22" y="22" width="56" height="4" rx="2" fill="#E0E4EA"/>
            <!-- Lid hole -->
            <ellipse cx="58" cy="27" rx="6" ry="2.5" fill="#3F4052" opacity="0.4"/>
            <!-- Straw poking out -->
            <rect x="56" y="6" width="4" height="22" fill="#FF6B6B"/>
            <!-- Straw stripes -->
            <rect x="56" y="10" width="4" height="2" fill="#FFFFFF"/>
            <rect x="56" y="16" width="4" height="2" fill="#FFFFFF"/>
            <rect x="56" y="22" width="4" height="2" fill="#FFFFFF"/>
            <!-- Cup body highlight -->
            <rect x="32" y="38" width="3" height="44" rx="1.5" fill="#FFFFFF" opacity="0.7"/>
            <!-- Logo / brand circle -->
            <circle cx="50" cy="58" r="9" fill="#7ED957"/>
            <circle cx="50" cy="58" r="6" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
            <!-- Outline -->
            <polygon points="26,32 74,32 70,86 30,86"
                     fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },
};
