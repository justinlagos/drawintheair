// src/entry-prerender.tsx — build-time SSR entry for the marketing/SEO surface.
//
// WHY: the app is a client-rendered SPA, so crawlers that do not execute
// JavaScript (GPTBot, ClaudeBot, PerplexityBot, social link scrapers, and
// Googlebot's first-pass fetch) receive ~25 words of boot-splash text.
// Every Learn article, FAQ answer, use-case page and trace page is invisible
// to them. This entry renders those routes to real HTML strings at build
// time; scripts/prerender-seo.mjs injects the output into per-route static
// files. SEO/GEO only — nothing here runs in the browser.
//
// SCOPE: marketing + SEO routes ONLY. The camera app (/play, /app), Class
// Mode, parent/teacher auth and dashboards are deliberately absent: they are
// interactive, stateful, and must stay client-only. Do not add them.
//
// SSR SAFETY CONTRACT for pages listed here:
//   - No window/document/localStorage access at module scope or in the
//     render path. Effects and event handlers are fine (they never run
//     under renderToString).
//   - No AuthProvider/ParentProvider requirement. The marketing surface is
//     provider-free by design; if a page grows an auth dependency, remove
//     it from ROUTES rather than adding providers here.
//
// This mirrors the marketing subset of the if-chain router in main.tsx.
// If a route is added there, add it here (and vice versa) — the
// prerender script logs the route count on every build as a drift check.

import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import type { HelmetServerState } from 'react-helmet-async';

import { KidStyles } from './styles/KidStyles';

// Eager imports — this bundle is build-time only, size is irrelevant.
import { Landing } from './pages/Landing';
import { FAQ } from './pages/FAQ';
import { Schools } from './pages/Schools';
import { Pricing } from './pages/Pricing';
import Teachers from './pages/Teachers';
import About from './pages/About';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { Safeguarding } from './pages/Safeguarding';
import { Accessibility } from './pages/Accessibility';
import { Training } from './pages/Training';
import SchoolPilot from './pages/SchoolPilot';

import EmbedPage from './pages/seo/EmbedPage';
import PressPage from './pages/seo/PressPage';
import FreeResourcesPage from './pages/seo/FreeResourcesPage';
import ForTeachersPage from './pages/seo/ForTeachersPage';
import ForParentsPage from './pages/seo/ForParentsPage';
import EducationPage from './pages/seo/EducationPage';
import LearnHubPage from './pages/seo/LearnHubPage';
import LearnArticlePage from './pages/seo/LearnArticlePage';
import UseCasePage from './pages/seo/UseCasePage';
import ActivityPage from './pages/seo/ActivityPage';
import SpecialActivityPage from './pages/seo/SpecialActivityPage';
import TracePage from './pages/seo/TracePage';

import { LETTERS, NUMBERS, SHAPES } from './seo/seo-config';

// ─── Route table ────────────────────────────────────────────────────────────
// `src` is the page component's source path, used by the prerender script to
// look up that route's CSS/JS chunks in the client build manifest so the
// static HTML links the right stylesheets (no flash of unstyled content).

export interface PrerenderRoute {
  path: string;
  src: string;
  element: () => ReactElement;
}

const P = 'src/pages';

const STATIC_ROUTES: PrerenderRoute[] = [
  { path: '/', src: `${P}/Landing.tsx`, element: () => <Landing /> },
  { path: '/faq', src: `${P}/FAQ.tsx`, element: () => <FAQ /> },
  { path: '/schools', src: `${P}/Schools.tsx`, element: () => <Schools /> },
  { path: '/schools/training', src: `${P}/Training.tsx`, element: () => <Training /> },
  { path: '/school', src: `${P}/SchoolPilot.tsx`, element: () => <SchoolPilot /> },
  { path: '/teachers', src: `${P}/Teachers.tsx`, element: () => <Teachers /> },
  { path: '/pricing', src: `${P}/Pricing.tsx`, element: () => <Pricing /> },
  { path: '/about', src: `${P}/About.tsx`, element: () => <About /> },
  { path: '/privacy', src: `${P}/Privacy.tsx`, element: () => <Privacy /> },
  { path: '/terms', src: `${P}/Terms.tsx`, element: () => <Terms /> },
  { path: '/cookies', src: `${P}/Cookies.tsx`, element: () => <Cookies /> },
  { path: '/safeguarding', src: `${P}/Safeguarding.tsx`, element: () => <Safeguarding /> },
  { path: '/accessibility', src: `${P}/Accessibility.tsx`, element: () => <Accessibility /> },
  { path: '/embed', src: `${P}/seo/EmbedPage.tsx`, element: () => <EmbedPage /> },
  { path: '/press', src: `${P}/seo/PressPage.tsx`, element: () => <PressPage /> },
  { path: '/free-resources', src: `${P}/seo/FreeResourcesPage.tsx`, element: () => <FreeResourcesPage /> },
  { path: '/for-teachers', src: `${P}/seo/ForTeachersPage.tsx`, element: () => <ForTeachersPage /> },
  { path: '/for-parents', src: `${P}/seo/ForParentsPage.tsx`, element: () => <ForParentsPage /> },
  { path: '/learn', src: `${P}/seo/LearnHubPage.tsx`, element: () => <LearnHubPage /> },
];

// Education audience pages — slug is the path without the leading slash.
const EDUCATION_SLUGS = ['for-homeschool', 'for-preschool', 'for-kindergarten'];

