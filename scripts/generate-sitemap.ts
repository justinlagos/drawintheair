// scripts/generate-sitemap.ts
//
// Generates public/sitemap.xml from a single source of truth so it cannot
// silently drift from the routes the app actually serves.
//
// WHAT GOES IN THE SITEMAP: only indexable, self-canonical URLs. That means
//   - the curated marketing / legal / learn pages (CANONICAL_MARKETING),
//   - the programmatic tracing spokes + the /letter-tracing hub,
//   - the seasonal, viral and use-case landing pages,
// and deliberately EXCLUDES:
//   - robots-blocked surfaces (/school, /parent/*, /admin, /demo, the app),
//   - non-canonical duplicates (/activities/letter-tracing → the hub owns
//     that topic; /stem-learning → 301),
//   - thin/utility pages we don't want competing in search (/pricing, /about).
// Changing what is indexed is a deliberate editorial act — edit the lists
// below, never let a route dump decide it.
//
// Run: `npx tsx scripts/generate-sitemap.ts` (or ts-node). Not wired into the
// production build; the committed public/sitemap.xml is the shipped artifact
// and this script reproduces it exactly.

import fs from 'fs';
import path from 'path';
import { LETTERS, NUMBERS, SHAPES } from '../src/seo/seo-config';
import {
  EDUCATION_SLUGS,
  LEARN_SLUGS,
  USECASE_SLUGS,
  SPECIAL_ACTIVITY_SLUGS,
  VIRAL_PATHS,
} from '../src/seo/prerender-paths';

// Curated, hand-picked canonical pages (marketing, legal, hubs). The curation
// — e.g. keeping /pricing and /about out — is editorial, so it is explicit
// here rather than derived from the prerender route list.
const CANONICAL_MARKETING = [
  '/',
  '/faq',
  '/schools',
  '/schools/training',
  '/parents',            // client-rendered, still a canonical indexable page
  '/teachers',           // canonical; /for-teachers 301s here
  '/free-paint',
  '/letter-tracing',     // the tracing hub (self-canonical)
  '/learn',
  '/embed',
  '/press',
  '/free-resources',
  '/privacy',
  '/terms',
  '/cookies',
  '/safeguarding',
  '/accessibility',
];

// Standard (non-seasonal) activity pages worth indexing. '/activities/letter-tracing'
// is intentionally omitted — the /letter-tracing hub owns that query.
const ACTIVITY_PATHS = ['/activities/bubble-pop', '/activities/sort-and-place'];

const routes: string[] = [
  ...CANONICAL_MARKETING,
  ...EDUCATION_SLUGS.map((s) => `/${s}`),
  ...USECASE_SLUGS.map((s) => `/${s}`),
  ...LEARN_SLUGS.map((s) => `/learn/${s}`),
  ...SPECIAL_ACTIVITY_SLUGS.map((s) => `/activities/${s}`),
  ...VIRAL_PATHS,
  ...ACTIVITY_PATHS,
  ...LETTERS.map((l) => `/trace-${l.toLowerCase()}`),
  ...NUMBERS.map((n) => `/trace-number-${n}`),
  ...SHAPES.map((s) => `/trace-${s}`),
];

// De-dupe defensively and sort for a stable, reviewable diff.
const unique = [...new Set(routes)].sort();

const date = new Date().toISOString().split('T')[0];
let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

unique.forEach((route) => {
  xml += `  <url>
    <loc>https://drawintheair.com${route}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>\n`;
});

xml += `</urlset>`;

const outputPath = path.resolve(process.cwd(), 'public', 'sitemap.xml');
fs.writeFileSync(outputPath, xml, 'utf8');
console.log(`Successfully generated sitemap with ${unique.length} URLs at ${outputPath}`);
