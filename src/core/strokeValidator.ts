/**
 * Stroke Validator for Sky Writer
 * 
 * Validates user strokes against predefined SVG paths:
 * - Calculates distance from user's pinch-point to path
 * - Implements 80% auto-complete with smooth lerp
 * - Provides feedback on stroke accuracy
 */

export interface PathPoint {
    x: number;
    y: number;
}

export interface StrokeValidationResult {
    isValid: boolean;
    distance: number;
    progress: number;  // 0 to 1
    closestPoint: PathPoint;
    shouldAutoComplete: boolean;
}

export class StrokeValidator {
    private path: PathPoint[] = [];
    private tolerance: number = 0.05;  // 5% of screen for tolerance
    private autoCompleteThreshold: number = 0.8;  // 80% completion triggers auto-complete

    constructor(path: PathPoint[], tolerance: number = 0.05) {
        this.path = path;
        this.tolerance = tolerance;
    }

    /**
     * Validate current position against path
     */
    validate(currentX: number, currentY: number, _currentProgress: number = 0): StrokeValidationResult {
        if (this.path.length === 0) {
            return {
                isValid: false,
                distance: Infinity,
                progress: 0,
                closestPoint: { x: currentX, y: currentY },
                shouldAutoComplete: false
            };
        }

        // Find closest point on path
        let minDistance = Infinity;
        let closestIndex = 0;
        let closestPoint: PathPoint = this.path[0];

        for (let i = 0; i < this.path.length; i++) {
            const point = this.path[i];
            const dx = currentX - point.x;
            const dy = currentY - point.y;
            const distance = Math.hypot(dx, dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
                closestPoint = point;
            }
        }

        // Calculate progress along path
        const progress = closestIndex / (this.path.length - 1);

        // Check if within tolerance
        const isValid = minDistance <= this.tolerance;

        // Check if should auto-complete (80% threshold)
        const shouldAutoComplete = progress >= this.autoCompleteThreshold && isValid;

        return {
            isValid,
            distance: minDistance,
            progress,
            closestPoint,
            shouldAutoComplete
        };
    }

    /**
     * Linear interpolation between two points
     */
    lerp(start: PathPoint, end: PathPoint, t: number): PathPoint {
        return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t
        };
    }

    /**
     * Auto-complete stroke by smoothly lerping to end of path
     */
    autoComplete(
        currentX: number,
        currentY: number,
        _currentProgress: number,
        lerpSpeed: number = 0.1
    ): PathPoint {
        if (this.path.length === 0) {
            return { x: currentX, y: currentY };
        }

        const endPoint = this.path[this.path.length - 1];
        const currentPoint = { x: currentX, y: currentY };

        // Lerp towards end point
        return this.lerp(currentPoint, endPoint, lerpSpeed);
    }

    /**
     * Get point at specific progress along path
     */
    getPointAtProgress(progress: number): PathPoint {
        if (this.path.length === 0) {
            return { x: 0.5, y: 0.5 };
        }

        const clampedProgress = Math.max(0, Math.min(1, progress));
        const index = clampedProgress * (this.path.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        const t = index - lowerIndex;

        const lowerPoint = this.path[lowerIndex];
        const upperPoint = this.path[Math.min(upperIndex, this.path.length - 1)];

        return this.lerp(lowerPoint, upperPoint, t);
    }

    /**
     * Set new path
     */
    setPath(path: PathPoint[]): void {
        this.path = path;
    }

    /**
     * Get path length (for progress calculation)
     */
    getPathLength(): number {
        return this.path.length;
    }
}
