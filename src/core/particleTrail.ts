/**
 * Particle Trail System for Sky Writer
 * 
 * Creates glowing cloud particles that dissipate like vapor when movement stops.
 * Encourages steady flow by making particles fade away if the child stops moving.
 */

export interface CloudParticle {
    x: number;
    y: number;
    vx: number;  // Velocity X
    vy: number;  // Velocity Y
    life: number; // 0 to 1, fades to 0
    size: number;
    glowIntensity: number; // 0 to 1
    createdAt: number;
}

interface ParticleTrailConfig {
    spawnRate: number;        // Particles per second when moving
    dissipationRate: number;  // Life decay per second when stopped
    minSize: number;
    maxSize: number;
    glowDecay: number;        // Glow intensity decay per second
    velocitySpread: number;   // Random velocity spread
    maxParticles: number;
}

const DEFAULT_CONFIG: ParticleTrailConfig = {
    spawnRate: 30,           // 30 particles per second
    dissipationRate: 0.5,    // Fade out in 2 seconds when stopped
    minSize: 8,
    maxSize: 24,
    glowDecay: 0.3,          // Glow fades faster
    velocitySpread: 0.002,
    maxParticles: 200
};

export class ParticleTrail {
    private particles: CloudParticle[] = [];
    private config: ParticleTrailConfig;
    private lastSpawnTime: number = 0;
    private lastPosition: { x: number; y: number } | null = null;
    private isMoving: boolean = false;
    private movementThreshold: number = 0.01; // Normalized distance threshold

    constructor(config: Partial<ParticleTrailConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Update particle system with current position
     */
    update(currentX: number, currentY: number, timestamp: number): void {
        // Detect movement
        if (this.lastPosition) {
            const dx = currentX - this.lastPosition.x;
            const dy = currentY - this.lastPosition.y;
            const distance = Math.hypot(dx, dy);
            this.isMoving = distance > this.movementThreshold;
        } else {
            this.isMoving = false;
        }

        this.lastPosition = { x: currentX, y: currentY };

        // Spawn particles when moving
        if (this.isMoving && this.lastSpawnTime > 0) {
            const timeSinceLastSpawn = timestamp - this.lastSpawnTime;
            const spawnInterval = 1000 / this.config.spawnRate;
            
            if (timeSinceLastSpawn >= spawnInterval) {
                this.spawnParticle(currentX, currentY, timestamp);
                this.lastSpawnTime = timestamp;
            }
        } else {
            this.lastSpawnTime = timestamp;
        }

        // Update existing particles
        this.particles = this.particles.filter(particle => {
            // Update life based on movement state
            if (this.isMoving) {
                // Normal decay when moving
                particle.life -= 0.016 / 2; // ~2 seconds at 60fps
            } else {
                // Faster dissipation when stopped
                particle.life -= (this.config.dissipationRate * 0.016); // Configurable rate
            }

            // Update glow intensity
            particle.glowIntensity -= this.config.glowDecay * 0.016;

            // Apply velocity
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Fade velocity (air resistance)
            particle.vx *= 0.98;
            particle.vy *= 0.98;

            // Remove if dead
            return particle.life > 0 && particle.glowIntensity > 0;
        });

        // Limit particle count
        if (this.particles.length > this.config.maxParticles) {
            this.particles = this.particles
                .sort((a, b) => a.life - b.life)
                .slice(-this.config.maxParticles);
        }
    }

    /**
     * Spawn a new cloud particle
     */
    private spawnParticle(x: number, y: number, timestamp: number): void {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * this.config.velocitySpread;
        
        this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            size: this.config.minSize + Math.random() * (this.config.maxSize - this.config.minSize),
            glowIntensity: 0.8 + Math.random() * 0.2,
            createdAt: timestamp
        });
    }

    /**
     * Render all particles to canvas
     */
    render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
        ctx.save();

        for (const particle of this.particles) {
            const alpha = particle.life * particle.glowIntensity;
            if (alpha <= 0) continue;

            const x = particle.x * width;
            const y = particle.y * height;

            // Draw glowing cloud particle
            ctx.globalAlpha = alpha * 0.6;
            
            // Outer glow
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
            gradient.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.4})`);
            gradient.addColorStop(0.6, `rgba(150, 180, 255, ${alpha * 0.2})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(x, y, particle.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Clear all particles
     */
    clear(): void {
        this.particles = [];
        this.lastPosition = null;
        this.lastSpawnTime = 0;
    }

    /**
     * Get particle count (for debugging)
     */
    getParticleCount(): number {
        return this.particles.length;
    }
}