// Learn articles — keep in sync with ARTICLES in LearnArticlePage.tsx.
const LEARN_SLUGS = [
  'hand-tracking-for-kids',
  'gesture-learning',
  'drawing-skills-for-children',
  'early-childhood-motor-skills',
  'ai-for-kids',
  'screen-time-alternatives',
];

// Use-case landing pages — keep in sync with getRouteFromPath in main.tsx.
const USECASE_SLUGS = [
  'gesture-learning',
  'classroom-movement-activities',
  'chromebook-learning-tools',
  'homeschool-movement-learning',
  'hand-eye-coordination-activities',
  'ai-learning-tools-for-kids',
];

// Standard activity pages. '/free-paint' is the canonical free-paint URL.
const ACTIVITY_ROUTES: Array<{ path: string; slug: string }> = [
  { path: '/activities/bubble-pop', slug: 'bubble-pop' },
  { path: '/activities/sort-and-place', slug: 'sort-and-place' },
  { path: '/activities/letter-tracing', slug: 'letter-tracing' },
  { path: '/free-paint', slug: 'free-paint' },
];

// Seasonal + viral pages — keys must exist in SPECIAL_DATA
// (SpecialActivityPage.tsx). Seasonal live under /activities/<slug>;
// the three viral challenges are top-level paths (see main.tsx).
// NOTE: /draw-heart-in-air, /draw-star-in-air and /draw-alphabet-in-air
// exist in PAGE_META but have no SPECIAL_DATA entry and no router match —
// they fall through to the Landing page, so they are intentionally NOT
// body-prerendered until that drift is fixed.
const SPECIAL_ACTIVITY_SLUGS = [
  'christmas-drawing-for-kids',
  'halloween-drawing-kids',
  'back-to-school-activities',
  'valentines-drawing-kids',
  'easter-drawing-kids',
  'summer-activities-kids',
  'thanksgiving-kids-activities',
  'mothers-day-drawing-kids',
];
const VIRAL_PATHS = ['/draw-number-in-air', '/air-drawing-challenge', '/draw-circle-in-air'];

export const ROUTES: PrerenderRoute[] = [
  ...STATIC_ROUTES,

  ...EDUCATION_SLUGS.map((slug) => ({
    path: `/${slug}`,
    src: `${P}/seo/EducationPage.tsx`,
    element: () => <EducationPage slug={slug as never} />,
  })),

  ...LEARN_SLUGS.map((slug) => ({
    path: `/learn/${slug}`,
    src: `${P}/seo/LearnArticlePage.tsx`,
    element: () => <LearnArticlePage slug={slug as never} />,
  })),

  ...USECASE_SLUGS.map((slug) => ({
    path: `/${slug}`,
    src: `${P}/seo/UseCasePage.tsx`,
    element: () => <UseCasePage slug={slug as never} />,
  })),

  ...ACTIVITY_ROUTES.map(({ path, slug }) => ({
    path,
    src: `${P}/seo/ActivityPage.tsx`,
    element: () => <ActivityPage slug={slug as never} />,
  })),

  ...SPECIAL_ACTIVITY_SLUGS.map((slug) => ({
    path: `/activities/${slug}`,
    src: `${P}/seo/SpecialActivityPage.tsx`,
    element: () => <SpecialActivityPage slug={slug as never} />,
  })),

  ...VIRAL_PATHS.map((path) => ({
    path,
    src: `${P}/seo/SpecialActivityPage.tsx`,
    element: () => <SpecialActivityPage slug={path.slice(1) as never} />,
  })),

  // Programmatic trace pages: 26 letters + 10 numbers + 8 shapes.
  // '/letter-tracing' is intentionally absent: TracePage canonicalises it
  // to /trace-a, which would fight PAGE_META's '/letter-tracing' canonical.
  // It keeps its head-only prerender until that conflict is resolved.
  ...LETTERS.map((l) => ({
    path: `/trace-${l.toLowerCase()}`,
    src: `${P}/seo/TracePage.tsx`,
    element: () => <TracePage type="letter" value={l.toLowerCase()} />,
  })),
  ...NUMBERS.map((n) => ({
    path: `/trace-number-${n}`,
    src: `${P}/seo/TracePage.tsx`,
    element: () => <TracePage type="number" value={n} />,
  })),
  ...SHAPES.map((s) => ({
    path: `/trace-${s}`,
    src: `${P}/seo/TracePage.tsx`,
    element: () => <TracePage type="shape" value={s} />,
  })),
];

// ─── Renderer ───────────────────────────────────────────────────────────────

export interface PrerenderResult {
  /** Rendered body HTML for injection inside #root. */
  html: string;
  /** Helmet-managed head tags as raw HTML strings. */
  head: {
    title: string;
    meta: string;
    link: string;
    script: string;
  };
}

export function prerenderRoute(route: PrerenderRoute): PrerenderResult {
  const helmetContext: { helmet?: HelmetServerState } = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={route.path}>
        <KidStyles />
        {route.element()}
      </StaticRouter>
    </HelmetProvider>,
  );

  const h = helmetContext.helmet;
  return {
    html,
    head: {
      title: h ? h.title.toString() : '',
      meta: h ? h.meta.toString() : '',
      link: h ? h.link.toString() : '',
      script: h ? h.script.toString() : '',
    },
  };
}
