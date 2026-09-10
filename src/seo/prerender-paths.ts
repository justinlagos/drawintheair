// src/seo/prerender-paths.ts
// The URL paths that the SSG build prerenders (94 routes in production).
//
// This module is pure data with no React or browser imports so that unit
// tests can read the public route list without loading page components.
// src/entry-prerender.tsx pairs each path with its page component; the
// type on STATIC_PAGES there fails the build if a static path is added
// here without a component, or vice versa.

import { LETTERS, NUMBERS, SHAPES } from './seo-config';

export const STATIC_PATHS = [
  '/',
  '/faq',
  '/schools',
  '/schools/training',
  '/school',
  '/teachers',
  '/pricing',
  '/about',
  '/privacy',
  '/terms',
  '/cookies',
  '/safeguarding',
  '/accessibility',
  '/embed',
  '/press',
  '/free-resources',
  '/learn',
  '/letter-tracing',
] as const;
// NOTE: '/for-teachers' and '/for-parents' were removed here when they became
// 301 redirects to /teachers and /parents (see vercel.json). Their content was
// migrated into those canonical pages.

export type StaticPath = (typeof STATIC_PATHS)[number];

// Education audience pages. Slug is the path without the leading slash.
export const EDUCATION_SLUGS = ['for-homeschool', 'for-preschool', 'for-kindergarten'] as const;

// Learn articles. Keep in sync with ARTICLES in LearnArticlePage.tsx.
export const LEARN_SLUGS = [
  'hand-tracking-for-kids',
  'gesture-learning',
  'drawing-skills-for-children',
  'early-childhood-motor-skills',
  'ai-for-kids',
  'screen-time-alternatives',
] as const;

// Use-case landing pages. Keep in sync with getRouteFromPath in main.tsx.
export const USECASE_SLUGS = [
  'gesture-learning',
  'classroom-movement-activities',
  'chromebook-learning-tools',
  'homeschool-movement-learning',
  'hand-eye-coordination-activities',
  'ai-learning-tools-for-kids',
] as const;

// Standard activity pages. '/free-paint' is the canonical free-paint URL.
export const ACTIVITY_ROUTES = [
  { path: '/activities/bubble-pop', slug: 'bubble-pop' },
  { path: '/activities/sort-and-place', slug: 'sort-and-place' },
  { path: '/activities/letter-tracing', slug: 'letter-tracing' },
  { path: '/free-paint', slug: 'free-paint' },
] as const;

// Seasonal pages. Keys must exist in SPECIAL_DATA (SpecialActivityPage.tsx).
// NOTE: /draw-heart-in-air, /draw-star-in-air and /draw-alphabet-in-air
// exist in PAGE_META but have no SPECIAL_DATA entry and no router match.
// They fall through to the Landing page, so they are intentionally NOT
// body-prerendered until that drift is fixed.
export const SPECIAL_ACTIVITY_SLUGS = [
  'christmas-drawing-for-kids',
  'halloween-drawing-kids',
  'back-to-school-activities',
  'valentines-drawing-kids',
  'easter-drawing-kids',
  'summer-activities-kids',
  'thanksgiving-kids-activities',
  'mothers-day-drawing-kids',
] as const;

// The three viral challenges are top-level paths (see main.tsx).
export const VIRAL_PATHS = ['/draw-number-in-air', '/air-drawing-challenge', '/draw-circle-in-air'] as const;

// Programmatic trace pages: 26 letters + 10 numbers + 8 shapes.
// '/letter-tracing' is NOT here — it is the dedicated hub in STATIC_PATHS
// (LetterTracingHubPage), self-canonicalising to /letter-tracing. These are
// its per-letter/number/shape spokes, each canonicalising to its own URL.
export const TRACE_PATHS: string[] = [
  ...LETTERS.map((l) => `/trace-${l.toLowerCase()}`),
  ...NUMBERS.map((n) => `/trace-number-${n}`),
  ...SHAPES.map((s) => `/trace-${s}`),
];

/** Every path the SSG build prerenders, in build order. */
export const PRERENDER_PATHS: string[] = [
  ...STATIC_PATHS,
  ...EDUCATION_SLUGS.map((slug) => `/${slug}`),
  ...LEARN_SLUGS.map((slug) => `/learn/${slug}`),
  ...USECASE_SLUGS.map((slug) => `/${slug}`),
  ...ACTIVITY_ROUTES.map((r) => r.path),
  ...SPECIAL_ACTIVITY_SLUGS.map((slug) => `/activities/${slug}`),
  ...VIRAL_PATHS,
  ...TRACE_PATHS,
];
