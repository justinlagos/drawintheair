/**
 * Camera debug utilities.
 *
 * The badge component is implemented with React.createElement (no JSX) so this
 * file can remain a .ts module while still exporting a renderable component.
 *
 * Enable by adding ?debug=camera to the URL.
 */

import { createElement, useState, useRef, useEffect } from 'react';
import type { ReactElement, CSSProperties } from 'react';
import type { CameraState } from './types';

export const CAMERA_DEBUG =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('debug') === 'camera';

const BADGE_STYLE: CSSProperties = {
    position: 'fixed',
    top: 8,
    right: 8,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.78)',
    color: '#00ffe0',
    fontFamily: 'monospace',
    fontSize: 11,
    padding: '4px 8px',
    borderRadius: 4,
    pointerEvents: 'none',
    lineHeight: 1.5,
    userSelect: 'none',
    whiteSpace: 'nowrap',
};

/**
 * Small non-intrusive badge displayed in the top-right corner.
 * Only renders when CAMERA_DEBUG is true.
 * Snaps a display state once per second — no per-frame rerenders.
 */
export function CameraDebugBadge({ state }: { state: CameraState }): ReactElement | null {
    // Hooks must be called in the same order on every render (rules-of-hooks).
    // Move them above the early-return and gate the rendered output instead.
    const latestRef = useRef(state);
    latestRef.current = state;

    const [display, setDisplay] = useState<CameraState>(state);

    useEffect(() => {
        if (!CAMERA_DEBUG) return;
        const id = setInterval(() => {
            setDisplay({ ...latestRef.current });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    if (!CAMERA_DEBUG) return null;

    const { status, streamActive, videoWidth, videoHeight, fpsCapture, fpsVision, qualityTier } = display;

    return createElement(
        'div',
        { style: BADGE_STYLE },
        createElement('div', null, `cam: ${streamActive ? 'yes' : 'no'} [${status}]`),
        createElement('div', null, `cap: ${videoWidth}x${videoHeight} @${fpsCapture}fps`),
        createElement('div', null, `vfps: ${fpsVision}`),
        createElement('div', null, `qual: ${qualityTier}`),
    );
}
