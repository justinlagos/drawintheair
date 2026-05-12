/**
 * /admin/insights — analytics insights dashboard, v2.
 *
 * Investor-grade redesign (2026-05-12). The 941-line monolith was
 * broken into a tabbed shell + per-tab components under
 * ./insights/. This file is now just the orchestrator: auth gate,
 * top bar, filter bar, tab strip, content router.
 *
 * Auth-gated behind Google OAuth + an email allow-list so a leaked
 * URL doesn't expose the data. The RPCs are granted to anon — auth
 * is purely component-level.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SEOMeta } from '../../seo/SEOMeta';
import { fmtRelative, useFilter, useRpc, copyShareLink } from './insights/helpers';
import type { TabKey, Range, FilterState } from './insights/types';
import { fetchLive } from './insights/rpc';
import { ExecutiveTab } from './insights/tabs/ExecutiveTab';
import { EngagementTab } from './insights/tabs/EngagementTab';
import { LearningTab } from './insights/tabs/LearningTab';
import { RetentionTab } from './insights/tabs/RetentionTab';
import { SessionsTab } from './insights/tabs/SessionsTab';
import { ErrorsTab } from './insights/tabs/ErrorsTab';
import { PrintReport } from './insights/PrintReport';
import './insights/insights.css';

// Allow-list. Add more emails here when other admins need access.
const ALLOWED_ADMINS = new Set<string>([
    'mrjustinukaegbu@gmail.com',
]);

const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'executive',  label: 'Executive' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'learning',   label: 'Learning' },
    { key: 'retention',  label: 'Retention' },
    { key: 'sessions',   label: 'Sessions' },
    { key: 'errors',     label: 'Errors' },
];

const RANGES: Array<{ key: Range; label: string }> = [
    { key: '24h', label: '24h' },
    { key: '7d',  label: '7d' },
    { key: '30d', label: '30d' },
    { key: '90d', label: '90d' },
];

const InsightsDashboard: React.FC = () => {
    const { user, signOut, loading } = useAuth();

    if (loading) {
        return <div className="iv-gate"><div className="iv-gate-card">Checking sign-in…</div></div>;
    }
    if (!user) return <SignInGate />;
    if (!ALLOWED_ADMINS.has((user.email ?? '').toLowerCase())) {
        return <NotAllowed email={user.email ?? '(unknown)'} onSignOut={signOut} />;
    }
    return <AuthenticatedDashboard email={user.email!} onSignOut={signOut} />;
};

// ── Auth gate ──────────────────────────────────────────────────────────
const SignInGate: React.FC = () => {
    const { signIn, configured } = useAuth();
    return (
        <div className="iv-gate">
            <SEOMeta title="Sign in · Insights" description="Sign in to view live analytics." canonical="https://drawintheair.com/admin/insights" noIndex />
            <div className="iv-gate-card">
                <div style={{
                    width: 48, height: 48, margin: '0 auto 12px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #6C3FA4, #55DDE0)',
                }} />
                <h1 style={{ margin: 0, font: '700 22px Fredoka, system-ui', color: '#6C3FA4' }}>
                    Draw in the Air · Insights
                </h1>
                <p style={{ margin: '10px 0 22px', color: '#6B6F84' }}>
                    Sign in with Google to view live analytics for drawintheair.com.
                </p>
                {configured ? (
                    <button className="iv-btn iv-btn-primary" onClick={() => signIn('/admin/insights')}>
                        Sign in with Google
                    </button>
                ) : (
                    <p style={{ color: '#C13A3A' }}>Supabase auth isn't configured for this build.</p>
                )}
            </div>
        </div>
    );
};

const NotAllowed: React.FC<{ email: string; onSignOut: () => Promise<void> }> = ({ email, onSignOut }) => (
    <div className="iv-gate">
        <div className="iv-gate-card">
            <h1 style={{ margin: 0, font: '700 20px Fredoka, system-ui', color: '#C13A3A' }}>
                Access denied
            </h1>
            <p style={{ margin: '10px 0 20px', color: '#6B6F84' }}>
                {email} is signed in but isn't on the insights allow-list.
            </p>
            <button className="iv-btn" onClick={onSignOut}>Sign out</button>
        </div>
    </div>
);

// ── Authenticated shell ────────────────────────────────────────────────
const AuthenticatedDashboard: React.FC<{ email: string; onSignOut: () => Promise<void> }> = ({ email, onSignOut }) => {
    const [filter, setFilter] = useFilter();
    const live = useRpc(() => fetchLive(), [], { intervalMs: 15_000 });
    const [shareMode] = useState(() => new URLSearchParams(window.location.search).get('share') === '1');
    const [reportMode] = useState(() => new URLSearchParams(window.location.search).get('report') === '1');

    // Print: open the dedicated paper-shaped report view in a new tab.
    // The view auto-fires window.print() once data is loaded.
    const handlePrint = () => {
        const url = `/admin/insights?report=1&range=${filter.range}`;
        window.open(url, '_blank');
    };
    const handleShare = () => copyShareLink(filter);

    // Dedicated report view — auto-prints once loaded.
    if (reportMode) {
        return <PrintReport range={filter.range} email={email} />;
    }

    // Keyboard shortcuts for power use
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
            if (e.key === '1') setFilter({ tab: 'executive' });
            if (e.key === '2') setFilter({ tab: 'engagement' });
            if (e.key === '3') setFilter({ tab: 'learning' });
            if (e.key === '4') setFilter({ tab: 'retention' });
            if (e.key === '5') setFilter({ tab: 'sessions' });
            if (e.key === '6') setFilter({ tab: 'errors' });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [setFilter]);

    return (
        <div className="iv-shell">
            <SEOMeta title="Insights · Draw in the Air" description="Live analytics for drawintheair.com." canonical="https://drawintheair.com/admin/insights" noIndex />

            {/* Top bar */}
            <header className="iv-topbar">
                <div className="iv-topbar-inner">
                    <div className="iv-brand">
                        <img
                            src="/logo.png"
                            alt="Draw in the Air"
                            className="iv-brand-logo"
                        />
                        <div>
                            <div className="iv-brand-name">Insights</div>
                            <div className="iv-brand-sub">
                                {shareMode ? 'Share view · read-only' : email}
                                {live.refreshedAt && ` · refreshed ${fmtRelative(live.refreshedAt.toISOString())}`}
                            </div>
                        </div>
                    </div>

                    {live.data && live.data.active_count > 0 && (
                        <div className="iv-live" title="Sessions with activity in the last 5 minutes">
                            <span className="iv-live-dot" />
                            <span>Live · {live.data.active_count} active</span>
                        </div>
                    )}

                    <div className="iv-topbar-spacer" />

                    <div className="iv-topbar-actions iv-no-print">
                        <button className="iv-btn" onClick={handleShare} title="Copy a permalink to this view">
                            Share
                        </button>
                        <button className="iv-btn" onClick={handlePrint} title="Print or save as PDF — investor-friendly layout">
                            Print
                        </button>
                        {!shareMode && (
                            <button className="iv-btn iv-btn-ghost" onClick={onSignOut}>Sign out</button>
                        )}
                    </div>
                </div>
            </header>

            {/* Filter bar */}
            <div className="iv-filterbar iv-no-print">
                <div className="iv-filter-group" role="tablist" aria-label="Time range">
                    {RANGES.map(r => (
                        <button
                            key={r.key}
                            className={`iv-filter-pill ${filter.range === r.key ? 'is-active' : ''}`}
                            onClick={() => setFilter({ range: r.key })}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                <DeviceFilter filter={filter} setFilter={setFilter} />
                <AgeFilter filter={filter} setFilter={setFilter} />
            </div>

            {/* Tab strip */}
            <nav className="iv-tabstrip iv-no-print" role="tablist" aria-label="Sections">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`iv-tab ${filter.tab === t.key ? 'is-active' : ''}`}
                        onClick={() => setFilter({ tab: t.key })}
                        role="tab"
                        aria-selected={filter.tab === t.key}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            {/* Tab body */}
            <main className="iv-main">
                {filter.tab === 'executive'  && <ExecutiveTab  filter={filter} />}
                {filter.tab === 'engagement' && <EngagementTab filter={filter} />}
                {filter.tab === 'learning'   && <LearningTab   filter={filter} />}
                {filter.tab === 'retention'  && <RetentionTab />}
                {filter.tab === 'sessions'   && <SessionsTab   filter={filter} />}
                {filter.tab === 'errors'     && <ErrorsTab />}
            </main>
        </div>
    );
};

