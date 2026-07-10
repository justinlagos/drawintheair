import { describe, it, expect } from 'vitest';
import {
    classifyEnvironment,
    classifyTrafficType,
    isBot,
    isExcludedFromHeadline,
    type AppEnvironment,
} from '../src/lib/trafficClassifier';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36';
const FB_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148 FBAN/FBIOS;FBAV/450';
const GOOGLEBOT =
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const LIGHTHOUSE = `${CHROME} Chrome-Lighthouse`;

describe('classifyEnvironment', () => {
    it('treats localhost and loopback as local', () => {
        expect(classifyEnvironment('localhost')).toBe('local');
        expect(classifyEnvironment('127.0.0.1')).toBe('local');
        expect(classifyEnvironment('0.0.0.0')).toBe('local');
        expect(classifyEnvironment('mac.local')).toBe('local');
        expect(classifyEnvironment('')).toBe('local');
        expect(classifyEnvironment(null)).toBe('local');
    });

    it('treats staging and Vercel branch previews as staging', () => {
        expect(classifyEnvironment('staging.drawintheair.com')).toBe('staging');
        expect(classifyEnvironment('dita-git-fix-branch-team.vercel.app')).toBe('staging');
        expect(classifyEnvironment('preview.drawintheair.com')).toBe('staging');
    });

    it('treats the public production host as production', () => {
        expect(classifyEnvironment('drawintheair.com')).toBe('production');
        expect(classifyEnvironment('www.drawintheair.com')).toBe('production');
        expect(classifyEnvironment('DrawInTheAir.com')).toBe('production'); // case-insensitive
    });
});

describe('isBot', () => {
    it('flags known crawlers and synthetic monitors', () => {
        expect(isBot(GOOGLEBOT)).toBe(true);
        expect(isBot(LIGHTHOUSE)).toBe(true);
    });
    it('flags automated browsers via webdriver', () => {
        expect(isBot(CHROME, true)).toBe(true);
    });
    it('does not flag real humans (incl. Facebook in-app browser)', () => {
        expect(isBot(CHROME)).toBe(false);
        expect(isBot(FB_IPHONE)).toBe(false);
    });
});

describe('classifyTrafficType', () => {
    const prod: AppEnvironment = 'production';

    it('a normal production visitor is real', () => {
        expect(classifyTrafficType({ environment: prod, userAgent: CHROME })).toBe('real');
    });

    it('a Facebook in-app browser visitor is still real (it is a genuine human)', () => {
        expect(classifyTrafficType({ environment: prod, userAgent: FB_IPHONE })).toBe('real');
    });

    it('bots win over every other signal', () => {
        expect(
            classifyTrafficType({ environment: prod, userAgent: GOOGLEBOT, internal: true }),
        ).toBe('bot');
    });

    it('all local/staging traffic is internal regardless of flags', () => {
        expect(classifyTrafficType({ environment: 'local', userAgent: CHROME })).toBe('internal');
        expect(classifyTrafficType({ environment: 'staging', userAgent: CHROME })).toBe('internal');
    });

    it('sticky internal devices on production are internal', () => {
        expect(
            classifyTrafficType({ environment: prod, userAgent: CHROME, internal: true }),
        ).toBe('internal');
    });

    it('qa and demo are distinguished from real', () => {
        expect(classifyTrafficType({ environment: prod, userAgent: CHROME, qa: true })).toBe('qa');
        expect(classifyTrafficType({ environment: prod, userAgent: CHROME, demo: true })).toBe('demo');
    });

    it('internal beats qa beats demo when several flags are set', () => {
        expect(
            classifyTrafficType({
                environment: prod,
                userAgent: CHROME,
                internal: true,
                qa: true,
                demo: true,
            }),
        ).toBe('internal');
    });
});

describe('isExcludedFromHeadline', () => {
    it('only real counts toward headline KPIs', () => {
        expect(isExcludedFromHeadline('real')).toBe(false);
        expect(isExcludedFromHeadline('internal')).toBe(true);
        expect(isExcludedFromHeadline('qa')).toBe(true);
        expect(isExcludedFromHeadline('demo')).toBe(true);
        expect(isExcludedFromHeadline('bot')).toBe(true);
    });
});
