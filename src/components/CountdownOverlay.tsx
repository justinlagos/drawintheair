import { useEffect, useRef } from 'react';
import { getCountdownState, isCountdownVisible, subscribeCountdown, GO_DISPLAY_MS } from '../core/countdownService';

export const CountdownOverlay = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastLabelRef = useRef<string>('');

    useEffect(() => {
        const update = () => {
            const container = containerRef.current;
            const label = labelRef.current;
            if (!container || !label) return;

            const now = Date.now();
            const state = getCountdownState();
            const visible = isCountdownVisible(now);

            if (!visible) {
                container.style.opacity = '0';
                container.style.pointerEvents = 'none';
                lastLabelRef.current = '';
                return;
            }

            container.style.opacity = '1';
            container.style.pointerEvents = 'none';

            const remaining = state.endsAt - now;
            const nextLabel = remaining > 0
                ? String(Math.max(1, Math.ceil(remaining / 1000)))
                : 'GO';

            if (nextLabel !== lastLabelRef.current) {
                lastLabelRef.current = nextLabel;
                label.textContent = nextLabel;
                label.classList.remove('countdown-pop');
                void label.offsetWidth;
                label.classList.add('countdown-pop');
            }

            if (remaining <= -GO_DISPLAY_MS) {
                container.style.opacity = '0';
            }
        };

        const tick = () => {
            update();
            rafRef.current = requestAnimationFrame(tick);
        };

        const startLoop = () => {
            if (rafRef.current !== null) return;
            rafRef.current = requestAnimationFrame(tick);
        };

        const stopLoop = () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        const unsubscribe = subscribeCountdown(() => {
            if (isCountdownVisible()) {
                startLoop();
            } else {
                stopLoop();
            }
        });

        if (isCountdownVisible()) {
            startLoop();
        }

        return () => {
            unsubscribe();
            stopLoop();
        };
    }, []);

    return (
        <div ref={containerRef} className="countdown-overlay" style={{ opacity: 0 }}>
            <div ref={labelRef} className="countdown-label">3</div>
        </div>
    );
};
