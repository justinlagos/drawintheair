/**
 * Device profile (Sprint 3) — pure, unit-tested.
 *
 * Draw in the Air is a webcam hand-tracking game, so the device matters
 * a lot: a laptop is ideal, a propped-up phone works, and an in-app
 * webview is risky. We classify the device once and let the onboarding
 * adapt its copy (not its layout) so each user gets the right nudge —
 * without re-cluttering the clean wave screen.
 */

export type DeviceKind = 'desktop' | 'tablet' | 'mobile';
export type CameraFit = 'best' | 'ok' | 'risky';

export interface DeviceProfile {
    kind: DeviceKind;
    /** Facebook / Instagram (etc.) in-app webview. */
    inApp: boolean;
    /** How well the core webcam experience is likely to work here. */
    cameraFit: CameraFit;
    /** A short, friendly positioning tip — '' when none is needed. */
    positioningTip: string;
}

const IN_APP_RE = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|Twitter|TikTok/;

export function classifyDevice(ua: string, width: number): DeviceKind {
    const isTabletUA = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    if (isTabletUA || (width >= 768 && width < 1024 && /Mobi|Android|iPhone/i.test(ua))) {
        return 'tablet';
    }
    if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua) || width < 768) {
        // Width alone shouldn't call a small desktop window "mobile".
        if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
    }
    return 'desktop';
}

export function getDeviceProfile(ua: string, width: number): DeviceProfile {
    const kind = classifyDevice(ua, width);
    const inApp = IN_APP_RE.test(ua);

    let cameraFit: CameraFit = 'best';
    if (inApp) cameraFit = 'risky';
    else if (kind === 'mobile') cameraFit = 'ok';
    else if (kind === 'tablet') cameraFit = 'ok';

    let positioningTip = '';
    if (!inApp) {
        if (kind === 'mobile') positioningTip = 'Prop your phone up so it can see your whole hand';
        else if (kind === 'tablet') positioningTip = 'Stand your tablet up so it can see your hand';
    }

    return { kind, inApp, cameraFit, positioningTip };
}

/** Convenience wrapper that reads the live environment (SSR-safe). */
export function currentDeviceProfile(): DeviceProfile {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return getDeviceProfile(ua, width);
}
