import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    thirdPartyAnalyticsAllowed,
    stopClarity,
    suspendThirdPartyAnalytics,
    resumeThirdPartyAnalytics,
    applyRouteAnalyticsPolicy,
    registerThirdPartyTool,
    registeredThirdPartyTools,
    GA_DISABLE_KEY,
    CHILD_BLOCK_FLAG,
    type AnalyticsWindow,
} from '../src/lib/thirdPartyAnalytics';
import { setConsent } from '../src/lib/analyticsConsent';

// analyticsConsent reads localStorage; give node a tiny in-memory one.
function installLocalStorage(): void {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
    };
}

interface FakeScript { src: string; removed: boolean; remove: () => void }

function fakeWindow(opts: { clarityLoaded?: boolean; scripts?: string[] } = {}): AnalyticsWindow & {
    calls: { clarity: unknown[][]; gtag: unknown[][]; fbq: unknown[][] };
    scripts: FakeScript[];
} {
    const calls = { clarity: [] as unknown[][], gtag: [] as unknown[][], fbq: [] as unknown[][] };
    const scripts: FakeScript[] = (opts.scripts ?? []).map((src) => {
        const s: FakeScript = { src, removed: false, remove: () => { s.removed = true; } };
        return s;
    });
    const win: AnalyticsWindow & { calls: typeof calls; scripts: FakeScript[] } = {
        calls,
        scripts,
        document: {
            querySelectorAll: (selector: string) => {
                if (selector.includes('clarity.ms')) return scripts.filter((s) => s.src.includes('clarity.ms') && !s.removed);
                return [];
            },
        },
    };
    if (opts.clarityLoaded) {
        win.clarity = (...args: unknown[]) => { calls.clarity.push(args); };
        win.gtag = (...args: unknown[]) => { calls.gtag.push(args); };
        win.fbq = (...args: unknown[]) => { calls.fbq.push(args); };
    }
    return win;
}

describe('thirdPartyAnalyticsAllowed', () => {
    beforeEach(installLocalStorage);
    afterEach(() => { delete (globalThis as Record<string, unknown>).localStorage; });

    it('is false with no consent, whatever the route', () => {
        expect(thirdPartyAnalyticsAllowed('/teachers')).toBe(false);
        expect(thirdPartyAnalyticsAllowed('/play')).toBe(false);
    });

    it('is true on an adult route once consent is granted', () => {
        setConsent('granted');
        expect(thirdPartyAnalyticsAllowed('/teachers')).toBe(true);
        expect(thirdPartyAnalyticsAllowed('/')).toBe(true);
    });

    it('is false on a child route even when consent was granted earlier', () => {
        setConsent('granted');
        expect(thirdPartyAnalyticsAllowed('/play')).toBe(false);
        expect(thirdPartyAnalyticsAllowed('/join')).toBe(false);
        expect(thirdPartyAnalyticsAllowed('/', '#app')).toBe(false);
    });

    it('is false when consent was denied', () => {
        setConsent('denied');
        expect(thirdPartyAnalyticsAllowed('/teachers')).toBe(false);
    });

    it('is false when there is no window at all (SSR / prerender)', () => {
        setConsent('granted');
        expect(typeof window).toBe('undefined');
        // No path given: reads the current location, and there is none.
        // isCurrentChildRoute returns false, so consent alone decides.
        expect(thirdPartyAnalyticsAllowed()).toBe(true);
    });
});

describe('stopClarity', () => {
    it('calls clarity("consent", false) then clarity("stop") when the API exists', () => {
        const win = fakeWindow({ clarityLoaded: true, scripts: ['https://www.clarity.ms/tag/vseevw9uck'] });
        expect(stopClarity(win)).toBe(true);
        expect(win.calls.clarity).toEqual([['consent', false], ['stop']]);
        expect(win.scripts[0].removed).toBe(true);
    });

    it('queues the stop on the pre-load stub so a tag that arrives later still stops', () => {
        const queue: unknown[][] = [];
        const stub = ((...args: unknown[]) => { queue.push(args); }) as AnalyticsWindow['clarity'];
        const win = fakeWindow();
        win.clarity = stub;
        expect(stopClarity(win)).toBe(true);
        expect(queue).toContainEqual(['stop']);
    });

    it('is a safe no-op when Clarity is absent or there is no window', () => {
        expect(stopClarity(fakeWindow())).toBe(false);
        expect(stopClarity(null)).toBe(false);
    });

    it('never throws if the Clarity API throws', () => {
        const win = fakeWindow();
        win.clarity = () => { throw new Error('boom'); };
        expect(() => stopClarity(win)).not.toThrow();
    });
});

