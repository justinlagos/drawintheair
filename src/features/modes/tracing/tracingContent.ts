/**
 * Tracing Content - All Packs and Levels
 * 
 * Pack 1: Warm-up Lines (6 activities)
 * Pack 2: Shapes (6 activities)
 * Pack 3: Letters A-Z (26 activities)
 * Pack 4: Numbers 1-9 (9 activities)
 */

export interface PathPoint {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
}

export interface TracingPath {
    id: string;
    name: string;
    pack: number;
    level: number;
    points: PathPoint[];
    tolerancePx: number; // Path width tolerance in pixels (scaled by canvas)
    completionPercent: number; // Required completion (0-1)
    assistStrength: number; // Assist attraction (0-1)
}

// Helper to center and scale points (smaller, better centered for tracing)
const center = (points: PathPoint[], width: number = 0.18, height: number = 0.18): PathPoint[] => {
    const offsetX = 0.5 - width / 2;
    const offsetY = 0.5 - height / 2;
    return points.map(p => ({
        x: offsetX + p.x * width,
        y: offsetY + p.y * height
    }));
};


// Helper to create circle points in local 0-1 coordinate space (centered at 0.5, 0.5)
// The result will be scaled and centered by the center() function
const circle = (cx: number, cy: number, r: number, segments: number = 40): PathPoint[] => {
    const points: PathPoint[] = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r
        });
    }
    return points;
};

