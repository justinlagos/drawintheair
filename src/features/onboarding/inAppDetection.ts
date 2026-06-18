/**
 * In-app webview detection (Sprint 2). Kept separate from the notice
 * component so the component file only exports a component.
 */

import { detectInAppBrowser } from '../feedback';

/** True when we're in a mobile in-app webview where camera is risky. */
export function shouldShowInAppNotice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    return isMobile && detectInAppBrowser(ua);
}
