/**
 * cameraHelp — generate recovery instructions tailored to the user's
 * browser, OS, and the specific permission failure mode.
 *
 * UA sniffing is fragile but the alternative — generic "check your
 * browser settings" — is what we're trying to fix. We keep the rules
 * shallow (Chrome / Safari / Firefox / Edge × macOS / Windows / iOS /
 * Android) so they're easy to update when a browser ships a UI change.
 *
 * If we can't classify the UA confidently we fall back to a generic
 * help string instead of guessing wrong.
 */

export type CameraCause =
    | 'PERMISSION_DENIED'
    | 'NO_DEVICE'
    | 'DEVICE_BUSY'
    | 'NOT_SUPPORTED'
    | 'CONSTRAINTS'
    | 'UNKNOWN';

export interface BrowserContext {
    browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';
    os: 'macos' | 'windows' | 'linux' | 'ios' | 'android' | 'other';
    isMobile: boolean;
}

export interface RecoveryCopy {
    title: string;
    body: string;
    steps: string[];
    /** When true we show a "Try again" primary button; on false we hide it. */
    canRetry: boolean;
}

export function detectBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): BrowserContext {
    const u = ua.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/.test(u);

    let browser: BrowserContext['browser'] = 'other';
    if (/edg\//.test(u)) browser = 'edge';
    else if (/chrome\//.test(u) && !/edg\//.test(u)) browser = 'chrome';
    else if (/safari\//.test(u) && !/chrome\//.test(u)) browser = 'safari';
    else if (/firefox\//.test(u)) browser = 'firefox';

    let os: BrowserContext['os'] = 'other';
    if (/iphone|ipad|ipod/.test(u)) os = 'ios';
    else if (/android/.test(u)) os = 'android';
    else if (/mac os|macintosh/.test(u)) os = 'macos';
    else if (/windows/.test(u)) os = 'windows';
    else if (/linux/.test(u)) os = 'linux';

    return { browser, os, isMobile };
}

export function getRecoveryCopy(cause: CameraCause, ctx: BrowserContext = detectBrowser()): RecoveryCopy {
    switch (cause) {
        case 'PERMISSION_DENIED':
            return {
                title: 'Camera permission was blocked.',
                body: 'Your browser is blocking the camera. Switch it back to Allow and you\'re set.',
                steps: permissionStepsFor(ctx),
                canRetry: true,
            };

        case 'NO_DEVICE':
            return {
                title: 'No camera found on this device.',
                body: 'Draw in the Air uses your camera to see your hand wave. We couldn\'t find one connected.',
                steps: [
                    'If you have an external webcam, plug it in and refresh.',
                    'On a laptop, check that nothing is covering the lens.',
                    'On a desktop without a camera, try this on a laptop, phone, or tablet instead.',
                ],
                canRetry: true,
            };

        case 'DEVICE_BUSY':
            return {
                title: 'Camera is already in use.',
                body: 'Another app is holding your camera. Close it and try again.',
                steps: deviceBusyStepsFor(ctx),
                canRetry: true,
            };

        case 'NOT_SUPPORTED':
            return {
                title: 'This browser can\'t use the camera.',
                body: 'Your current browser doesn\'t support webcam access (or it\'s an older version that can\'t).',
                steps: [
                    'Open this page in Chrome, Edge, Safari, or Firefox.',
                    ctx.isMobile
                        ? 'Make sure your iOS / Android is up to date.'
                        : 'Update your browser to the latest version.',
                    'If you\'re using a private/incognito window, try a normal one.',
                ],
                canRetry: false,
            };

        case 'CONSTRAINTS':
            return {
                title: 'Couldn\'t open the camera at the right size.',
                body: 'Your camera works but didn\'t match the size we asked for.',
                steps: [
                    'Refresh the page.',
                    'If you\'re on an external camera, try a built-in one.',
                ],
                canRetry: true,
            };

        case 'UNKNOWN':
        default:
            return {
                title: 'Something went wrong starting the camera.',
                body: 'We couldn\'t open your camera. Try one of these:',
                steps: [
                    'Refresh the page.',
                    'Close other tabs and apps that might be using the camera.',
                    'Try a different browser (Chrome works best).',
                ],
                canRetry: true,
            };
    }
}

function permissionStepsFor(ctx: BrowserContext): string[] {
    // Per-browser specifics. Verified May 2026; revisit when browser UI changes.
    if (ctx.os === 'ios') {
        return [
            'Tap the "aA" icon in Safari\'s address bar.',
            'Tap "Website Settings" → "Camera" → "Allow".',
            'Come back here and tap "Try again" below.',
        ];
    }
    if (ctx.os === 'android') {
        return [
            'Tap the lock icon next to the address bar.',
            'Tap "Permissions" → "Camera" → "Allow".',
            'Come back here and tap "Try again" below.',
        ];
    }
    switch (ctx.browser) {
        case 'chrome':
        case 'edge':
            return [
                'Click the camera icon in the address bar (top-right or top-left).',
                'Choose "Always allow drawintheair.com to access your camera".',
                'Click "Try again" below.',
            ];
        case 'safari':
            return [
                'Open Safari → Settings → Websites → Camera.',
                'Find "drawintheair.com" and switch it to "Allow".',
                'Come back here and click "Try again".',
            ];
        case 'firefox':
            return [
                'Click the camera-with-slash icon in the address bar.',
                'Choose "Allow" for drawintheair.com.',
                'Click "Try again" below.',
            ];
        default:
            return [
                'Look for a small camera icon in or near your address bar.',
                'Click it and switch the setting to "Allow".',
                'Then click "Try again" below.',
            ];
    }
}

function deviceBusyStepsFor(ctx: BrowserContext): string[] {
    const generic = [
        'Close any other browser tab that\'s using the camera.',
        'Close Zoom, Google Meet, Teams, FaceTime, or any video app that\'s running.',
        'Then click "Try again" below.',
    ];
    if (ctx.os === 'windows') {
        return [
            ...generic,
            'If that doesn\'t fix it, open Settings → Privacy & security → Camera and confirm the browser is allowed.',
        ];
    }
    if (ctx.os === 'macos') {
        return [
            ...generic,
            'If that doesn\'t fix it, open System Settings → Privacy & Security → Camera and confirm your browser is allowed.',
        ];
    }
    return generic;
}
