/**
 * Canonical Tracing render shell - THE single component both solo play
 * (src/App.tsx) and classroom play (src/pages/classmode/StudentClassClient.tsx)
 * mount for Tracing. There is exactly ONE tracing engine.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this, solo play gated the redesigned playful tracing on the
 * `tracingPlayfulUiV1` flag while the classroom student screen hard-coded the
 * (now retired) legacy `PreWritingMode` with no flag check. The same canonical
 * activity id (`pre-writing`) therefore produced two different experiences
 * depending on the entry point. This module removes that divergence. Context
 * (solo vs classroom) is supplied through props - never by mounting a
 * different game.
 *
 * Pure resolution helpers (TRACING_ACTIVITY_ID, getTracingFrameLogic,
 * getTracingProgress) live in tracingResolver.ts so the per-frame loop and
 * unit tests can use them without loading this DOM shell.
 */
import { TracingModePlayful } from './TracingModePlayful';
import type { CanonicalTracingProps } from './tracingResolver';

/** Canonical Tracing render shell. Both solo and classroom mount THIS. */
export function CanonicalTracingMode({
    onExit,
    allowCategorySelection = true,
    initialSection = null,
}: CanonicalTracingProps) {
    return (
        <TracingModePlayful
            onExit={onExit}
            allowCategorySelection={allowCategorySelection}
            initialSection={initialSection}
        />
    );
}
