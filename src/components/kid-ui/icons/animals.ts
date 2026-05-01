/**
 * Animal face illustrations — dog, cat, rabbit, bear.
 * Used by Sort & Place "Animals vs Vehicles" stage.
 *
 * Front-facing kawaii heads. Each animal's silhouette is distinctive
 * (floppy ears for dog, triangular for cat, tall for rabbit, small for
 * bear) so a 4-year-old can name them without colour cues.
 */

import type { KidIconDef } from '../kidIcons';

export const ANIMAL_ICONS: Record<string, KidIconDef> = {
    'animal.dog': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Floppy ears (behind head) -->
            <ellipse cx="20" cy="48" rx="11" ry="20" fill="#9B6B3F" transform="rotate(-15 20 48)"/>
            <ellipse cx="80" cy="48" rx="11" ry="20" fill="#9B6B3F" transform="rotate(15 80 48)"/>
            <!-- Head -->
            <circle cx="50" cy="54" r="34" fill="#E0B070"/>
            <!-- Snout -->
            <ellipse cx="50" cy="64" rx="17" ry="13" fill="#F5D9A9"/>
            <!-- Eyes -->
            <circle cx="38" cy="48" r="4" fill="#3F4052"/>
            <circle cx="62" cy="48" r="4" fill="#3F4052"/>
            <circle cx="39.5" cy="46" r="1.6" fill="#FFFFFF"/>
            <circle cx="63.5" cy="46" r="1.6" fill="#FFFFFF"/>
            <!-- Nose -->
            <ellipse cx="50" cy="58" rx="4" ry="3" fill="#3F4052"/>
            <!-- Tongue -->
            <path d="M 46 70 Q 50 76 54 70 Q 50 80 46 70 Z" fill="#FF6B9D"/>
            <!-- Mouth line -->
            <path d="M 42 65 Q 50 71 58 65" fill="none"
                  stroke="#3F4052" stroke-width="2" stroke-linecap="round"/>
            <!-- Outline (head + ears) -->
            <ellipse cx="20" cy="48" rx="11" ry="20" fill="none"
                     stroke="rgba(20,15,40,0.22)" stroke-width="2" transform="rotate(-15 20 48)"/>
            <ellipse cx="80" cy="48" rx="11" ry="20" fill="none"
                     stroke="rgba(20,15,40,0.22)" stroke-width="2" transform="rotate(15 80 48)"/>
            <circle cx="50" cy="54" r="34" fill="none"
                    stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'animal.cat': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Ears (triangular) -->
            <polygon points="20,32 12,8 36,18" fill="#E89060"/>
            <polygon points="20,30 17,14 30,20" fill="#FFCFA8"/>
            <polygon points="80,32 88,8 64,18" fill="#E89060"/>
            <polygon points="80,30 83,14 70,20" fill="#FFCFA8"/>
            <!-- Head -->
            <circle cx="50" cy="56" r="34" fill="#E89060"/>
            <!-- Snout area -->
            <ellipse cx="50" cy="66" rx="14" ry="10" fill="#FFD9B8"/>
            <!-- Tabby stripes on forehead -->
            <path d="M 36 30 L 40 38 M 60 38 L 64 30 M 50 28 L 50 34"
                  stroke="#A86530" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <!-- Eyes (big, vertical pupils) -->
            <ellipse cx="38" cy="50" rx="5" ry="6" fill="#7ED957"/>
            <ellipse cx="38" cy="50" rx="1.6" ry="5" fill="#3F4052"/>
            <ellipse cx="62" cy="50" rx="5" ry="6" fill="#7ED957"/>
            <ellipse cx="62" cy="50" rx="1.6" ry="5" fill="#3F4052"/>
            <!-- Nose -->
            <path d="M 46 60 L 54 60 L 50 65 Z" fill="#FF6B9D"/>
            <!-- Mouth -->
            <path d="M 50 65 L 50 70 M 50 70 Q 44 73 42 69 M 50 70 Q 56 73 58 69"
                  fill="none" stroke="#3F4052" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Whiskers -->
            <line x1="18" y1="60" x2="34" y2="62" stroke="#3F4052" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="18" y1="66" x2="34" y2="65" stroke="#3F4052" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="82" y1="60" x2="66" y2="62" stroke="#3F4052" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="82" y1="66" x2="66" y2="65" stroke="#3F4052" stroke-width="1.2" stroke-linecap="round"/>
            <!-- Outline -->
            <circle cx="50" cy="56" r="34" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <polygon points="20,32 12,8 36,18" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
            <polygon points="80,32 88,8 64,18" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2" stroke-linejoin="round"/>
        `,
    },

    'animal.rabbit': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Long ears -->
            <ellipse cx="36" cy="22" rx="6" ry="20" fill="#F5F5F5" transform="rotate(-10 36 22)"/>
            <ellipse cx="64" cy="22" rx="6" ry="20" fill="#F5F5F5" transform="rotate(10 64 22)"/>
            <ellipse cx="36" cy="24" rx="3" ry="14" fill="#FFB8C8" transform="rotate(-10 36 24)"/>
            <ellipse cx="64" cy="24" rx="3" ry="14" fill="#FFB8C8" transform="rotate(10 64 24)"/>
            <!-- Head -->
            <circle cx="50" cy="62" r="32" fill="#F5F5F5"/>
            <!-- Cheeks -->
            <ellipse cx="32" cy="68" rx="4" ry="2.5" fill="#FFB8C8" opacity="0.5"/>
            <ellipse cx="68" cy="68" rx="4" ry="2.5" fill="#FFB8C8" opacity="0.5"/>
            <!-- Eyes -->
            <circle cx="38" cy="56" r="3.5" fill="#3F4052"/>
            <circle cx="62" cy="56" r="3.5" fill="#3F4052"/>
            <circle cx="39" cy="54.5" r="1.2" fill="#FFFFFF"/>
            <circle cx="63" cy="54.5" r="1.2" fill="#FFFFFF"/>
            <!-- Nose -->
            <path d="M 46 66 L 54 66 L 50 70 Z" fill="#FFB8C8"/>
            <!-- Mouth -->
            <path d="M 50 70 Q 44 73 42 71 M 50 70 Q 56 73 58 71"
                  fill="none" stroke="#3F4052" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Two front teeth -->
            <rect x="48" y="73" width="1.8" height="4" rx="0.5" fill="#FFFFFF"
                  stroke="#3F4052" stroke-width="0.8"/>
            <rect x="50.2" y="73" width="1.8" height="4" rx="0.5" fill="#FFFFFF"
                  stroke="#3F4052" stroke-width="0.8"/>
            <!-- Outline -->
            <ellipse cx="36" cy="22" rx="6" ry="20" fill="none"
                     stroke="rgba(20,15,40,0.22)" stroke-width="2" transform="rotate(-10 36 22)"/>
            <ellipse cx="64" cy="22" rx="6" ry="20" fill="none"
                     stroke="rgba(20,15,40,0.22)" stroke-width="2" transform="rotate(10 64 22)"/>
            <circle cx="50" cy="62" r="32" fill="none"
                    stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },

    'animal.bear': {
        viewBox: { w: 100, h: 100 },
        intrinsicColor: true,
        body: `
            <!-- Ears -->
            <circle cx="22" cy="28" r="11" fill="#7A4F1F"/>
            <circle cx="78" cy="28" r="11" fill="#7A4F1F"/>
            <circle cx="22" cy="28" r="6" fill="#FFC899"/>
            <circle cx="78" cy="28" r="6" fill="#FFC899"/>
            <!-- Head -->
            <circle cx="50" cy="56" r="34" fill="#9B6B3F"/>
            <!-- Snout -->
            <ellipse cx="50" cy="66" rx="18" ry="14" fill="#FFC899"/>
            <!-- Eyes -->
            <circle cx="38" cy="48" r="4" fill="#3F4052"/>
            <circle cx="62" cy="48" r="4" fill="#3F4052"/>
            <circle cx="39.5" cy="46" r="1.6" fill="#FFFFFF"/>
            <circle cx="63.5" cy="46" r="1.6" fill="#FFFFFF"/>
            <!-- Nose -->
            <ellipse cx="50" cy="60" rx="5" ry="4" fill="#3F4052"/>
            <!-- Mouth -->
            <path d="M 50 64 L 50 70 M 50 70 Q 44 73 42 69 M 50 70 Q 56 73 58 69"
                  fill="none" stroke="#3F4052" stroke-width="2" stroke-linecap="round"/>
            <!-- Cheek dots -->
            <circle cx="32" cy="62" r="2.5" fill="#FF6B9D" opacity="0.45"/>
            <circle cx="68" cy="62" r="2.5" fill="#FF6B9D" opacity="0.45"/>
            <!-- Outline -->
            <circle cx="50" cy="56" r="34" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <circle cx="22" cy="28" r="11" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
            <circle cx="78" cy="28" r="11" fill="none" stroke="rgba(20,15,40,0.22)" stroke-width="2"/>
        `,
    },
};
