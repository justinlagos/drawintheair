/**
 * GestureLayer — lets the hand cursor operate the UI "in the air".
 *
 * It reads the shared gesture pointer (published by the mode frame adapters),
 * draws a cursor, and selects any control marked `data-gesture`:
 *   • hover  → the control pops (via the [data-gesture-hover] attribute + CSS)
 *   • pinch  → immediate click
 *   • dwell  → holding the cursor on a control for ~0.9s clicks it (a ring fills)
 *
 * Pure overlay: pointer-events:none, so it never blocks mouse use. Works for
 * Magic Canvas (entry cards + dock) and Tracing (section cards + controls).
 */

import { useEffect, useRef } from 'react';
import { getGesturePointer } from '../core/gestureInput';

const DWELL_MS = 900;
const FRESH_MS = 250;       // hand considered present if seen within this window
const COOLDOWN_MS = 600;    // after any activation, ignore activations briefly
const RING_R = 22;

interface Props {
    enabled?: boolean;
}

export function GestureLayer({ enabled = true }: Props) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const ringRef = useRef<SVGCircleElement | null>(null);
    const hovered = useRef<HTMLElement | null>(null);
    const dwellStart = useRef(0);
    const pinchPrev = useRef(false);
    const lastActivate = useRef(0);

    useEffect(() => {
        if (!enabled) return;
        const circumference = 2 * Math.PI * RING_R;
        let raf = 0;

        const clearHover = () => {
            if (hovered.current) { hovered.current.removeAttribute('data-gesture-hover'); hovered.current = null; }
        };

        const activate = (el: HTMLElement) => {
            lastActivate.current = Date.now();
            dwellStart.current = Date.now();
            clearHover();
            // Defer so any state set by hover settles before the click handler runs.
            el.click();
        };

        const loop = () => {
            const gp = getGesturePointer();
            const fresh = gp.hasHand && Date.now() - gp.ts < FRESH_MS;
            const root = rootRef.current;
            if (root) {
                if (!fresh) {
                    root.style.opacity = '0';
                    clearHover();
                    pinchPrev.current = gp.pinch;
                } else {
                    const px = gp.x * window.innerWidth;
                    const py = gp.y * window.innerHeight;
                    root.style.opacity = '1';
                    root.style.transform = `translate(${px}px, ${py}px)`;

                    // Hit-test the control under the cursor (overlay is pointer-events:none).
                    const el = document.elementFromPoint(px, py) as HTMLElement | null;
                    const target = (el?.closest('[data-gesture]') as HTMLElement | null) ?? null;

                    if (target !== hovered.current) {
                        clearHover();
                        hovered.current = target;
                        dwellStart.current = Date.now();
                        if (target) target.setAttribute('data-gesture-hover', '');
                    }

                    const onCooldown = Date.now() - lastActivate.current < COOLDOWN_MS;

                    // Pinch = immediate click (rising edge).
                    if (gp.pinch && !pinchPrev.current && target && !onCooldown) {
                        activate(target);
                    }
                    pinchPrev.current = gp.pinch;

                    // Dwell = hold to click.
                    let progress = 0;
                    if (target && !onCooldown) {
                        progress = Math.min(1, (Date.now() - dwellStart.current) / DWELL_MS);
                        if (progress >= 1) { activate(target); progress = 0; }
                    }
                    if (ringRef.current) {
                        ringRef.current.style.strokeDashoffset = String(circumference * (1 - progress));
                        ringRef.current.style.opacity = target ? '1' : '0';
                    }
                }
            }
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [enabled]);

    if (!enabled) return null;
    const circumference = 2 * Math.PI * RING_R;

    return (
        <>
            {/* Global hover-pop style for any gesture control. */}
            <style>{`
                [data-gesture-hover]{
                    transform: scale(1.07) !important;
                    filter: brightness(1.02);
                    transition: transform .12s ease, box-shadow .12s ease;
                    box-shadow: 0 14px 34px rgba(64,50,90,0.22) !important;
                    z-index: 1;
                }
            `}</style>
            <div ref={rootRef} style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, zIndex: 99999, pointerEvents: 'none', opacity: 0, transition: 'opacity .15s ease', willChange: 'transform' }}>
                <svg width={(RING_R + 8) * 2} height={(RING_R + 8) * 2} viewBox={`0 0 ${(RING_R + 8) * 2} ${(RING_R + 8) * 2}`} style={{ position: 'absolute', left: -(RING_R + 8), top: -(RING_R + 8) }}>
                    {/* Soft halo */}
                    <circle cx={RING_R + 8} cy={RING_R + 8} r={RING_R} fill="rgba(138,102,240,0.12)" />
                    {/* Dwell progress ring */}
                    <circle
                        ref={ringRef}
                        cx={RING_R + 8} cy={RING_R + 8} r={RING_R}
                        fill="none" stroke="#8A66F0" strokeWidth={5} strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={circumference}
                        transform={`rotate(-90 ${RING_R + 8} ${RING_R + 8})`}
                        style={{ opacity: 0, transition: 'opacity .1s ease' }}
                    />
                    {/* Centre dot */}
                    <circle cx={RING_R + 8} cy={RING_R + 8} r={7} fill="#8A66F0" stroke="#fff" strokeWidth={3} />
                </svg>
            </div>
        </>
    );
}

export default GestureLayer;
