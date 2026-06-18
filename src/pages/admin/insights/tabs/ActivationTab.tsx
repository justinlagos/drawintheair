/**
 * Activation tab — the metric everything optimises toward.
 *
 * Activation = a child completes their first activity (first
 * `mode_completed`). This tab makes the 4-of-87 finding from the launch
 * analysis a live, sliceable chart: the full funnel, the headline
 * activation rate, and the single biggest drop to attack next.
 *
 * Built on already-deployed RPCs (executive summary + funnel), so it
 * works today; the warm-up tutorial now feeds the activation step.
 */

import React from 'react';
import { Card, Kpi, Skeleton, Empty, FunnelChart } from '../components';
import { fmtNum, days as rangeDays } from '../helpers';
import { useRpc } from '../helpers';
import { fetchExecutive, fetchFunnel } from '../rpc';
import type { FilterState } from '../types';
import {
    buildActivationFunnel,
    activationRate,
    biggestDropStep,
} from '../activationFunnel';

export const ActivationTab: React.FC<{ filter: FilterState }> = ({ filter }) => {
    const d = rangeDays(filter.range);
    const exec = useRpc(() => fetchExecutive(d), [d]);
    const funnel = useRpc(() => fetchFunnel(d), [d]);

    if (exec.loading && !exec.data) return <div className="iv-col-12"><Skeleton count={3} /></div>;
    if (exec.error) return <Empty message={`Failed to load activation data: ${exec.error}`} />;
    if (!exec.data) return null;

    const c = exec.data.current;
    const steps = buildActivationFunnel(c);
    const rate = activationRate(c);
    const drop = biggestDropStep(steps);

    return (
        <>
            <div className="iv-col-12 iv-kpi-grid">
                <Kpi
                    label="Activation rate"
                    value={`${rate}%`}
                    sub="first activity completed ÷ sessions"
                    delta={exec.data.deltas.completion_rate_curr_pct}
                />
                <Kpi label="Activations" value={fmtNum(c.mode_completions)} sub="first completions" />
                <Kpi label="Sessions" value={fmtNum(c.sessions_started)} />
                <Kpi
                    label="Biggest drop"
                    value={drop ? `${drop.pctOfPrev}%` : '—'}
                    sub={drop ? `reach ${drop.label.replace('★ ', '')}` : ''}
                    deltaGoodIfUp
                />
            </div>

            <div className="iv-col-12">
                <Card
                    title="Activation funnel"
                    meta="Sessions → Camera → Tracker → Activity → ★ First completion"
                    tier="North Star"
                >
                    <FunnelChart
                        steps={steps.map((s) => ({ label: s.label, n: s.n, pctOfTop: s.pctOfTop }))}
                    />
                    <p className="iv-note" style={{ marginTop: 12, opacity: 0.7, fontSize: '0.85rem' }}>
                        <strong>Activation = a child completes their first activity.</strong>{' '}
                        Landing, granting the camera, and waving are necessary steps — not the win.
                        The optional balloon warm-up now counts as a first completion, so it
                        feeds this funnel directly.
                        {drop && (
                            <>
                                {' '}Right now the biggest leak is reaching{' '}
                                <strong>{drop.label.replace('★ ', '')}</strong> ({drop.pctOfPrev}% from the
                                previous step) — that's where the next experiment should go.
                            </>
                        )}
                    </p>
                </Card>
            </div>

            {funnel.data && funnel.data.steps.length > 0 && (
                <div className="iv-col-12">
                    <Card title="Event funnel (server-defined)" meta={`Last ${d}d`}>
                        <FunnelChart
                            steps={funnel.data.steps.map((s) => ({
                                label: s.step_name,
                                n: s.sessions,
                                pctOfTop: s.pct_of_top,
                            }))}
                        />
                    </Card>
                </div>
            )}
        </>
    );
};