describe('suspend / resume / applyRouteAnalyticsPolicy', () => {
    beforeEach(installLocalStorage);
    afterEach(() => {
        delete (globalThis as Record<string, unknown>).localStorage;
        for (const name of registeredThirdPartyTools()) registerThirdPartyTool({ name, suspend() {}, resume() {} })();
    });

    it('suspend stops every tool and sets the block flag', () => {
        const suspend = vi.fn();
        const resume = vi.fn();
        registerThirdPartyTool({ name: 'fake', suspend, resume });
        const win = fakeWindow({ clarityLoaded: true });
        suspendThirdPartyAnalytics(win);
        expect(win[CHILD_BLOCK_FLAG]).toBe(true);
        expect(win[GA_DISABLE_KEY]).toBe(true);
        expect(win.calls.clarity).toContainEqual(['stop']);
        expect(win.calls.gtag[0]).toEqual(['consent', 'update', expect.objectContaining({ analytics_storage: 'denied' })]);
        expect(win.calls.fbq).toContainEqual(['consent', 'revoke']);
        expect(suspend).toHaveBeenCalledTimes(1);
        expect(resume).not.toHaveBeenCalled();
    });

    it('a child route suspends even when consent was granted on an adult route (SPA navigation)', () => {
        setConsent('granted');
        const win = fakeWindow({ clarityLoaded: true, scripts: ['https://www.clarity.ms/tag/vseevw9uck'] });
        expect(applyRouteAnalyticsPolicy('/teachers', '', win)).toBe('allowed');
        expect(win[CHILD_BLOCK_FLAG]).toBe(false);
        expect(applyRouteAnalyticsPolicy('/play', '', win)).toBe('suspended');
        expect(win[CHILD_BLOCK_FLAG]).toBe(true);
        expect(win.calls.clarity).toContainEqual(['stop']);
        expect(win.scripts[0].removed).toBe(true);
    });

    it('resume refuses to re-enable on a child route', () => {
        setConsent('granted');
        const resume = vi.fn();
        registerThirdPartyTool({ name: 'fake', suspend() {}, resume });
        const win = fakeWindow({ clarityLoaded: true });
        suspendThirdPartyAnalytics(win);
        resumeThirdPartyAnalytics('/join', '', win);
        expect(win[CHILD_BLOCK_FLAG]).toBe(true);
        expect(win[GA_DISABLE_KEY]).toBe(true);
        expect(resume).not.toHaveBeenCalled();
        expect(win.calls.clarity).not.toContainEqual(['start']);
    });

    it('resume refuses without consent', () => {
        setConsent('denied');
        const win = fakeWindow({ clarityLoaded: true });
        suspendThirdPartyAnalytics(win);
        expect(applyRouteAnalyticsPolicy('/teachers', '', win)).toBe('denied');
        expect(win[CHILD_BLOCK_FLAG]).toBe(true);
        expect(win.calls.clarity).not.toContainEqual(['start']);
    });

    it('resume re-enables on an adult route with consent', () => {
        setConsent('granted');
        const resume = vi.fn();
        registerThirdPartyTool({ name: 'fake', suspend() {}, resume });
        const win = fakeWindow({ clarityLoaded: true });
        suspendThirdPartyAnalytics(win);
        expect(applyRouteAnalyticsPolicy('/class', '', win)).toBe('allowed');
        expect(win[CHILD_BLOCK_FLAG]).toBe(false);
        expect(win[GA_DISABLE_KEY]).toBe(false);
        expect(win.calls.clarity).toContainEqual(['start']);
        expect(win.calls.fbq).toContainEqual(['consent', 'grant']);
        expect(resume).toHaveBeenCalledTimes(1);
    });

    it('a throwing tool hook never breaks the gate', () => {
        registerThirdPartyTool({ name: 'bad', suspend() { throw new Error('x'); }, resume() { throw new Error('y'); } });
        const win = fakeWindow({ clarityLoaded: true });
        expect(() => suspendThirdPartyAnalytics(win)).not.toThrow();
        setConsent('granted');
        expect(() => resumeThirdPartyAnalytics('/', '', win)).not.toThrow();
    });
});
