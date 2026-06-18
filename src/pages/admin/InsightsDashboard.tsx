/**
 * /admin/insights, analytics insights dashboard, v2.
 *
 * Investor-grade redesign (2026-05-12). The 941-line monolith was
 * broken into a tabbed shell + per-tab components under
 * ./insights/. This file is now just the orchestrator: auth gate,
 * top bar, filter bar, tab strip, content router.
 *
 * Auth-gated behind Google OAuth. The real gate is server-side:
 * migration 20260521_security_lockdown.sql revokes EXECUTE on every
 * dashboard_* / lios_* RPC from anon and (where applicable) gates
 * access on public._is_admin(). The component-level checks here are
 * UI affordances only, never trust them for security.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SEOMeta } from '../../seo/SEOMeta';
import { fmtRelative, useFilter, useRpc, copyShareLink } from './insights/helpers';
import type { TabKey, Range, FilterState } from './insights/types';
import {
    fetchLive, fetchExportHeadline,
    fetchExecutive, fetchEngagementDeep, fetchMasterySummary,
    fetchMasteryV2, fetchTrustStrip, fetchFrictionEngineering,
    fetchContextSplit, fetchAdaptiveDecisions, fetchObservations,
    fetchProgressionTopLearners, fetchRetentionDeep,
} from './insights/rpc';
import { days as rangeDays } from './insights/helpers';
import { ExecutiveTab } from './insights/tabs/ExecutiveTab';
import { ActivationTab } from './insights/tabs/ActivationTab';
import { EngagementTab } from './insights/tabs/EngagementTab';
import { LearningTab } from './insights/tabs/LearningTab';
import { RetentionTab } from './insights/tabs/RetentionTab';
import { SessionsTab } from './insights/tabs/SessionsTab';
import { ErrorsTab } from './insights/tabs/ErrorsTab';
import { FrictionTab } from './insights/tabs/FrictionTab';
import { ProgressionTab } from './insights/tabs/ProgressionTab';
import { AdaptiveTab } from './insights/tabs/AdaptiveTab';
import { ObservationsTab } from './insights/tabs/ObservationsTab';
import { ObservabilityTab } from './insights/tabs/ObservabilityTab';
import { SystemHealthTab } from './insights/tabs/SystemHealthTab';
import { PrintReport } from './insights/PrintReport';
import './insights/insights.css';

// SECURITY (2026-05-21): the client-side allow-list was removed.
// • It leaked an admin's personal email in the public JS bundle (H7).
// • It protected nothing, the dashboard RPCs were granted to anon, so
//   anyone with the bundled anon key could call them directly.
// • The authoritative gate now lives in Postgres: every dashboard_* /
//   lios_* RPC is revoked from anon, and the executive surface checks
//   public._is_admin() server-side. A non-admin who reaches this
//   component sees per-tab "forbidden" errors, never data.
const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'executive',  label: 'Executive' },
    { key: 'activation', label: 'Activation' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'learning',   label: 'Learning' },
    { key: 'retention',  label: 'Retention' },
    { key: 'sessions',   label: 'Sessions' },
    { key: 'errors',     label: 'Errors' },
    { key: 'friction',   label: 'Friction' },
    { key: 'progression', label: 'Progression' },
    { key: 'adaptive',    label: 'Adaptive' },
    { key: 'observations', label: 'Observations' },
    { key: 'observability', label: 'Observability' },
    { key: 'system-health', label: 'System Health' },
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
    // SECURITY: server-side gate (public._is_admin in every dashboard RPC)
    // is the source of truth. If the signed-in user is not an admin, the
    // RPC calls will return 42501/forbidden and each tab renders its own
    // error. We deliberately do NOT short-circuit here based on a client
    // allow-list, that pattern leaked an email to the public bundle.
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

// (NotAllowed gate removed 2026-05-21, the server-side admin assertion
//  in each dashboard RPC is the only authoritative check.)

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

    // ── LIOS Unified Export ─────────────────────────────────────────
    // Single click, parallel-fetches every dashboard RPC, bundles the
    // result client-side, downloads as a single JSON. Per-section
    // failures don't kill the export, they appear as `null` in the
    // bundle so the recipient can still consume what succeeded.
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string>('');
    const handleExportEverything = async () => {
        setExporting(true);
        setExportProgress('Preparing…');
        const days = rangeDays(filter.range);
        const safe = async <T,>(name: string, fn: () => Promise<T>): Promise<T | null> => {
            try {
                setExportProgress(`Fetching ${name}…`);
                return await fn();
            } catch {
                return null;
            }
        };
        try {
            const [headline, executive, engagement, masterySummary, masteryV2,
                   trust, friction, contextSplit, adaptive, observations,
                   progression, retention] = await Promise.all([
                safe('headline',         () => fetchExportHeadline(days)),
                safe('executive',        () => fetchExecutive(days)),
                safe('engagement',       () => fetchEngagementDeep(days)),
                safe('mastery (v1)',     () => fetchMasterySummary(Math.max(days, 30))),
                safe('mastery (v2)',     () => fetchMasteryV2(Math.max(days, 30))),
                safe('trust',            () => fetchTrustStrip(Math.max(days, 30))),
                safe('friction',         () => fetchFrictionEngineering(Math.max(days, 30))),
                safe('context split',    () => fetchContextSplit(Math.max(days, 30))),
                safe('adaptive',         () => fetchAdaptiveDecisions(Math.max(days, 30))),
                safe('observations',     () => fetchObservations(Math.max(days, 30))),
                safe('progression top',  () => fetchProgressionTopLearners(Math.max(days, 90), 50)),
                safe('retention',        () => fetchRetentionDeep()),
            ]);
            setExportProgress('Bundling…');
            const bundle = {
                ...(headline ?? {
                    export_version: 'lios-v1',
                    generated_at:   new Date().toISOString(),
                    window_days:    days,
                    product:        'draw-in-the-air',
                    environment:    'production',
                }),
                sections: {
                    executive, engagement,
                    mastery_summary: masterySummary,
                    mastery_v2:      masteryV2,
                    trust,           friction,
                    context_split:   contextSplit,
                    adaptive,        observations,
                    progression,     retention,
                },
                exported_by: email,
            };
            const blob = new Blob([JSON.stringify(bundle, null, 2)],
                                  { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dita-insights-${new Date().toISOString().slice(0, 10)}-${filter.range}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setExportProgress('Done.');
        } finally {
            setTimeout(() => { setExporting(false); setExportProgress(''); }, 800);
        }
    };

    // Dedicated report view, auto-prints once loaded.
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
            if (e.key === '7') setFilter({ tab: 'friction' });
            if (e.key === '8') setFilter({ tab: 'progression' });
            if (e.key === '9') setFilter({ tab: 'adaptive' });
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
                        <button
                            className="iv-btn iv-btn-primary"
                            onClick={handleExportEverything}
                            disabled={exporting}
                            title="Bundle every dashboard payload and download as a single JSON"
                        >
                            {exporting ? (exportProgress || 'Exporting…') : 'Export everything'}
                        </button>
                        <button className="iv-btn" onClick={handleShare} title="Copy a permalink to this view">
                            Share
                        </button>
                        <button className="iv-btn" onClick={handlePrint} title="Print or save as PDF, investor-friendly layout">
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
                {filter.tab === 'activation' && <ActivationTab filter={filter} />}
                {filter.tab === 'engagement' && <EngagementTab filter={filter} />}
                {filter.tab === 'learning'   && <LearningTab   filter={filter} />}
                {filter.tab === 'retention'  && <RetentionTab />}
                {filter.tab === 'sessions'   && <SessionsTab   filter={filter} />}
                {filter.tab === 'errors'     && <ErrorsTab />}
                {filter.tab === 'friction'   && <FrictionTab   filter={filter} />}
                {filter.tab === 'progression' && <ProgressionTab filter={filter} />}
                {filter.tab === 'adaptive'   && <AdaptiveTab   filter={filter} />}
                {filter.tab === 'observations' && <ObservationsTab filter={filter} />}
                {filter.tab === 'observability' && <ObservabilityTab filter={filter} />}
                {filter.tab === 'system-health' && <SystemHealthTab />}
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
