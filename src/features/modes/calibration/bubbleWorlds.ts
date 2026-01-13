/**
 * Bubble Pop Worlds - 6 Distinct Visual Themes
 * 
 * Each level becomes a visually distinct "WORLD" with unique:
 * - Background scene/theme
 * - Color palette
 * - Bubble styles
 * - Ambient effects
 */

export interface BubbleWorld {
    id: number;
    name: string;
    theme: string;
    background: {
        gradient: string;
        pattern?: string;
        animation?: string;
    };
    bubbleStyle: {
        colors: string[];
        glowColor: string;
        borderStyle: string;
    };
    ambient: {
        particles: string;
        floatingElements?: string[];
    };
    unlockRequirement: number; // Score needed from previous world
}

export const BUBBLE_WORLDS: BubbleWorld[] = [
    {
        id: 1,
        name: "Sunny Meadow",
        theme: "daytime-outdoor",
        background: {
            gradient: "linear-gradient(180deg, #87CEEB 0%, #98FB98 50%, #90EE90 100%)",
            pattern: "floating-clouds",
            animation: "gentle-breeze"
        },
        bubbleStyle: {
            // High-contrast, warm colours that pop against blue/green meadow
            // Avoid cool greens/teals that blend with the background
            colors: [
                '#FF1744', // Bright red
                '#FF6D00', // Vivid orange
                '#FF4081', // Hot pink
                '#FFEA00', // Bright yellow
                '#D500F9', // Magenta
                '#651FFF'  // Deep purple
            ],
            glowColor: 'rgba(255, 255, 255, 0.6)',
            borderStyle: 'soft-white'
        },
        ambient: {
            particles: 'floating-dandelions',
            floatingElements: ['🌸', '🦋', '☀️']
        },
        unlockRequirement: 0
    },
    {
        id: 2,
        name: "Ocean Depths",
        theme: "underwater",
        background: {
            gradient: "linear-gradient(180deg, #1A5276 0%, #154360 50%, #0E2F44 100%)",
            pattern: "bubbling-water",
            animation: "underwater-sway"
        },
        bubbleStyle: {
            colors: ['#00CED1', '#48D1CC', '#40E0D0', '#7FFFD4', '#00FA9A'],
            glowColor: 'rgba(0, 255, 255, 0.4)',
            borderStyle: 'translucent-aqua'
        },
        ambient: {
            particles: 'rising-bubbles',
            floatingElements: ['🐠', '🐙', '🦀', '🌊']
        },
        unlockRequirement: 20
    },
    {
        id: 3,
        name: "Candy Kingdom",
        theme: "fantasy-sweet",
        background: {
            gradient: "linear-gradient(180deg, #FFB6C1 0%, #FF69B4 50%, #FF1493 100%)",
            pattern: "sprinkles",
            animation: "candy-rain"
        },
        bubbleStyle: {
            colors: ['#FF69B4', '#FFB6C1', '#FF6EB4', '#FF82AB', '#FFD700'],
            glowColor: 'rgba(255, 182, 193, 0.6)',
            borderStyle: 'glossy-candy'
        },
        ambient: {
            particles: 'falling-sprinkles',
            floatingElements: ['🍭', '🍬', '🧁', '🎂']
        },
        unlockRequirement: 24
    },
    {
        id: 4,
        name: "Space Station",
        theme: "sci-fi-space",
        background: {
            gradient: "linear-gradient(180deg, #0D0221 0%, #1A0533 50%, #2D0A4E 100%)",
            pattern: "starfield",
            animation: "twinkling-stars"
        },
        bubbleStyle: {
            colors: ['#9B59B6', '#8E44AD', '#A855F7', '#C084FC', '#E879F9'],
            glowColor: 'rgba(155, 89, 182, 0.5)',
            borderStyle: 'neon-purple'
        },
        ambient: {
            particles: 'shooting-stars',
            floatingElements: ['🚀', '⭐', '🌙', '🛸']
        },
        unlockRequirement: 28
    },
    {
        id: 5,
        name: "Volcano Island",
        theme: "tropical-fire",
        background: {
            gradient: "linear-gradient(180deg, #FF4500 0%, #FF6347 30%, #2F4F4F 100%)",
            pattern: "lava-flow",
            animation: "ember-rise"
        },
        bubbleStyle: {
            colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFA500', '#FFD700'],
            glowColor: 'rgba(255, 69, 0, 0.5)',
            borderStyle: 'molten-glow'
        },
        ambient: {
            particles: 'floating-embers',
            floatingElements: ['🌋', '🔥', '🌴', '☄️']
        },
        unlockRequirement: 32
    },
    {
        id: 6,
        name: "Rainbow Summit",
        theme: "magical-rainbow",
        background: {
            gradient: "linear-gradient(180deg, #FF0000 0%, #FF7F00 17%, #FFFF00 33%, #00FF00 50%, #0000FF 67%, #4B0082 83%, #9400D3 100%)",
            pattern: "prismatic-shimmer",
            animation: "rainbow-pulse"
        },
        bubbleStyle: {
            colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
            glowColor: 'rgba(255, 255, 255, 0.7)',
            borderStyle: 'prismatic'
        },
        ambient: {
            particles: 'rainbow-sparkles',
            floatingElements: ['🌈', '✨', '💎', '👑']
        },
        unlockRequirement: 36
    }
];

/**
 * Get world by level (1-indexed)
 */
export const getWorldByLevel = (level: number): BubbleWorld | null => {
    return BUBBLE_WORLDS[level - 1] || null;
};

/**
 * Get world background gradient as CSS string
 */
export const getWorldBackgroundGradient = (level: number): string => {
    const world = getWorldByLevel(level);
    return world?.background.gradient || 'rgba(1, 12, 36, 1)';
};

/**
 * Get world bubble colors
 */
export const getWorldBubbleColors = (level: number): string[] => {
    const world = getWorldByLevel(level);
    return world?.bubbleStyle.colors || ['#FF6B6B', '#4ECDC4', '#FFE66D'];
};
