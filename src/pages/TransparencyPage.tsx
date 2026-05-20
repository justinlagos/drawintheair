/**
 * /transparency — public-facing LIOS trust-composition report.
 *
 * No authentication. K-anonymised (game modes with <5 learners
 * suppressed). Methodology fully disclosed. The page schools, grant
 * boards, journalists and parents can audit at any time.
 *
 * Document A §9.6 + Document B §13 — privacy posture as competitive
 * moat. The institutional discipline that lets the platform say
 * "here's the data quality underneath every number we publish."
 */

import React, { useEffect, useState } from 'react';
import { getSupabaseUrl, getAnonKey } from '../lib/supabase';
import { SEOMeta } from '../seo/SEOMeta';
import type { TransparencyReportData } from './admin/insights/types';
import './transparency.css';

const TransparencyPage: React.FC = () => {
    const [data, setData] = useState<TransparencyReportData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState<number>(90);

    useEffect(() => {
        const url = `${getSupabaseUrl()}/rest/v1/rpc/dashboard_transparency_report`;
        fetch(url, {
            method: 'POST',
            headers: {
                apikey: getAnonKey(),
                Authorization: `Bearer ${getAnonKey()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ in_days: days }),
        })
            .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
            .then(setData)
            .catch(e => setError((e as Error).message));
    }, [days]);

    return (
        <div className="tx-shell">
            <SEOMeta
                title="Trust & Transparency · Draw in the Air"
                description="Public quarterly report on data quality, trust composition, and the privacy posture behind every learning metric we publish."
                canonical="https://drawintheair.com/transparency"
            />

            <header className="tx-header">
                <div className="tx-header-inner">
                    <a className="tx-brand" href="/">
                        <img src="/logo.png" alt="Draw in the Air" />
                        <span>Draw in the Air</span>
                    </a>
                    <nav className="tx-nav">
                        <a href="/privacy">Privacy</a>
                        <a href="/safeguarding">Safeguarding</a>
                        <a href="/for-teachers">For teachers</a>
                    </nav>
                </div>
            </header>

            <main className="tx-main">
                <section className="tx-hero">
                    <div className="tx-eyebrow">LIOS Transparency Report</div>
                    <h1>Every number we publish, audited.</h1>
                    <p>
                        Draw in the Air operates a Learning Intelligence Operating
                        System (LIOS) that scores the credibility of every
                        recorded learning attempt before it counts toward any
                        public claim. This page is the live read-out of that
                        system. Nothing here is editorialised — it's queried
                        directly from production and refreshed on every load.
                    </p>
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
                        Couldn't load the transparency report. Please try again.
                    </div>
                )}

                {data && (
                    <>
                        <section className="tx-card">
                            <h2>Trust composition</h2>
                            <p className="tx-card-sub">
                                Across approximately <strong>{(data.composition.attempts_rounded ?? 0).toLocaleString()}</strong> attempts
                                in the last {data.window_days} days. Rounded to
                                the nearest 100 to avoid implying precision we
                                don't have.
                            </p>
                            <TierBar data={data} />
                            <div className="tx-legend">
                                <LegendItem tone="#7ED957" label="Tier A — Full credibility"
                                    pct={data.composition.tier_a_pct}
                                    note="Used in every internal and external claim." />
                                <LegendItem tone="#FFB14D" label="Tier B — Reduced weight"
                                    pct={data.composition.tier_b_pct}
                                    note="Excluded from external efficacy claims." />
                                <LegendItem tone="#FF6B6B" label="Tier C — Quarantined"
                                    pct={data.composition.tier_c_pct}
                                    note="Never updates skill ratings. Kept only for engineering diagnostics." />
                            </div>
                        </section>

                        <section className="tx-card">
                            <h2>Per-game-mode composition</h2>
                            <p className="tx-card-sub">{data.coverage_disclaimer}</p>
                            {data.by_game_mode.length === 0
                                ? <p className="tx-muted">No game modes meet the k=5 anonymity threshold in this window yet.</p>
                                : (
                                    <table className="tx-table">
                                        <thead>
                                            <tr>
                                                <th>Game mode</th>
                                                <th>Attempts</th>
                                                <th>Tier A</th>
                                                <th>Tier B</th>
                                                <th>Tier C</th>
                                                <th>Composition</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.by_game_mode.map(m => (
                                                <tr key={m.game_mode}>
                                                    <td>{m.game_mode}</td>
                                                    <td>{m.total.toLocaleString()}</td>
                                                    <td>{m.pct_a}%</td>
                                                    <td>{m.pct_b}%</td>
                                                    <td>{m.pct_c}%</td>
                                                    <td>
                                                        <div className="tx-bar tx-bar-mini">
                                                            <i style={{ width: `${m.pct_a}%`, background: '#7ED957' }} />
                                                            <i style={{ width: `${m.pct_b}%`, background: '#FFB14D' }} />
                                                            <i style={{ width: `${m.pct_c}%`, background: '#FF6B6B' }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                        </section>

                        <section className="tx-card">
                            <h2>Methodology — Trust v1 thresholds</h2>
                            <table className="tx-meta-table">
                                <tbody>
                                    <tr><th>Tier A (full credibility)</th><td>credibility ≥ {data.methodology.trust_v1_thresholds.tier_a_min}</td></tr>
                                    <tr><th>Tier B (reduced weight)</th>
                                        <td>{data.methodology.trust_v1_thresholds.tier_b_min} ≤ credibility &lt; {data.methodology.trust_v1_thresholds.tier_a_min}</td></tr>
                                    <tr><th>Tier C (quarantined)</th><td>credibility &lt; {data.methodology.trust_v1_thresholds.tier_c_max}</td></tr>
                                    <tr><th>Publication threshold</th><td>credibility ≥ {data.methodology.trust_v1_thresholds.publication_eligibility_min}</td></tr>
                                </tbody>
                            </table>
                            <h3>Rules that lower an attempt's credibility</h3>
                            <ul className="tx-rules">
                                {data.methodology.rules.map(r => (
                                    <li key={r}><code>{r}</code></li>
                                ))}
                            </ul>
                        </section>

                        <section className="tx-card">
                            <h2>Privacy posture</h2>
                            <ul className="tx-posture">
                                {data.methodology.privacy_posture.map((p, i) => (
                                    <li key={i}>{p}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="tx-card tx-fineprint">
                            <h3>How this page is generated</h3>
                            <p>
                                Every value above is the result of a single SQL
                                function (<code>dashboard_transparency_report</code>)
                                that runs at request time against the production
                                LIOS database. There is no caching layer, no
                                hand-curated content, and no editorial review
                                between the query and your screen.
                            </p>
                            <p>
                                Report version <code>{data.report_version}</code>.
                                Generated at {new Date(data.generated_at).toLocaleString()}.
                                Window: last {data.window_days} days.
                            </p>
                        </section>
                    </>
                )}
            </main>

            <footer className="tx-footer">
                <small>
                    <a href="/privacy">Privacy policy</a> ·
                    <a href="/safeguarding"> Safeguarding</a> ·
                    <a href="/">drawintheair.com</a>
                </small>
            </footer>
        </div>
    );
};

const TierBar: React.FC<{ data: TransparencyReportData }> = ({ data }) => {
    const a = data.composition.tier_a_pct ?? 0;
    const b = data.composition.tier_b_pct ?? 0;
    const c = data.composition.tier_c_pct ?? 0;
    return (
        <div className="tx-bar">
            <i style={{ width: `${a}%`, background: '#7ED957' }} />
            <i style={{ width: `${b}%`, background: '#FFB14D' }} />
            <i style={{ width: `${c}%`, background: '#FF6B6B' }} />
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

export default TransparencyPage;
