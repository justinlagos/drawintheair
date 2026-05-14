import React, { useState, useEffect, useMemo } from 'react';

// mirrors the PublicProof shape already in Landing.tsx
export interface PublicProof {
    distinct_devices_90d: number;
    activities_completed: number;
    mode_plays: number;
    tracker_success_pct: number;
    items_touched: number;
    items_mastered: number;
}

interface Metric { value: string; label: string; }

function fmtLarge(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return n.toLocaleString();
    return String(n);
}

const HOLD_MS = 5000;
const FADE_MS = 480;

interface Props {
    isScrolled: boolean;
    proof: PublicProof | null;
}

export const NavMetricsTicker: React.FC<Props> = ({ isScrolled, proof }) => {
    const [index, setIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    const metrics: Metric[] = useMemo(() => {
        if (!proof) return [{ value: '…', label: 'loading' }];
        return [
            { value: fmtLarge(proof.distinct_devices_90d), label: 'children learning'    },
            { value: fmtLarge(proof.activities_completed), label: 'activities completed'  },
            { value: `${Math.round(proof.tracker_success_pct)}%`, label: 'tracker accuracy' },
            { value: fmtLarge(proof.items_mastered),       label: 'items mastered'        },
            { value: fmtLarge(proof.mode_plays),           label: 'games played'          },
        ];
    }, [proof]);

    useEffect(() => {
        const cycle = setInterval(() => {
            setVisible(false);
            const swap = setTimeout(() => {
                setIndex(i => (i + 1) % metrics.length);
                setVisible(true);
            }, FADE_MS);
            return () => clearTimeout(swap);
        }, HOLD_MS + FADE_MS);
        return () => clearInterval(cycle);
    }, [metrics.length]);

    const { value, label } = metrics[index] ?? metrics[0];

    return (
        <div
            className={['nav-metrics-ticker', isScrolled ? 'nav-metrics-scrolled' : ''].join(' ').trim()}
            aria-live="polite"
            aria-label={`${value} ${label}`}
        >
            <span className="nav-metrics-dot" aria-hidden="true" />
            <span className={`nav-metrics-content${visible ? ' nm-in' : ' nm-out'}`}>
                <span className="nav-metrics-value">{value}</span>
                <span className="nav-metrics-sep" aria-hidden="true">·</span>
                <span className="nav-metrics-label">{label}</span>
            </span>
        </div>
    );
};
