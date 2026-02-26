/**
 * Lightweight Physics Helper for Sorting Garden
 * 
 * Provides simple physics simulation for grab & carry mechanics:
 * - Inertia when moving objects
 * - Haptic weight (heavy vs light objects move at different speeds)
 * - Smooth easing and momentum
 */

export type ObjectWeight = 'light' | 'medium' | 'heavy';

export interface PhysicsObject {
    x: number;
    y: number;
    vx: number;  // Velocity X
    vy: number;  // Velocity Y
    weight: ObjectWeight;
    targetX?: number;  // Optional target for snapping
    targetY?: number;
}

interface PhysicsConfig {
    friction: number;           // Friction coefficient (0-1)
    maxSpeed: number;           // Maximum velocity
    snapDistance: number;       // Distance threshold for snapping
    snapEasing: number;         // Easing strength for snapping (0-1)
    weightMultipliers: {        // Speed multipliers by weight
        light: number;
        medium: number;
        heavy: number;
    };
}

const DEFAULT_CONFIG: PhysicsConfig = {
    friction: 0.85,             // High friction for natural feel
    maxSpeed: 0.02,             // Max normalized velocity
    snapDistance: 0.05,         // 5% of screen for snap
    snapEasing: 0.15,           // Smooth snap
    weightMultipliers: {
        light: 1.2,             // Light objects move 20% faster
        medium: 1.0,            // Medium objects at normal speed
        heavy: 0.6              // Heavy objects move 40% slower
    }
};

export class PhysicsHelper {
    private config: PhysicsConfig;

    constructor(config: Partial<PhysicsConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Update physics object position based on velocity and weight
     */
    updateObject(obj: PhysicsObject, deltaTime: number = 16.67): void {
        // Apply weight-based speed multiplier
        const weightMultiplier = this.config.weightMultipliers[obj.weight];
        const effectiveVx = obj.vx * weightMultiplier;
        const effectiveVy = obj.vy * weightMultiplier;

        // Apply friction
        obj.vx *= this.config.friction;
        obj.vy *= this.config.friction;

        // Clamp velocity to max speed
        const speed = Math.hypot(obj.vx, obj.vy);
        if (speed > this.config.maxSpeed) {
            const scale = this.config.maxSpeed / speed;
            obj.vx *= scale;
            obj.vy *= scale;
        }

        // Update position
        obj.x += effectiveVx * (deltaTime / 16.67);
        obj.y += effectiveVy * (deltaTime / 16.67);

        // Handle snapping to target if set
        if (obj.targetX !== undefined && obj.targetY !== undefined) {
            const dx = obj.targetX - obj.x;
            const dy = obj.targetY - obj.y;
            const distance = Math.hypot(dx, dy);

            if (distance < this.config.snapDistance) {
                // Ease towards target
                obj.x += dx * this.config.snapEasing;
                obj.y += dy * this.config.snapEasing;

                // Stop if very close
                if (distance < 0.01) {
                    obj.x = obj.targetX;
                    obj.y = obj.targetY;
                    obj.vx = 0;
                    obj.vy = 0;
                    obj.targetX = undefined;
                    obj.targetY = undefined;
                }
            }
        }
    }

    /**
     * Apply force to object (e.g., from user dragging)
     */
    applyForce(obj: PhysicsObject, fx: number, fy: number): void {
        // Force is scaled by weight (heavier objects need more force)
        const weightResistance = obj.weight === 'heavy' ? 0.7 : obj.weight === 'medium' ? 1.0 : 1.3;
        
        obj.vx += fx * weightResistance;
        obj.vy += fy * weightResistance;
    }

    /**
     * Set target position for snapping (e.g., to a zone)
     */
    setTarget(obj: PhysicsObject, targetX: number, targetY: number): void {
        obj.targetX = targetX;
        obj.targetY = targetY;
    }

    /**
     * Clear target (stop snapping)
     */
    clearTarget(obj: PhysicsObject): void {
        obj.targetX = undefined;
        obj.targetY = undefined;
    }

    /**
     * Get weight multiplier for an object
     */
    getWeightMultiplier(weight: ObjectWeight): number {
        return this.config.weightMultipliers[weight];
    }

    /**
     * Check if object is at rest (velocity below threshold)
     */
    isAtRest(obj: PhysicsObject, threshold: number = 0.001): boolean {
        return Math.hypot(obj.vx, obj.vy) < threshold;
    }
}
