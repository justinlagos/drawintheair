/**
 * Performance Overlay - Dev Tool
 *
 * Starts the FPS sampler when ?debugPerf=1 is in URL.
 * The sampler writes to the DOM directly — zero React rerenders per frame.
 * This component only mounts once and never re-renders.
 */

import { useEffect } from 'react';
import { fpsSampler } from '../core/fpsSampler';

export const PerfOverlay = () => {
    useEffect(() => {
        fpsSampler.start();
        return () => fpsSampler.stop();
    }, []);

    // Renders nothing — the sampler manages its own DOM label
    return null;
};