// Pack 1: Warm-up Lines (6 activities - one of each type, each with 3 variations via different start positions)
// Note: Requirement says "6 activities" and "Each activity has 3 variations"
// This means 6 types × 3 variations = 18 total activities, or 6 activities total with 3 variations each
// Going with 6 activities total (one of each type) for simpler progression
const createWarmupPack = (): TracingPath[] => {
    const paths: TracingPath[] = [];
    let level = 1;
    
    // Horizontal line (centered and scaled - 25% of screen)
    paths.push({
        id: 'warmup-h1',
        name: 'Horizontal Line',
        pack: 1,
        level: level++,
        points: center([
            { x: 0, y: 0.5 },
            { x: 1, y: 0.5 }
        ]),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    // Vertical line (centered and scaled)
    paths.push({
        id: 'warmup-v1',
        name: 'Vertical Line',
        pack: 1,
        level: level++,
        points: center([
            { x: 0.5, y: 0 },
            { x: 0.5, y: 1 }
        ]),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    // Diagonal left (top-left to bottom-right, centered and scaled)
    paths.push({
        id: 'warmup-dl1',
        name: 'Diagonal Left',
        pack: 1,
        level: level++,
        points: center([
            { x: 0, y: 0 },
            { x: 1, y: 1 }
        ]),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    // Diagonal right (top-right to bottom-left, centered and scaled)
    paths.push({
        id: 'warmup-dr1',
        name: 'Diagonal Right',
        pack: 1,
        level: level++,
        points: center([
            { x: 1, y: 0 },
            { x: 0, y: 1 }
        ]),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    // Zigzag (centered and scaled)
    paths.push({
        id: 'warmup-zigzag1',
        name: 'Zigzag',
        pack: 1,
        level: level++,
        points: center([
            { x: 0, y: 0.5 },
            { x: 0.3, y: 0.3 },
            { x: 0.5, y: 0.5 },
            { x: 0.7, y: 0.3 },
            { x: 1, y: 0.5 }
        ]),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    // Gentle curve (centered and scaled)
    const curvePoints: PathPoint[] = [];
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        curvePoints.push({
            x: t, // 0 to 1
            y: 0.5 + Math.sin(t * Math.PI) * 0.15 // Curve amplitude
        });
    }
    paths.push({
        id: 'warmup-curve1',
        name: 'Gentle Curve',
        pack: 1,
        level: level++,
        points: center(curvePoints),
        tolerancePx: 24, // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.82, // Reduced from 0.85 (softer completion)
        assistStrength: 0.65 // Slightly increased assist
    });
    
    return paths;
};

// Pack 2: Shapes (6 activities)
const createShapesPack = (): TracingPath[] => {
    const paths: TracingPath[] = [];
    let level = 1;
    
    // Circle (using normalized coordinates for proper centering)
    paths.push({
        id: 'shape-circle',
        name: 'Circle',
        pack: 2,
        level: level++,
        points: center(circle(0.5, 0.5, 0.5, 40)), // Radius 0.5 for full normalized space
        tolerancePx: 18, // Reduced for less bold appearance // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.85, // Reduced from 0.88 (softer completion)
        assistStrength: 0.55 // Slightly increased assist
    });
    
    // Square
    paths.push({
        id: 'shape-square',
        name: 'Square',
        pack: 2,
        level: level++,
        points: center([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
            { x: 0, y: 0 }
        ]),
        tolerancePx: 18, // Reduced for less bold appearance // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.85, // Reduced from 0.88 (softer completion)
        assistStrength: 0.55 // Slightly increased assist
    });
    
    // Triangle
    paths.push({
        id: 'shape-triangle',
        name: 'Triangle',
        pack: 2,
        level: level++,
        points: center([
            { x: 0.5, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
            { x: 0.5, y: 0 }
        ]),
        tolerancePx: 18, // Reduced for less bold appearance // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.85, // Reduced from 0.88 (softer completion)
        assistStrength: 0.55 // Slightly increased assist
    });
    
    // Rectangle
    paths.push({
        id: 'shape-rectangle',
        name: 'Rectangle',
        pack: 2,
        level: level++,
        points: center([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 0.7 },
            { x: 0, y: 0.7 },
            { x: 0, y: 0 }
        ]),
        tolerancePx: 18, // Reduced for less bold appearance // Reduced for less bold appearance while maintaining playability
        completionPercent: 0.85, // Reduced from 0.88 (softer completion)
        assistStrength: 0.55 // Slightly increased assist
    });
    
    // Spiral (converted to normalized coordinates, then centered and scaled)
    const spiralPoints: PathPoint[] = [];
    for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const angle = t * Math.PI * 4;
        const radius = t * 0.4; // Normalized radius 0 to 0.4 (will be scaled by center function)
        spiralPoints.push({
            x: 0.5 + Math.cos(angle) * radius, // Normalized 0-1 space
            y: 0.5 + Math.sin(angle) * radius
        });
    }
    paths.push({
        id: 'shape-spiral',
        name: 'Spiral',
        pack: 2,
        level: level++,
        points: center(spiralPoints),
        tolerancePx: 18, // Reduced for less bold appearance
        completionPercent: 0.90,
        assistStrength: 0.4
    });
    
    // Figure 8 (already normalized, just needs proper centering)
    const figure8Points: PathPoint[] = [];
    for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const angle = t * Math.PI * 4;
        const radius = 0.2 * (1 + Math.sin(angle)); // Normalized radius
        const x = 0.5 + Math.cos(angle) * radius; // Normalized 0-1 space
        const y = 0.5 + Math.sin(angle * 2) * radius;
        figure8Points.push({ x, y });
    }
    paths.push({
        id: 'shape-figure8',
        name: 'Figure 8',
        pack: 2,
        level: level++,
        points: center(figure8Points),
        tolerancePx: 18, // Reduced for less bold appearance
        completionPercent: 0.90,
        assistStrength: 0.4
    });
    
    return paths;
};

// Pack 3: Letters A-Z (26 activities)
const createLettersPack = (): TracingPath[] => {
    const paths: TracingPath[] = [];
    let level = 1;
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Import or create letter paths
    // For now, using simplified single-stroke approximations
    const createLetterPath = (letter: string): PathPoint[] => {
        switch (letter) {
            case 'A': return center([
                { x: 0.2, y: 1.0 },
                { x: 0.5, y: 0.0 },
                { x: 0.8, y: 1.0 },
                { x: 0.3, y: 0.5 },
                { x: 0.7, y: 0.5 }
            ]);
            case 'B': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.6, y: 1.0 },
                { x: 0.8, y: 0.8 },
                { x: 0.8, y: 0.6 },
                { x: 0.6, y: 0.5 },
                { x: 0.8, y: 0.4 },
                { x: 0.8, y: 0.2 },
                { x: 0.6, y: 0.0 },
                { x: 0.0, y: 0.0 }
            ]);
            case 'C': return center([
                { x: 0.8, y: 0.2 },
                { x: 0.6, y: 0.0 },
                { x: 0.2, y: 0.0 },
                { x: 0.0, y: 0.2 },
                { x: 0.0, y: 0.8 },
                { x: 0.2, y: 1.0 },
                { x: 0.6, y: 1.0 },
                { x: 0.8, y: 0.8 }
            ]);
            case 'D': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.6, y: 1.0 },
                { x: 0.9, y: 0.7 },
                { x: 0.9, y: 0.3 },
                { x: 0.6, y: 0.0 },
                { x: 0.0, y: 0.0 }
            ]);
            case 'E': return center([
                { x: 0.8, y: 0.0 },
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.8, y: 1.0 },
                { x: 0.0, y: 0.5 },
                { x: 0.6, y: 0.5 }
            ]);
            case 'F': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.5 },
                { x: 0.6, y: 0.5 },
                { x: 0.0, y: 0.0 },
                { x: 0.8, y: 0.0 }
            ]);
            case 'G': return center([
                { x: 0.8, y: 0.2 },
                { x: 0.6, y: 0.0 },
                { x: 0.2, y: 0.0 },
                { x: 0.0, y: 0.2 },
                { x: 0.0, y: 0.8 },
                { x: 0.2, y: 1.0 },
                { x: 0.6, y: 1.0 },
                { x: 0.8, y: 0.8 },
                { x: 0.8, y: 0.5 },
                { x: 0.5, y: 0.5 }
            ]);
            case 'H': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.5 },
                { x: 1.0, y: 0.5 },
                { x: 1.0, y: 0.0 },
                { x: 1.0, y: 1.0 }
            ]);
            case 'I': return center([
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 0.0 },
                { x: 0.5, y: 0.0 },
                { x: 0.5, y: 1.0 },
                { x: 0.0, y: 1.0 },
                { x: 1.0, y: 1.0 }
            ]);
            case 'J': return center([
                { x: 0.5, y: 0.0 },
                { x: 0.5, y: 0.9 },
                { x: 0.2, y: 1.0 },
                { x: 0.0, y: 0.8 }
            ]);
            case 'K': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.5 },
                { x: 1.0, y: 0.0 },
                { x: 0.0, y: 0.5 },
                { x: 1.0, y: 1.0 }
            ]);
            case 'L': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 0.8, y: 1.0 }
            ]);
            case 'M': return center([
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.0 },
                { x: 0.5, y: 0.5 },
                { x: 1.0, y: 0.0 },
                { x: 1.0, y: 1.0 }
            ]);
            case 'N': return center([
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 1.0 },
                { x: 1.0, y: 0.0 }
            ]);
            case 'O': return center(circle(0.5, 0.5, 0.5, 40)); // Radius 0.5 for full normalized space
            case 'P': return center([
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.0 },
                { x: 0.6, y: 0.0 },
                { x: 0.8, y: 0.2 },
                { x: 0.8, y: 0.4 },
                { x: 0.6, y: 0.5 },
                { x: 0.0, y: 0.5 }
            ]);
            case 'Q': return center([
                ...circle(0.5, 0.5, 0.5, 40), // Radius 0.5 for full normalized space
                { x: 0.6, y: 0.6 },
                { x: 0.9, y: 0.9 }
            ]);
            case 'R': return center([
                { x: 0.0, y: 1.0 },
                { x: 0.0, y: 0.0 },
                { x: 0.6, y: 0.0 },
                { x: 0.8, y: 0.2 },
                { x: 0.8, y: 0.4 },
                { x: 0.6, y: 0.5 },
                { x: 0.0, y: 0.5 },
                { x: 0.7, y: 1.0 }
            ]);
            case 'S': return center([
                { x: 0.8, y: 0.2 },
                { x: 0.6, y: 0.0 },
                { x: 0.2, y: 0.0 },
                { x: 0.0, y: 0.2 },
                { x: 0.0, y: 0.4 },
                { x: 0.2, y: 0.5 },
                { x: 0.8, y: 0.5 },
                { x: 1.0, y: 0.6 },
                { x: 1.0, y: 0.8 },
                { x: 0.8, y: 1.0 },
                { x: 0.2, y: 1.0 },
                { x: 0.0, y: 0.8 }
            ]);
            case 'T': return center([
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 0.0 },
                { x: 0.5, y: 0.0 },
                { x: 0.5, y: 1.0 }
            ]);
            case 'U': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 0.8 },
                { x: 0.2, y: 1.0 },
                { x: 0.8, y: 1.0 },
                { x: 1.0, y: 0.8 },
                { x: 1.0, y: 0.0 }
            ]);
            case 'V': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.5, y: 1.0 },
                { x: 1.0, y: 0.0 }
            ]);
            case 'W': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.25, y: 1.0 },
                { x: 0.5, y: 0.5 },
                { x: 0.75, y: 1.0 },
                { x: 1.0, y: 0.0 }
            ]);
            case 'X': return center([
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 1.0 },
                { x: 0.0, y: 1.0 },
                { x: 1.0, y: 0.0 }
            ]);
            case 'Y': return center([
                { x: 0.0, y: 0.0 },
                { x: 0.5, y: 0.5 },
                { x: 1.0, y: 0.0 },
                { x: 0.5, y: 0.5 },
                { x: 0.5, y: 1.0 }
            ]);
            case 'Z': return center([
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 0.0 },
                { x: 0.0, y: 1.0 },
                { x: 1.0, y: 1.0 }
            ]);
            default: return [{ x: 0.5, y: 0.5 }];
        }
    };
    
    for (const letter of letters) {
        paths.push({
            id: `letter-${letter}`,
            name: letter,
            pack: 3,
            level: level++,
            points: createLetterPath(letter),
            tolerancePx: level <= 10 ? 18 : 16, // Reduced for less bold appearance
            completionPercent: level <= 10 ? 0.88 : 0.90, // Higher completion requirement
            assistStrength: level <= 10 ? 0.5 : 0.4 // Less assist for more accuracy
        });
    }
    
    return paths;
};

