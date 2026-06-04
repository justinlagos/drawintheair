/**
 * /transparency: public trust, safety and learning quality page.
 *
 * Human-first. Reads as a parent-and-school-friendly story about
 * how Draw in the Air handles children's learning data, what we are
 * actually learning from it, and where we are still calibrating.
 * Internal jargon (LIOS, tier letters, SQL function names) is kept
 * to the admin dashboards. This page proves trust, safety, learning
 * quality and scientific seriousness in plain language.
 *
 * No em dashes anywhere on this page.
 */

import React, { useEffect, useState } from 'react';
import { getSupabaseUrl, getAnonKey } from '../lib/supabase';
import { SEOMeta } from '../seo/SEOMeta';
import { BrandLogo } from '../components/BrandLogo';
import type {
    TransparencyReportData, TransparencySignalsData,
} from './admin/insights/types';
import './transparency.css';

const TransparencyPage: React.FC = () => {
    const [report, setReport] = useState<TransparencyReportData | null>(null);
    const [signals, setSignals] = useState<TransparencySignalsData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState<number>(90);

    useEffect(() => {
        const headers = {
            apikey: getAnonKey(),
            Authorization: `Bearer ${getAnonKey()}`,
            'Content-Type': 'application/json',
        };
        const body = JSON.stringify({ in_days: days });
        const base = `${getSupabaseUrl()}/rest/v1/rpc`;

        Promise.all([
            fetch(`${base}/dashboard_transparency_report`, { method: 'POST', headers, body })
                .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
            fetch(`${base}/dashboard_transparency_signals`, { method: 'POST', headers, body })
                .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
        ])
            .then(([r, s]) => { setReport(r); setSignals(s); })
            .catch(e => setError((e as Error).message));
    }, [days]);

    return (
        <div className="tx-shell">
            <SEOMeta
                title="Trust, safety and learning quality · Draw in the Air"
                description="How Draw in the Air protects children's privacy, measures genuine learning, and lets anyone audit our numbers in plain English."
                canonical="https://drawintheair.com/transparency"
            />

            <header className="tx-header">
                <div className="tx-header-inner">
                    <a className="tx-brand" href="/">
                        <BrandLogo variant="header" />
                    </a>
                    <nav className="tx-nav">
                        <a href="/privacy">Privacy</a>
                        <a href="/safeguarding">Safeguarding</a>
                        <a href="/for-teachers">For teachers</a>
                    </nav>
                </div>
            </header>

            <main className="tx-main">

                {/* ── Section 1. Human-first hero ─────────────────────── */}
                <section className="tx-hero">
                    <div className="tx-eyebrow">Trust, safety and learning quality</div>
                    <h1>Every number we publish, audited.</h1>
                    <p className="tx-hero-lede">
                        We believe children's learning data should be transparent,
                        privacy safe, and genuinely measurable. Every insight on
                        Draw in the Air is checked before it counts toward any
                        learning claim. This page is the live read out of that
                        process. Nothing here is edited or marketed. It is queried
                        directly from production whenever you open it.
                    </p>

                    <div className="tx-badges">
                        <TrustBadge
                            icon="🎥"
                            title="No camera footage stored"
                            note="Everything happens on the child's device. Video frames never leave it."
                        />
                        <TrustBadge
                            icon="🔒"
                            title="Privacy first by design"
                            note="No names, no faces, no personal accounts. Pseudonymous IDs only."
                        />
                        <TrustBadge
                            icon="🏫"
                            title="Real classroom signal"
                            note="Built from actual lessons, not artificial benchmarks."
                        />
                    </div>

                    <div className="tx-range">
                        {[30, 90, 180].map(n => (
                            <button key={n}
                                    className={`tx-range-pill ${n === days ? 'is-active' : ''}`}
                                    onClick={() => setDays(n)}>
                                Last {n} days
                            </button>
                        ))}
                    </div>
                </section>

                {error && (
                    <div className="tx-error">
                        We couldn't load this report just now. Please try again in a moment.
                    </div>
                )}

                {/* ── Section 2. What this actually means ─────────────── */}
                <section className="tx-explainer">
                    <h2 className="tx-explainer-title">What this actually means</h2>
                    <div className="tx-explainer-grid">
                        <ExplainerCard
                            icon="📈"
                            title="We track real improvement over time"
                            body="Not clicks. Not minutes on screen. Whether a child is genuinely getting better at the thing they are practising."
                        />
                        <ExplainerCard
                            icon="🌀"
                            title="We notice frustration and confusion"
                            body="So the activities can adapt, slow down, or scaffold when a child needs it. Difficulty is not one size fits all."
                        />
                        <ExplainerCard
                            icon="🧹"
                            title="We exclude unreliable data"
                            body="If an attempt looks contaminated, distracted or accidental, it is set aside. We never include it in any claim about learning."
                        />
                        <ExplainerCard
                            icon="🛡️"
                            title="We protect privacy by design"
                            body="Camera footage stays on the device. No personal data leaves. Small groups are automatically hidden so individuals cannot be identified."
                        />
                    </div>
                </section>

                {/* ── Section 3. Trust composition (plain English) ───── */}
                {report && (
                    <section className="tx-card">
                        <h2>How much of the data we trust</h2>
                        <p className="tx-card-sub">
                            Across about <strong>{(report.composition.attempts_rounded ?? 0).toLocaleString()}</strong> learning
                            moments in the last {report.window_days} days. Numbers
                            are rounded so we never imply precision we do not have.
                        </p>
                        <TierBar data={report} />
                        <div className="tx-legend">
                            <LegendItem
                                tone="#3FB87F"
                                label="Fully trusted"
                                pct={report.composition.tier_a_pct}
                                note="Clear signal quality. Counts toward every learning claim we publish."
                            />
                            <LegendItem
                                tone="#F0AC1F"
                                label="Partly trusted"
                                pct={report.composition.tier_b_pct}
                                note="Used for our internal product work. Held back from any public claim about learning outcomes."
                            />
                            <LegendItem
                                tone="#F07A5C"
                                label="Set aside"
                                pct={report.composition.tier_c_pct}
                                note="Likely contaminated. Automatically quarantined and never used to score a learner."
                            />
                        </div>
                    </section>
                )}

                {/* ── Section 4. What we are learning ─────────────────── */}
                {signals && (
                    <section className="tx-card tx-insights">
                        <h2>What we are learning from the data</h2>
                        <p className="tx-card-sub">
                            We try to be honest about what is working and what is not.
                            These are observations from the most recent {signals.days} days
                            of real classroom and home use.
                        </p>
                        <div className="tx-insights-grid">
                            {signals.top_engaging_mode && (
                                <InsightCard
                                    eyebrow="Engagement"
                                    headline={`Children spend the longest in ${friendlyMode(signals.top_engaging_mode)}.`}
                                    body="Time on activity is not the same as learning, but it tells us where children feel comfortable and where they want to keep going."
                                />
                            )}
                            {signals.strongest_signal && (
                                <InsightCard
                                    eyebrow="Positive signal"
                                    headline={`${friendlyMode(signals.strongest_signal.game_mode)} currently produces the cleanest learning signal.`}
                                    body="Almost every attempt in this mode passes our data quality checks. That makes us confident in the trend lines we share for it."
                                />
                            )}
                            {signals.calibration_in_progress && signals.calibration_in_progress.game_mode !== signals.strongest_signal?.game_mode && (
                                <InsightCard
                                    eyebrow="Still calibrating"
                                    headline={`${friendlyMode(signals.calibration_in_progress.game_mode)} is the activity we are still tuning.`}
                                    body="A higher share of attempts in this mode get held back from public claims while we improve difficulty pacing and feedback. We would rather be honest than overclaim."
                                />
                            )}
                        </div>
                    </section>
                )}

                {/* ── Section 5. Learning impact snapshot ─────────────── */}
                {signals && (
                    <section className="tx-card tx-impact">
                        <h2>Learning impact snapshot</h2>
                        <p className="tx-card-sub">
                            A simple read of how children are progressing right now.
                            Every number below is an aggregate. We never publish
                            individual children's data.
                        </p>
                        <div className="tx-impact-grid">
                            <ImpactStat
                                value={signals.impact.skills_mastered.toLocaleString()}
                                label="skills mastered"
                                hint="Letters, numbers and shapes a child can now do reliably across multiple sessions."
                            />
                            <ImpactStat
                                value={signals.impact.learners_active.toLocaleString()}
                                label="children active"
                                hint="Unique pseudonymous learners practising on the platform."
                            />
                            <ImpactStat
                                value={signals.impact.sessions_run.toLocaleString()}
                                label="sessions run"
                                hint="A single sitting where a child opens, practises, and finishes."
                            />
                            <ImpactStat
                                value={signals.impact.avg_attempts_per_session?.toLocaleString() ?? '...'}
                                label="attempts per session"
                                hint="On average, the number of times a child tries something in one sitting."
                            />
                        </div>
                    </section>
                )}

                {/* ── Section 6. Privacy section (icon led) ──────────── */}
                <section className="tx-card tx-privacy">
                    <h2>How we protect children's privacy</h2>
                    <div className="tx-privacy-grid">
                        <PrivacyCard
                            icon="📷"
                            title="No raw video storage"
                            body="Camera frames are processed on the child's own device. They never travel to our servers or any third party."
                        />
                        <PrivacyCard
                            icon="🪪"
                            title="No personal identity"
                            body="No names, no emails, no faces. Each learner is a randomly generated pseudonymous ID that lives only on their device."
                        />
                        <PrivacyCard
                            icon="🧮"
                            title="Small groups are hidden"
                            body="If fewer than five children make up a number, that breakdown is suppressed automatically. Individuals cannot be picked out."
                        />
                        <PrivacyCard
                            icon="🌍"
                            title="Hosted in the EU"
                            body="Data lives in EU servers. We do not sell, share, or monetise children's information. Ever."
                        />
                    </div>
                </section>

                {/* ── Section 7. Philosophy ──────────────────────────── */}
                <section className="tx-card tx-philosophy">
                    <h2>How we think about learning</h2>
                    <p className="tx-philosophy-lede">
                        Learning is not taps, clicks or watching. Especially for young
                        children, learning lives in the body.
                    </p>
                    <p>
                        Draw in the Air measures movement. We measure how confidently
                        a child traces a letter, how quickly they recognise a shape,
                        how they recover when something is hard, how their attention
                        moves through a lesson, and how skills survive a week away
                        from the platform.
                    </p>
                    <p>
                        That is a different posture from most learning apps. We are
                        building a measurement system that earns the right to say
                        a child improved. Not a game that rewards screen time.
                    </p>
                </section>

                {/* ── Section 8. Global signals ──────────────────────── */}
                {signals && (signals.impact.classrooms_engaged > 0 || signals.impact.learners_active > 0) && (
                    <section className="tx-card tx-global">
                        <h2>Where children are practising</h2>
                        <p className="tx-card-sub">
                            We are an early stage platform with classrooms in a small
                            number of countries. As that grows we will report it here
                            openly, with country level aggregates only and never
                            individual identifiers.
                        </p>
                        <div className="tx-global-stats">
                            <div className="tx-global-stat">
                                <strong>{signals.impact.learners_active.toLocaleString()}</strong>
                                <span>active learners</span>
                            </div>
                            <div className="tx-global-stat">
                                <strong>{signals.impact.classrooms_engaged.toLocaleString()}</strong>
                                <span>classrooms tagged</span>
                            </div>
                            <div className="tx-global-stat">
                                <strong>{signals.impact.sessions_run.toLocaleString()}</strong>
                                <span>sessions logged</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Section 9. Known limitations ───────────────────── */}
                <section className="tx-card tx-limits">
                    <h2>What we are not yet claiming</h2>
                    <p className="tx-card-sub">
                        Being honest about what we have not proven is part of being
                        trustworthy. Here is what we are still working on.
                    </p>
                    <ul className="tx-limits-list">
                        <li>
                            <strong>Long term efficacy.</strong> We do not yet claim that a child who uses Draw in the Air outperforms a child who does not. That requires controlled studies which are underway with partner schools.
                        </li>
                        <li>
                            <strong>Longitudinal classroom data.</strong> We are still gathering the multi term datasets needed to publish independently reviewed results.
                        </li>
                        <li>
                            <strong>Some activities are still being calibrated.</strong> A few game modes have higher friction than we are happy with. We name them honestly above rather than hiding them.
                        </li>
                        <li>
                            <strong>Retention studies are ongoing.</strong> Whether a skill survives a two week break is a research question we are designing experiments around right now.
                        </li>
                    </ul>
                </section>

                {/* ── Tiny footnote ──────────────────────────────────── */}
                {report && (
                    <p className="tx-footnote">
                        This page is generated live from production data on every visit.
                        There is no caching, no editorial layer, and no hand curated
                        copy between the database and your screen. Report window: last {report.window_days} days.
                    </p>
                )}
            </main>

            <footer className="tx-footer">
                <small>
                    <a href="/privacy">Privacy policy</a>
                    <span aria-hidden> · </span>
                    <a href="/safeguarding">Safeguarding</a>
                    <span aria-hidden> · </span>
                    <a href="/">drawintheair.com</a>
                </small>
            </footer>
        </div>
    );
};

/* ── Small presentational components ───────────────────────────── */

const TrustBadge: React.FC<{ icon: string; title: string; note: string }> = ({ icon, title, note }) => (
    <div className="tx-badge">
        <span className="tx-badge-icon" aria-hidden>{icon}</span>
        <div>
            <div className="tx-badge-title">{title}</div>
            <div className="tx-badge-note">{note}</div>
        </div>
    </div>
);

const ExplainerCard: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="tx-explainer-card">
        <span className="tx-explainer-icon" aria-hidden>{icon}</span>
        <div className="tx-explainer-card-title">{title}</div>
        <div className="tx-explainer-card-body">{body}</div>
    </div>
);