// ── Compact secondary filter pills ─────────────────────────────────────
const DeviceFilter: React.FC<{
    filter: FilterState; setFilter: (p: Partial<FilterState>) => void;
}> = ({ filter, setFilter }) => (
    <div className="iv-filter-group" role="tablist" aria-label="Device type">
        {(['all', 'desktop', 'tablet', 'mobile'] as const).map(d => (
            <button
                key={d}
                className={`iv-filter-pill ${filter.deviceType === d ? 'is-active' : ''}`}
                onClick={() => setFilter({ deviceType: d })}
            >
                {d === 'all' ? 'All devices' : d[0].toUpperCase() + d.slice(1)}
            </button>
        ))}
    </div>
);

const AgeFilter: React.FC<{
    filter: FilterState; setFilter: (p: Partial<FilterState>) => void;
}> = ({ filter, setFilter }) => (
    <div className="iv-filter-group" role="tablist" aria-label="Age band">
        {(['all', '4-5', '6-7', '8-9', '10-11'] as const).map(a => (
            <button
                key={a}
                className={`iv-filter-pill ${filter.ageBand === a ? 'is-active' : ''}`}
                onClick={() => setFilter({ ageBand: a })}
            >
                {a === 'all' ? 'All ages' : a}
            </button>
        ))}
    </div>
);

export default InsightsDashboard;
