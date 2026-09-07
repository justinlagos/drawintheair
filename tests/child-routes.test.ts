import { describe, it, expect } from 'vitest';
import { isChildRoute, CHILD_ROUTE_PREFIXES } from '../src/lib/childRoutes';

describe('isChildRoute (WP2B.1 / DIA-009)', () => {
    it('flags every screen a child uses', () => {
        for (const p of ['/play', '/onboarding', '/app', '/join', '/join/play', '/demo']) {
            expect(isChildRoute(p), p).toBe(true);
        }
    });

    it('flags the dev preview harnesses', () => {
        expect(isChildRoute('/dev/tracing-preview')).toBe(true);
        expect(isChildRoute('/dev/free-paint-preview')).toBe(true);
    });

    it('flags the #app hash on any path (getRouteFromPath resolves it to the game)', () => {
        expect(isChildRoute('/', '#app')).toBe(true);
        expect(isChildRoute('/teachers', '#app')).toBe(true);
        expect(isChildRoute('/', 'app')).toBe(true);
        expect(isChildRoute('/', '#eyfs-mapping')).toBe(false);
    });

    it('tolerates trailing slashes, query strings, case and full hrefs', () => {
        expect(isChildRoute('/play/')).toBe(true);
        expect(isChildRoute('/play?screen=game&mode=pre-writing&trace=A')).toBe(true);
        expect(isChildRoute('/play?embed=true')).toBe(true);
        expect(isChildRoute('/PLAY')).toBe(true);
        expect(isChildRoute('https://drawintheair.com/join?code=ABCD')).toBe(true);
        expect(isChildRoute('play')).toBe(true);
    });

    it('does not flag longer words that merely start with a child prefix', () => {
        expect(isChildRoute('/playground')).toBe(false);
        expect(isChildRoute('/joinus')).toBe(false);
        expect(isChildRoute('/apple')).toBe(false);
        expect(isChildRoute('/demos')).toBe(false);
    });

    it('leaves adult routes alone (marketing, teacher, parent, admin, legal)', () => {
        const adult = [
            '/', '/teachers', '/parents', '/pricing', '/about', '/privacy', '/terms',
            '/cookies', '/safeguarding', '/class', '/class/lobby', '/teacher/dashboard',
            '/teacher/login', '/parent/dashboard', '/parent/signup', '/admin/insights',
            '/teach/observe', '/schools', '/school', '/faq', '/learn', '/learn/x',
            '/activities/bubble-pop', '/free-paint', '/trace-a', '/letter-tracing',
            '/embed', '/press', '/share/abc', '/for-teachers', '/for-parents',
        ];
        for (const p of adult) expect(isChildRoute(p), p).toBe(false);
    });

    it('handles empty and odd input without throwing', () => {
        expect(isChildRoute('')).toBe(false);
        expect(isChildRoute('   ')).toBe(false);
        expect(isChildRoute('/', '')).toBe(false);
    });

    it('keeps the prefix list in sync with the expectations above', () => {
        expect(CHILD_ROUTE_PREFIXES).toEqual([
            '/play', '/onboarding', '/app', '/join', '/demo',
            '/dev/tracing-preview', '/dev/free-paint-preview',
        ]);
    });
});