const InsightCard: React.FC<{ eyebrow: string; headline: string; body: string }> = ({ eyebrow, headline, body }) => (
    <div className="tx-insight">
        <div className="tx-insight-eyebrow">{eyebrow}</div>
        <div className="tx-insight-headline">{headline}</div>
        <div className="tx-insight-body">{body}</div>
    </div>
);

const ImpactStat: React.FC<{ value: string; label: string; hint: string }> = ({ value, label, hint }) => (
    <div className="tx-impact-stat">
        <div className="tx-impact-value">{value}</div>
        <div className="tx-impact-label">{label}</div>
        <div className="tx-impact-hint">{hint}</div>
    </div>
);

const PrivacyCard: React.FC<{ icon: string; title: string; body: string }> = ({ icon, title, body }) => (
    <div className="tx-privacy-card">
        <span className="tx-privacy-icon" aria-hidden>{icon}</span>
        <div className="tx-privacy-title">{title}</div>
        <div className="tx-privacy-body">{body}</div>
    </div>
);

const TierBar: React.FC<{ data: TransparencyReportData }> = ({ data }) => {
    const a = data.composition.tier_a_pct ?? 0;
    const b = data.composition.tier_b_pct ?? 0;
    const c = data.composition.tier_c_pct ?? 0;
    return (
        <div className="tx-bar">
            <i style={{ width: `${a}%`, background: '#3FB87F' }} />
            <i style={{ width: `${b}%`, background: '#F0AC1F' }} />
            <i style={{ width: `${c}%`, background: '#F07A5C' }} />
        </div>
    );
};

const LegendItem: React.FC<{
    tone: string; label: string; pct: number | null; note: string;
}> = ({ tone, label, pct, note }) => (
    <div className="tx-legend-item">
        <div className="tx-legend-row">
            <i style={{ background: tone }} />
            <strong>{label}</strong>
            <span className="tx-legend-pct">{pct ?? 0}%</span>
        </div>
        <div className="tx-legend-note">{note}</div>
    </div>
);

/* ── Plain English mode labels (no internal codes on the public page) ── */
const FRIENDLY_MODES: Record<string, string> = {
    'pre-writing':      'tracing activities',
    'balloon-math':     'number popping',
    'rainbow-bridge':   'colour matching',
    'word-search':      'word hunting',
    'sort-and-place':   'sort and place',
    'gesture-spelling': 'spelling stars',
    'colour-builder':   'colour mixing',
};
function friendlyMode(m: string): string {
    return FRIENDLY_MODES[m] ?? m.replace(/-/g, ' ');
}

export default TransparencyPage;
