/**
 * Canonical Tracing render shell — THE single component both solo play
 * (src/App.tsx) and classroom play (src/pages/classmode/StudentClassClient.tsx)
 * mount for Tracing. The only branch is the engine flag, which is identical in
 * every context.
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this, solo play gated the redesigned playful tracing on the
 * `tracingPlayfulUiV1` flag while the classroom student screen hard-coded the
 * legacy `PreWritingMode` (and `preWritingLogic`) with no flag check. The same
 * canonical activity id (`pre-writing`) therefore produced two completely
 * different experiences depending on the entry point. This module removes that
 * divergence. Context (solo vs classroom) is supplied through props — never by
 * mounting a different game.
 *
 * The pure resolution logic lives in tracingResolver.ts (re-exported below) so
 * the per-frame loop and unit tests can use it without loading the DOM shells.
 */
import { PreWritingMode } from '../PreWritingMode';
import { TracingModePlayful } from './TracingModePlayful';
import { isPlayfulTracingActive, type CanonicalTracingProps } from './tracingResolver';

// Pure resolution helpers (TRACING_ACTIVITY_ID, getTracingFrameLogic,
// isPlayfulTracingActive) live in ./tracingResolver — import them from there.

/**
 * Canonical Tracing render shell. Both solo and classroom mount THIS.
 */
export function CanonicalTracingMode({
    onExit,
    allowCategorySelection = true,
    initialSection = null,
}: CanonicalTracingProps) {
    if (isPlayfulTracingActive()) {
        return (
            <TracingModePlayful
                onExit={onExit}
                allowCategorySelection={allowCategorySelection}
                initialSection={initialSection}
            />
        );
    }
    return <PreWritingMode onExit={onExit} />;
}
