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
import {
  ACTIVITY_ROUTES,
  EDUCATION_SLUGS,
  LEARN_SLUGS,
  SPECIAL_ACTIVITY_SLUGS,
  STATIC_PATHS,
  USECASE_SLUGS,
  VIRAL_PATHS,
  type StaticPath,
} from './seo/prerender-paths';

// ─── Route table ────────────────────────────────────────────────────────────
// The path lists live in src/seo/prerender-paths.ts (pure data, unit-tested
// against robots.txt). This file pairs each path with its page component.
// `src` is the page component's source path, used by the prerender script to
// look up that route's CSS/JS chunks in the client build manifest so the
// static HTML links the right stylesheets (no flash of unstyled content).

export interface PrerenderRoute {
  path: string;
  src: string;
  element: () => ReactElement;
}

const P = 'src/pages';

type StaticPage = Omit<PrerenderRoute, 'path'>;

// Keyed by StaticPath so adding a path in prerender-paths.ts without a
// component here (or the reverse) is a type error.
const STATIC_PAGES: Record<StaticPath, StaticPage> = {
  '/': { src: `${P}/Landing.tsx`, element: () => <Landing /> },
  '/faq': { src: `${P}/FAQ.tsx`, element: () => <FAQ /> },
  '/schools': { src: `${P}/Schools.tsx`, element: () => <Schools /> },
  '/schools/training': { src: `${P}/Training.tsx`, element: () => <Training /> },
  '/school': { src: `${P}/SchoolPilot.tsx`, element: () => <SchoolPilot /> },
  '/teachers': { src: `${P}/Teachers.tsx`, element: () => <Teachers /> },
  '/pricing': { src: `${P}/Pricing.tsx`, element: () => <Pricing /> },
  '/about': { src: `${P}/About.tsx`, element: () => <About /> },
  '/privacy': { src: `${P}/Privacy.tsx`, element: () => <Privacy /> },
  '/terms': { src: `${P}/Terms.tsx`, element: () => <Terms /> },
  '/cookies': { src: `${P}/Cookies.tsx`, element: () => <Cookies /> },
  '/safeguarding': { src: `${P}/Safeguarding.tsx`, element: () => <Safeguarding /> },
  '/accessibility': { src: `${P}/Accessibility.tsx`, element: () => <Accessibility /> },
  '/embed': { src: `${P}/seo/EmbedPage.tsx`, element: () => <EmbedPage /> },
  '/press': { src: `${P}/seo/PressPage.tsx`, element: () => <PressPage /> },
  '/free-resources': { src: `${P}/seo/FreeResourcesPage.tsx`, element: () => <FreeResourcesPage /> },
  '/for-teachers': { src: `${P}/seo/ForTeachersPage.tsx`, element: () => <ForTeachersPage /> },
  '/for-parents': { src: `${P}/seo/ForParentsPage.tsx`, element: () => <ForParentsPage /> },
  '/learn': { src: `${P}/seo/LearnHubPage.tsx`, element: () => <LearnHubPage /> },
};

const STATIC_ROUTES: PrerenderRoute[] = STATIC_PATHS.map((path) => ({ path, ...STATIC_PAGES[path] }));

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
