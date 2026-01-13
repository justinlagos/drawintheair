/**
 * Landscape Backgrounds for Bubble Pop - 3 Progressive Levels
 * 
 * Each level has a distinct illustrated landscape background with:
 * - Multiple layers (sky, mountains, hills, ground)
 * - Ambient elements (clouds, birds, particles)
 * - Parallax animation support
 */

export interface LandscapeLayer {
    type: 'sky' | 'mountain' | 'hill' | 'forest' | 'ground' | 'clouds' | 'sun' | 'dune' | 'desert';
    yPosition: number;      // 0 = top, 1 = bottom (normalized)
    height: number;         // Layer height (normalized)
    colors: string[];       // Gradient colors for this layer
    parallaxSpeed?: number; // For subtle animation (0 = static, 1 = full speed)
}

export interface LandscapeBackground {
    id: string;
    name: string;
    layers: LandscapeLayer[];
    ambientElements?: AmbientElement[];
}

export interface AmbientElement {
    type: 'cloud' | 'bird' | 'leaf' | 'sparkle' | 'flower' | 'palm' | 'camel';
    count: number;
    speed: number;
    size: number;
}

// =============================================================================
// LEVEL 1: SUNNY MEADOW - Green hills with mountains, blue sky, flowers
// Inspired by: Vibrant cartoon landscape with rolling green hills
// =============================================================================
export const SUNNY_MEADOW: LandscapeBackground = {
    id: 'sunny-meadow',
    name: 'Sunny Meadow',
    layers: [
        // Sky gradient - Bright blue transitioning to light blue-green
        {
            type: 'sky',
            yPosition: 0,
            height: 0.65,
            colors: ['#87CEEB', '#B0E0E6', '#E0F6FF', '#F0FFF0'],  // Sky blue to light blue-green
            parallaxSpeed: 0
        },
        // Distant mountains/hills - Dark olive green with angular peaks
        {
            type: 'mountain',
            yPosition: 0.4,
            height: 0.25,
            colors: ['#6B8E23', '#556B2F'],  // Olive green mountains
            parallaxSpeed: 0.05
        },
        // Mid-ground hills - Lighter green, softer curves
        {
            type: 'hill',
            yPosition: 0.5,
            height: 0.3,
            colors: ['#9ACD32', '#7CFC00', '#90EE90'],  // Yellow-green to light green
            parallaxSpeed: 0.15
        },
        // Foreground hills - Rich green with grass texture
        {
            type: 'ground',
            yPosition: 0.65,
            height: 0.35,
            colors: ['#228B22', '#32CD32', '#3CB371'],  // Forest green to medium sea green
            parallaxSpeed: 0.25
        }
    ],
    ambientElements: [
        { type: 'cloud', count: 3, speed: 0.12, size: 120 },
        { type: 'bird', count: 4, speed: 0.5, size: 18 },
        { type: 'flower', count: 15, speed: 0, size: 8 }
    ]
};

// =============================================================================
// LEVEL 2: MISTY MOUNTAINS - Blue-purple mountains with layered hills
// Inspired by: Soft watercolor-style layered mountain scene
// =============================================================================
export const MISTY_MOUNTAINS: LandscapeBackground = {
    id: 'misty-mountains',
    name: 'Misty Mountains',
    layers: [
        // Sky - Light blue with soft clouds
        {
            type: 'sky',
            yPosition: 0,
            height: 0.7,
            colors: ['#E0F2F1', '#B2EBF2', '#80DEEA'],  // Light teal-blue sky
            parallaxSpeed: 0
        },
        // Far mountains - Light desaturated blue-purple
        {
            type: 'mountain',
            yPosition: 0.55,
            height: 0.2,
            colors: ['#B39BC8', '#C5A3D6'],  // Light purple-blue
            parallaxSpeed: 0.03
        },
        // Mid mountains - Medium blue-purple with rounded peaks
        {
            type: 'mountain',
            yPosition: 0.65,
            height: 0.25,
            colors: ['#9575CD', '#B39BC8'],  // Medium purple-blue
            parallaxSpeed: 0.08
        },
        // Foreground hills - Darker blue-purple, smooth curves
        {
            type: 'hill',
            yPosition: 0.75,
            height: 0.25,
            colors: ['#7E57C2', '#9575CD'],  // Darker purple-blue
            parallaxSpeed: 0.15
        }
    ],
    ambientElements: [
        { type: 'cloud', count: 4, speed: 0.08, size: 140 },
        { type: 'bird', count: 3, speed: 0.45, size: 16 },
        { type: 'sparkle', count: 12, speed: 0.25, size: 4 }  // Mist particles
    ]
};

// =============================================================================
// LEVEL 3: DESERT SUNSET - Desert scene with dunes, palm trees, camel
// Inspired by: Stylized desert landscape at dusk/dawn
// =============================================================================
export const SUNSET_PEAKS: LandscapeBackground = {
    id: 'sunset-peaks',
    name: 'Desert Sunset',
    layers: [
        // Sky gradient - Muted teal-blue transitioning to warm beige-grey
        {
            type: 'sky',
            yPosition: 0,
            height: 0.65,
            colors: ['#4682B4', '#87CEEB', '#D2B48C', '#F5DEB3'],  // Steel blue to sandy beige
            parallaxSpeed: 0
        },
        // Sun/Moon - Large pale orb
        {
            type: 'sun',
            yPosition: 0.15,
            height: 0.2,
            colors: ['#F5F5DC', '#FFF8DC', '#FFEBCD'],  // Pale off-white
            parallaxSpeed: 0
        },
        // Distant mountains - Light beige with jagged peaks
        {
            type: 'mountain',
            yPosition: 0.6,
            height: 0.15,
            colors: ['#F5DEB3', '#DEB887'],  // Light beige mountains
            parallaxSpeed: 0.05
        },
        // Mid-ground dunes - Medium orange-red
        {
            type: 'dune',
            yPosition: 0.7,
            height: 0.2,
            colors: ['#CD853F', '#D2691E', '#FF6347'],  // Sandy brown to orange-red
            parallaxSpeed: 0.12
        },
        // Foreground dunes - Vibrant orange-red
        {
            type: 'dune',
            yPosition: 0.8,
            height: 0.2,
            colors: ['#FF4500', '#FF6347', '#FF7F50'],  // Orange-red to coral
            parallaxSpeed: 0.2
        }
    ],
    ambientElements: [
        { type: 'cloud', count: 3, speed: 0.1, size: 110 },
        { type: 'bird', count: 2, speed: 0.4, size: 14 },
        { type: 'palm', count: 2, speed: 0, size: 40 },
        { type: 'camel', count: 1, speed: 0.15, size: 35 },
        { type: 'sparkle', count: 20, speed: 0.3, size: 2 }  // Stars/dust particles
    ]
};

export const LANDSCAPE_BACKGROUNDS = {
    sunnyMeadow: SUNNY_MEADOW,
    mistyMountains: MISTY_MOUNTAINS,
    sunsetPeaks: SUNSET_PEAKS
};