// Pack 4: Numbers 1-9 (9 activities)
const createNumbersPack = (): TracingPath[] => {
    const paths: TracingPath[] = [];
    let level = 1;
    
    const createNumberPath = (num: number): PathPoint[] => {
        switch (num) {
            case 1: return center([
                { x: 0.5, y: 0.0 },
                { x: 0.5, y: 1.0 }
            ]);
            case 2: return center([
                { x: 0.0, y: 0.2 },
                { x: 0.3, y: 0.0 },
                { x: 0.8, y: 0.0 },
                { x: 1.0, y: 0.2 },
                { x: 1.0, y: 0.4 },
                { x: 0.0, y: 1.0 },
                { x: 1.0, y: 1.0 }
            ]);
            case 3: return center([
                { x: 0.0, y: 0.2 },
                { x: 0.3, y: 0.0 },
                { x: 0.7, y: 0.0 },
                { x: 1.0, y: 0.2 },
                { x: 1.0, y: 0.4 },
                { x: 0.7, y: 0.5 },
                { x: 1.0, y: 0.6 },
                { x: 1.0, y: 0.8 },
                { x: 0.7, y: 1.0 },
                { x: 0.3, y: 1.0 },
                { x: 0.0, y: 0.8 }
            ]);
            case 4: return center([
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 0.5 },
                { x: 1.0, y: 0.5 },
                { x: 1.0, y: 0.0 },
                { x: 1.0, y: 1.0 }
            ]);
            case 5: return center([
                { x: 1.0, y: 0.0 },
                { x: 0.0, y: 0.0 },
                { x: 0.0, y: 0.5 },
                { x: 0.8, y: 0.5 },
                { x: 1.0, y: 0.6 },
                { x: 1.0, y: 0.8 },
                { x: 0.8, y: 1.0 },
                { x: 0.2, y: 1.0 },
                { x: 0.0, y: 0.8 }
            ]);
            case 6: return center([
                { x: 0.8, y: 0.2 },
                { x: 0.6, y: 0.0 },
                { x: 0.2, y: 0.0 },
                { x: 0.0, y: 0.2 },
                { x: 0.0, y: 1.0 },
                { x: 0.8, y: 1.0 },
                { x: 1.0, y: 0.8 },
                { x: 1.0, y: 0.6 },
                { x: 0.8, y: 0.5 },
                { x: 0.2, y: 0.5 }
            ]);
            case 7: return center([
                { x: 0.0, y: 0.0 },
                { x: 1.0, y: 0.0 },
                { x: 0.5, y: 1.0 }
            ]);
            case 8: return center([
                { x: 0.3, y: 0.2 },
                { x: 0.0, y: 0.4 },
                { x: 0.0, y: 0.6 },
                { x: 0.3, y: 0.8 },
                { x: 0.7, y: 0.8 },
                { x: 1.0, y: 0.6 },
                { x: 1.0, y: 0.4 },
                { x: 0.7, y: 0.2 },
                { x: 0.3, y: 0.2 },
                { x: 0.0, y: 0.4 },
                { x: 0.3, y: 0.5 },
                { x: 0.7, y: 0.5 },
                { x: 1.0, y: 0.6 },
                { x: 0.7, y: 0.8 }
            ]);
            case 9: return center([
                { x: 1.0, y: 0.2 },
                { x: 0.8, y: 0.0 },
                { x: 0.2, y: 0.0 },
                { x: 0.0, y: 0.2 },
                { x: 0.0, y: 0.8 },
                { x: 0.2, y: 1.0 },
                { x: 0.8, y: 1.0 },
                { x: 1.0, y: 0.8 },
                { x: 1.0, y: 0.6 },
                { x: 0.8, y: 0.5 },
                { x: 0.2, y: 0.5 },
                { x: 0.0, y: 0.2 }
            ]);
            default: return [{ x: 0.5, y: 0.5 }];
        }
    };
    
    for (let num = 1; num <= 9; num++) {
        paths.push({
            id: `number-${num}`,
            name: num.toString(),
            pack: 4,
            level: level++,
            points: createNumberPath(num),
            tolerancePx: 18, // Reduced for less bold appearance
            completionPercent: 0.90,
            assistStrength: 0.4
        });
    }
    
    return paths;
};

// Combine all packs
export const createAllTracingPaths = (): TracingPath[] => {
    return [
        ...createWarmupPack(),
        ...createShapesPack(),
        ...createLettersPack(),
        ...createNumbersPack()
    ];
};

// Get all paths
export const ALL_TRACING_PATHS = createAllTracingPaths();

// Get paths by pack
export const getPathsByPack = (pack: number): TracingPath[] => {
    return ALL_TRACING_PATHS.filter(p => p.pack === pack);
};

// Get path by ID
export const getPathById = (id: string): TracingPath | undefined => {
    return ALL_TRACING_PATHS.find(p => p.id === id);
};

// Get pack info
export const PACK_INFO = {
    1: { name: 'Warm-up Lines', icon: '📏', description: 'Simple lines to get started' },
    2: { name: 'Shapes', icon: '🔷', description: 'Circles, squares, and more' },
    3: { name: 'Letters', icon: '🔤', description: 'A to Z' },
    4: { name: 'Numbers', icon: '🔢', description: '1 to 9' }
};
