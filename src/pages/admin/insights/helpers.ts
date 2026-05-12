/**
 * Insights v2 — formatting helpers + React hooks.
 *
 * Anything used by more than one tab lives here. Keeping format
 * helpers + hooks together because they're all small and tightly
 * scoped to the dashboard.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RANGE_DAYS, type FilterState, type Range, type TabKey } from './types';

// ── Format helpers ────────────────────────────────────────────────────
export const fmtNum = (n: number | null | undefined): string =>
    typeof n === 'number' ? n.toLocaleString() : '—';

export const fmtPct = (n: number | null | undefined): string =>
    typeof n === 'number' ? `${n.toFixed(1)}%` : '—';

export const fmtDuration = (s: number | null | undefined): string => {
    if (s == null) return '—';
    const r = Math.round(s);
    if (r < 60) return `${r}s`;
    const m = Math.floor(r / 60);
    const sec = r % 60;
    return sec === 0 ? `${m}m` : `${m}m ${sec}s`;
};

export const fmtDelta = (n: number | null | undefined, suffix = '%'): string => {
    if (n == null) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}${suffix}`;
};

export const fmtTime = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

export const fmtRelative = (iso: string): string => {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

export const truncate = (s: string | undefined | null, n: number): string => {
    if (!s) return '';
    return s.length > n ? `${s.slice(0, n)}…` : s;
};

// Delta tone — green for up, coral for down, gray for flat / null
export const deltaTone = (n: number | null | undefined, goodIfUp = true):
    'good' | 'bad' | 'flat' => {
    if (n == null) return 'flat';
    if (Math.abs(n) < 0.5) return 'flat';
    const up = n > 0;
    return up === goodIfUp ? 'good' : 'bad';
};

// ── URL-state filter ──────────────────────────────────────────────────
const DEFAULT_FILTER: FilterState = {
    range: '7d', tab: 'executive', deviceType: 'all', ageBand: 'all',
};

function readFilterFromUrl(): FilterState {
    if (typeof window === 'undefined') return DEFAULT_FILTER;
    const p = new URLSearchParams(window.location.search);
    const valid = <T extends string>(x: string | null, allowed: readonly T[], fallback: T): T =>
        (x && (allowed as readonly string[]).includes(x)) ? x as T : fallback;
    return {
        range: valid<Range>(p.get('range'), ['24h', '7d', '30d', '90d'], '7d'),
        tab: valid<TabKey>(p.get('tab'),
            ['executive', 'engagement', 'learning', 'retention', 'sessions', 'errors'],
            'executive'),
        deviceType: valid(p.get('device'), ['all', 'desktop', 'tablet', 'mobile'] as const, 'all'),
        ageBand: valid(p.get('age'), ['all', '4-5', '6-7', '8-9', '10-11'] as const, 'all'),
    };
}

function writeFilterToUrl(f: FilterState): void {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams();
    if (f.range !== '7d')           p.set('range', f.range);
    if (f.tab !== 'executive')      p.set('tab', f.tab);
    if (f.deviceType !== 'all')     p.set('device', f.deviceType);
    if (f.ageBand !== 'all')        p.set('age', f.ageBand);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
}

export function useFilter(): [FilterState, (patch: Partial<FilterState>) => void] {
    const [filter, setFilter] = useState<FilterState>(readFilterFromUrl);
    const update = useCallback((patch: Partial<FilterState>) => {
        setFilter(prev => {
            const next = { ...prev, ...patch };
            writeFilterToUrl(next);
            return next;
        });
    }, []);
    return [filter, update];
}

export const days = (range: Range): number => RANGE_DAYS[range];

// ── Data fetching with auto-refresh ───────────────────────────────────
export interface RpcState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refreshedAt: Date | null;
    refresh: () => void;
}

export function useRpc<T>(
    fetcher: () => Promise<T>,
    deps: readonly unknown[],
    options: { intervalMs?: number } = {},
): RpcState<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const run = useCallback(async () => {
        try {
            const result = await fetcherRef.current();
            setData(result);
            setError(null);
            setRefreshedAt(new Date());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        setLoading(true);
        run();
    }, deps);
    /* eslint-enable react-hooks/exhaustive-deps */

    useEffect(() => {
        if (!options.intervalMs) return;
        const id = setInterval(run, options.intervalMs);
        return () => clearInterval(id);
    }, [options.intervalMs, run]);

    return useMemo(() => ({ data, loading, error, refreshedAt, refresh: run }),
        [data, loading, error, refreshedAt, run]);
}

// ── CSV export ────────────────────────────────────────────────────────
function csvEscape(v: unknown): string {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function downloadCsv<T extends Record<string, unknown>>(
    filename: string,
    rows: T[],
    columns?: Array<keyof T>,
): void {
    if (rows.length === 0) {
        alert('Nothing to export — no rows.');
        return;
    }
    const cols = (columns ?? Object.keys(rows[0]) as Array<keyof T>);
    const header = cols.join(',');
    const lines = rows.map(row => cols.map(c => csvEscape(row[c])).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dita-${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function copyShareLink(filter: FilterState): void {
    const p = new URLSearchParams();
    p.set('range', filter.range);
    p.set('tab', 'executive');
    // 'share=1' tells the page to hide auth-only chrome — sign-out
    // link, etc. — when present.
    p.set('share', '1');
    const url = `${window.location.origin}/admin/insights?${p.toString()}`;
    navigator.clipboard?.writeText(url);
    alert(`Shareable link copied. It still requires sign-in but routes anyone with admin access directly to the Executive view at ${filter.range}.`);
}

// ── Color palette for charts ──────────────────────────────────────────
export const CHART_COLORS = [
    '#6C3FA4', // deep plum
    '#55DDE0', // aqua
    '#FFB14D', // warm orange
    '#7ED957', // meadow green
    '#FF6B6B', // coral
    '#FFD84D', // sunshine
    '#3FA8AC', // teal
];
