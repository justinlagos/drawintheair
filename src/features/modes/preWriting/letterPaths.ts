/**
 * Letter Path Definitions for Tracing
 * 
 * Simple single-stroke approximations for A-Z.
 * Each letter is defined as a series of normalized points (0-1).
 * Letters are centered and scaled to fit a reasonable tracing area.
 */

export interface PathPoint {
    x: number; // 0-1, where 0 is left, 1 is right
    y: number; // 0-1, where 0 is top, 1 is bottom
}

export interface LetterPath {
    letter: string;
    points: PathPoint[];
}

/**
 * Generate letter paths
 * Using simple approximations - can be refined later
 */
function createLetterPaths(): Record<string, LetterPath> {
    const letters: Record<string, LetterPath> = {};

    // Helper to center and scale points
    const center = (points: PathPoint[], width: number = 0.4, height: number = 0.4): PathPoint[] => {
        const offsetX = 0.5 - width / 2;
        const offsetY = 0.5 - height / 2;
        return points.map(p => ({
            x: offsetX + p.x * width,
            y: offsetY + p.y * height
        }));
    };

    // A
    letters.A = {
        letter: 'A',
        points: center([
            { x: 0.2, y: 1.0 }, // Bottom left
            { x: 0.5, y: 0.0 }, // Top center
            { x: 0.8, y: 1.0 }, // Bottom right
            { x: 0.3, y: 0.5 }, // Crossbar left
            { x: 0.7, y: 0.5 }  // Crossbar right
        ])
    };

    // B
    letters.B = {
        letter: 'B',
        points: center([
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
        ])
    };

    // C
    letters.C = {
        letter: 'C',
        points: center([
            { x: 0.8, y: 0.2 },
            { x: 0.6, y: 0.0 },
            { x: 0.2, y: 0.0 },
            { x: 0.0, y: 0.2 },
            { x: 0.0, y: 0.8 },
            { x: 0.2, y: 1.0 },
            { x: 0.6, y: 1.0 },
            { x: 0.8, y: 0.8 }
        ])
    };

    // D
    letters.D = {
        letter: 'D',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.6, y: 1.0 },
            { x: 0.9, y: 0.7 },
            { x: 0.9, y: 0.3 },
            { x: 0.6, y: 0.0 },
            { x: 0.0, y: 0.0 }
        ])
    };

    // E
    letters.E = {
        letter: 'E',
        points: center([
            { x: 0.8, y: 0.0 },
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.8, y: 1.0 },
            { x: 0.0, y: 0.5 },
            { x: 0.7, y: 0.5 }
        ])
    };

    // F
    letters.F = {
        letter: 'F',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.8, y: 1.0 },
            { x: 0.0, y: 0.5 },
            { x: 0.7, y: 0.5 }
        ])
    };

    // G
    letters.G = {
        letter: 'G',
        points: center([
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
        ])
    };

    // H
    letters.H = {
        letter: 'H',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.5 },
            { x: 0.8, y: 0.5 },
            { x: 0.8, y: 1.0 },
            { x: 0.8, y: 0.0 }
        ])
    };

    // I
    letters.I = {
        letter: 'I',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.8, y: 0.0 },
            { x: 0.4, y: 0.0 },
            { x: 0.4, y: 1.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.8, y: 1.0 }
        ])
    };

    // J
    letters.J = {
        letter: 'J',
        points: center([
            { x: 0.4, y: 0.0 },
            { x: 0.4, y: 0.8 },
            { x: 0.2, y: 1.0 },
            { x: 0.0, y: 0.9 }
        ])
    };

    // K
    letters.K = {
        letter: 'K',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.5 },
            { x: 0.8, y: 0.0 },
            { x: 0.0, y: 0.5 },
            { x: 0.8, y: 1.0 }
        ])
    };

    // L
    letters.L = {
        letter: 'L',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 0.8, y: 1.0 }
        ])
    };

    // M
    letters.M = {
        letter: 'M',
        points: center([
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.0 },
            { x: 0.5, y: 0.5 },
            { x: 1.0, y: 0.0 },
            { x: 1.0, y: 1.0 }
        ])
    };

    // N
    letters.N = {
        letter: 'N',
        points: center([
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.0 },
            { x: 1.0, y: 1.0 },
            { x: 1.0, y: 0.0 }
        ])
    };

    // O
    letters.O = {
        letter: 'O',
        points: center([
            { x: 0.3, y: 0.0 },
            { x: 0.0, y: 0.3 },
            { x: 0.0, y: 0.7 },
            { x: 0.3, y: 1.0 },
            { x: 0.7, y: 1.0 },
            { x: 1.0, y: 0.7 },
            { x: 1.0, y: 0.3 },
            { x: 0.7, y: 0.0 },
            { x: 0.3, y: 0.0 }
        ])
    };

    // P
    letters.P = {
        letter: 'P',
        points: center([
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.0 },
            { x: 0.6, y: 0.0 },
            { x: 0.8, y: 0.2 },
            { x: 0.8, y: 0.4 },
            { x: 0.6, y: 0.5 },
            { x: 0.0, y: 0.5 }
        ])
    };

    // Q
    letters.Q = {
        letter: 'Q',
        points: center([
            { x: 0.3, y: 0.0 },
            { x: 0.0, y: 0.3 },
            { x: 0.0, y: 0.7 },
            { x: 0.3, y: 1.0 },
            { x: 0.7, y: 1.0 },
            { x: 1.0, y: 0.7 },
            { x: 1.0, y: 0.3 },
            { x: 0.7, y: 0.0 },
            { x: 0.3, y: 0.0 },
            { x: 0.6, y: 0.6 },
            { x: 0.9, y: 0.9 }
        ])
    };

    // R
    letters.R = {
        letter: 'R',
        points: center([
            { x: 0.0, y: 1.0 },
            { x: 0.0, y: 0.0 },
            { x: 0.6, y: 0.0 },
            { x: 0.8, y: 0.2 },
            { x: 0.8, y: 0.4 },
            { x: 0.6, y: 0.5 },
            { x: 0.0, y: 0.5 },
            { x: 0.6, y: 0.5 },
            { x: 0.9, y: 1.0 }
        ])
    };

    // S
    letters.S = {
        letter: 'S',
        points: center([
            { x: 0.8, y: 0.2 },
            { x: 0.6, y: 0.0 },
            { x: 0.2, y: 0.0 },
            { x: 0.0, y: 0.2 },
            { x: 0.2, y: 0.4 },
            { x: 0.6, y: 0.5 },
            { x: 0.8, y: 0.6 },
            { x: 0.8, y: 0.8 },
            { x: 0.6, y: 1.0 },
            { x: 0.2, y: 1.0 },
            { x: 0.0, y: 0.8 }
        ])
    };

    // T
    letters.T = {
        letter: 'T',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 1.0, y: 0.0 },
            { x: 0.5, y: 0.0 },
            { x: 0.5, y: 1.0 }
        ])
    };

    // U
    letters.U = {
        letter: 'U',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.0, y: 0.8 },
            { x: 0.2, y: 1.0 },
            { x: 0.8, y: 1.0 },
            { x: 1.0, y: 0.8 },
            { x: 1.0, y: 0.0 }
        ])
    };

    // V
    letters.V = {
        letter: 'V',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.5, y: 1.0 },
            { x: 1.0, y: 0.0 }
        ])
    };

    // W
    letters.W = {
        letter: 'W',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.25, y: 1.0 },
            { x: 0.5, y: 0.5 },
            { x: 0.75, y: 1.0 },
            { x: 1.0, y: 0.0 }
        ])
    };

    // X
    letters.X = {
        letter: 'X',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 1.0, y: 1.0 },
            { x: 0.5, y: 0.5 },
            { x: 0.0, y: 1.0 },
            { x: 1.0, y: 0.0 }
        ])
    };

    // Y
    letters.Y = {
        letter: 'Y',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 0.5, y: 0.5 },
            { x: 1.0, y: 0.0 },
            { x: 0.5, y: 0.5 },
            { x: 0.5, y: 1.0 }
        ])
    };

    // Z
    letters.Z = {
        letter: 'Z',
        points: center([
            { x: 0.0, y: 0.0 },
            { x: 1.0, y: 0.0 },
            { x: 0.0, y: 1.0 },
            { x: 1.0, y: 1.0 }
        ])
    };

    return letters;
}

export const LETTER_PATHS = createLetterPaths();

/**
 * Get all available letters
 */
export function getAvailableLetters(): string[] {
    return Object.keys(LETTER_PATHS).sort();
}

/**
 * Get path for a specific letter
 */
export function getLetterPath(letter: string): LetterPath | null {
    return LETTER_PATHS[letter.toUpperCase()] || null;
}

