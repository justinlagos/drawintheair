/**
 * One Euro Filter - Low-latency smoothing filter
 * 
 * Provides adaptive smoothing: low latency for fast movements, 
 * high smoothing for slow movements (reduces jitter).
 * 
 * Based on: https://cristal.univ-lille.fr/~casiez/1euro/
 */

class LowPassFilter {
    private y: number | null = null;
    private s: number | null = null;

    filter(value: number, alpha: number): number {
        if (this.y === null) {
            this.y = value;
            this.s = value;
        } else {
            this.s = alpha * value + (1 - alpha) * this.s!;
            this.y = this.s;
        }
        return this.y;
    }

    lastValue(): number {
        return this.y ?? 0;
    }

    reset(): void {
        this.y = null;
        this.s = null;
    }
}

export interface OneEuroFilterConfig {
    /** Minimum cutoff frequency in Hz. Lower = more smoothing. Default: 1.0 */
    minCutoff: number;
    /** Speed coefficient. Higher = more responsive to fast movements. Default: 0.007 */
    beta: number;
    /** Cutoff frequency for derivative. Default: 1.0 */
    dCutoff: number;
}

const DEFAULT_CONFIG: OneEuroFilterConfig = {
    minCutoff: 1.0,
    beta: 0.007,
    dCutoff: 1.0
};

export class OneEuroFilter {
    private config: OneEuroFilterConfig;
    private xFilter: LowPassFilter;
    private dxFilter: LowPassFilter;
    private lastTime: number | null = null;
    private lastRawValue: number | null = null;

    constructor(config: Partial<OneEuroFilterConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.xFilter = new LowPassFilter();
        this.dxFilter = new LowPassFilter();
    }

    private alpha(cutoff: number, dt: number): number {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / dt);
    }

    filter(value: number, timestamp: number): number {
        if (this.lastTime === null || this.lastRawValue === null) {
            this.lastTime = timestamp;
            this.lastRawValue = value;
            this.xFilter.filter(value, 1.0);
            this.dxFilter.filter(0, 1.0);
            return value;
        }

        // Calculate time delta in seconds
        const dt = Math.max((timestamp - this.lastTime) / 1000, 0.001);
        this.lastTime = timestamp;

        // Estimate velocity (derivative)
        const dx = (value - this.lastRawValue) / dt;
        this.lastRawValue = value;

        // Filter the derivative
        const edx = this.dxFilter.filter(dx, this.alpha(this.config.dCutoff, dt));

        // Adaptive cutoff based on velocity
        const cutoff = this.config.minCutoff + this.config.beta * Math.abs(edx);

        // Filter the value
        return this.xFilter.filter(value, this.alpha(cutoff, dt));
    }

    reset(): void {
        this.xFilter.reset();
        this.dxFilter.reset();
        this.lastTime = null;
        this.lastRawValue = null;
    }
}

/**
 * 2D One Euro Filter for position smoothing
 */
export class OneEuroFilter2D {
    private xFilter: OneEuroFilter;
    private yFilter: OneEuroFilter;

    constructor(config: Partial<OneEuroFilterConfig> = {}) {
        this.xFilter = new OneEuroFilter(config);
        this.yFilter = new OneEuroFilter(config);
    }

    filter(x: number, y: number, timestamp: number): { x: number; y: number } {
        return {
            x: this.xFilter.filter(x, timestamp),
            y: this.yFilter.filter(y, timestamp)
        };
    }

    reset(): void {
        this.xFilter.reset();
        this.yFilter.reset();
    }
}

