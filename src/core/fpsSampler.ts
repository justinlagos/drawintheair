/**
 * FPS Sampler — Lightweight, zero-overhead when disabled
 *
 * Usage: import { fpsSampler } from './fpsSampler'; fpsSampler.start();
 *
 * Enabled via ?debugPerf=1 URL param only.
 * Samples frame time via rAF, computes rolling FPS once/second,
 * updates a single DOM element directly (no React rerenders).
 */

const DEBUG = (() => {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('debugPerf') === '1';
    } catch {
        return false;
    }
})();

class FPSSampler {
    private frameCount = 0;
    private lastTimestamp = 0;
    private rafId: number | null = null;
    private el: HTMLDivElement | null = null;
    private running = false;

    /** Start sampling. No-op if DEBUG is false. */
    start(): void {
        if (!DEBUG || this.running) return;
        this.running = true;
        this.createLabel();
        this.lastTimestamp = performance.now();
        this.frameCount = 0;
        this.tick();
    }

    /** Stop sampling and remove label. */
    stop(): void {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
            this.el = null;
        }
    }

    /** Whether the sampler is active (DEBUG enabled). */
    get active(): boolean {
        return DEBUG;
    }

    private tick = (): void => {
        if (!this.running) return;
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastTimestamp;

        if (elapsed >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastTimestamp = now;
            this.updateLabel(fps);
        }

        this.rafId = requestAnimationFrame(this.tick);
    };

    private createLabel(): void {
        if (this.el) return;
        const el = document.createElement('div');
        el.id = 'fps-debug-label';
        el.style.cssText = `
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 99999;
      pointer-events: none;
      font-family: monospace;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.7);
      color: #4ade80;
      line-height: 1;
      opacity: 0.85;
    `;
        el.textContent = 'FPS: --';
        document.body.appendChild(el);
        this.el = el;
    }

    private updateLabel(fps: number): void {
        if (!this.el) return;
        const color = fps >= 55 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#ef4444';
        this.el.style.color = color;
        this.el.textContent = `FPS: ${fps}`;
    }
}

export const fpsSampler = new FPSSampler();
