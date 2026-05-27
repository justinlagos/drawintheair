/**
 * Building Mode — completion animation registry.
 *
 * Each animator is a pure render function that paints onto the canvas
 * given an elapsed time. Returns `true` while running, `false` once the
 * animation has finished — the caller drives the FSM out of `completion`
 * on the first `false`.
 *
 * Phase 0 ships one animator: the flower-vase bloom. New animators slot
 * into `COMPLETION_ANIMATORS` keyed by `BuildObject.completionAnimationId`.
 */

import { normalizedToCanvas } from '../../../core/coordinateUtils';
import type { BuildObject } from './buildingTypes';

export type CompletionAnimator = (
    ctx: CanvasRenderingContext2D,
    elapsedMs: number,
    width: number,
    height: number,
    object: BuildObject,
) => boolean;

// ─── Animator: flower-vase bloom ──────────────────────────────────────
// The vase + stem + leaf stay where they were placed; the two petals
// pulse outward and a corona of additional petals fades in. Total
// duration ~4500ms — within the 11ms-per-frame render budget at 60fps.

const BLOOM_DURATION_MS = 4500;

const flowerVaseBloom: CompletionAnimator = (ctx, t, width, height, object) => {
    const progress = Math.min(1, t / BLOOM_DURATION_MS);

    // Find the petal zones so we can centre the bloom on them.
    const left = object.snapZones.find(z => z.id === 'zone-petal-left');
    const right = object.snapZones.find(z => z.id === 'zone-petal-right');
    if (!left || !right) return progress < 1;

    const centreNorm = {
        x: (left.cx + right.cx) / 2,
        y: (left.cy + right.cy) / 2,
    };
    const centre = normalizedToCanvas(centreNorm, width, height);

    // Soft halo behind the bloom — fades up over first 30% then holds.
    const haloR = Math.min(width, height) * (0.18 + progress * 0.05);
    ctx.save();
    ctx.globalAlpha = easeOutQuad(Math.min(1, progress / 0.3)) * 0.45;
    const haloGrad = ctx.createRadialGradient(
        centre.x, centre.y, 0,
        centre.x, centre.y, haloR,
    );
    haloGrad.addColorStop(0, '#FFD84D');
    haloGrad.addColorStop(0.5, 'rgba(255, 216, 77, 0.35)');
    haloGrad.addColorStop(1, 'rgba(255, 216, 77, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Corona petals — 6 of them, fade and scale in staggered.
    const petalColors = ['#FF6B6B', '#FFD84D', '#FF8C42', '#FF6B6B', '#FFD84D', '#FF8C42'];
    const baseR = Math.min(width, height) * 0.055;
    const orbitR = Math.min(width, height) * 0.075 * progress;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + progress * 0.5;
        const stagger = Math.max(0, Math.min(1, (progress - i * 0.06) * 2.5));
        if (stagger <= 0) continue;
        const px = centre.x + Math.cos(angle) * orbitR;
        const py = centre.y + Math.sin(angle) * orbitR;
        const r = baseR * easeOutBack(stagger);

        ctx.save();
        ctx.globalAlpha = stagger;
        ctx.translate(px, py);
        ctx.rotate(angle);
        // soft drop shadow under petal
        ctx.fillStyle = 'rgba(40, 30, 80, 0.18)';
        ctx.beginPath();
        ctx.ellipse(2, r * 0.5, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // petal body
        const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
        grad.addColorStop(0, petalColors[i]);
        grad.addColorStop(1, petalColors[i] + 'AA');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        // top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.2, -r * 0.18, r * 0.4, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Sparkles — only after 60% progress so the bloom has settled first.
    if (progress > 0.6) {
        const sparkleProgress = (progress - 0.6) / 0.4;
        const sparkleCount = Math.floor(sparkleProgress * 12);
        ctx.save();
        ctx.fillStyle = '#FFD84D';
        for (let i = 0; i < sparkleCount; i++) {
            const ang = (i / 12) * Math.PI * 2 + sparkleProgress * Math.PI;
            const dist = haloR * (0.4 + ((i % 3) * 0.18));
            const sx = centre.x + Math.cos(ang) * dist;
            const sy = centre.y + Math.sin(ang) * dist - sparkleProgress * 20;
            const ss = 4 + (i % 3) * 2;
            ctx.globalAlpha = 1 - sparkleProgress * 0.4;
            ctx.beginPath();
            ctx.moveTo(sx, sy - ss);
            ctx.lineTo(sx + ss * 0.4, sy - ss * 0.4);
            ctx.lineTo(sx + ss, sy);
            ctx.lineTo(sx + ss * 0.4, sy + ss * 0.4);
            ctx.lineTo(sx, sy + ss);
            ctx.lineTo(sx - ss * 0.4, sy + ss * 0.4);
            ctx.lineTo(sx - ss, sy);
            ctx.lineTo(sx - ss * 0.4, sy - ss * 0.4);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    return progress < 1;
};

// ─── Easing helpers ───────────────────────────────────────────────────

function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

function easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ─── Registry ─────────────────────────────────────────────────────────

export const COMPLETION_ANIMATORS: Record<string, CompletionAnimator> = {
    'flower-vase-bloom': flowerVaseBloom,
};

/** Returns the animator for a given id, or null if not registered. */
export function getCompletionAnimator(id: string): CompletionAnimator | null {
    return COMPLETION_ANIMATORS[id] ?? null;
}
