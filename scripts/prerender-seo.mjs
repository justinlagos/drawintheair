/**
 * prerender-seo.mjs — per-route static <head> for the marketing/SEO pages.
 *
 * WHY: the app is a client-rendered SPA. Vercel rewrites every URL to the
 * same dist/index.html, whose <head> only describes the homepage and has NO
 * <link rel="canonical">. So Googlebot sees dozens of URLs returning
 * byte-identical HTML with no per-page canonical, and reports
 * "Duplicate without user-selected canonical".
 *
 * FIX: after `vite build`, for every static route declared in
 * src/seo/seo-config.ts (PAGE_META), write dist/<route>/index.html — a copy
 * of index.html with that page's canonical, <title>, description and OG/
 * Twitter tags injected. Vercel serves these static files BEFORE the SPA
 * rewrite, so each URL ships its own canonical in the raw HTML. The body is
 * unchanged (still the SPA root), so React hydrates exactly as before — only
 * the crawler-visible <head> differs.
 *
 * SAFETY: this step is additive and fault-tolerant. It never edits the SPA
 * fallback behaviour and never throws — any error is logged and the build
 * still succeeds (the catch-all rewrite keeps serving index.html).
 *
 * Routes redirected at the edge (see vercel.json `redirects`) are skipped so
 * we don't emit a page for a URL that 301s away.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DIST = process.env.DIST_DIR || 'dist';
const SRC_CONFIG = 'src/seo/seo-config.ts';

// Paths that are 301-redirected in vercel.json — do not prerender these.
const REDIRECTED = new Set(['/stem-learning']);

function escAttr(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escText(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Load SITE + PAGE_META from the TS source by transpiling it in-memory.
 *  seo-config.ts has no imports, so this is safe to evaluate standalone. */
async function loadConfig() {
  const { transform } = await import('esbuild');
  const src = await readFile(SRC_CONFIG, 'utf8');
  const { code } = await transform(src, { loader: 'ts', format: 'esm' });
  const mod = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  return { SITE: mod.SITE, PAGE_META: mod.PAGE_META };
}

/** Produce a per-route copy of the index.html head. */
function renderHead(template, { url, title, description }, site) {
  let html = template;
  const canonicalTag = `<link rel="canonical" href="${escAttr(url)}" />`;

  // Canonical: replace an existing tag if present, else inject before </head>.
  if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(/<link\s+rel="canonical"[^>]*>/i, canonicalTag);
  } else {
    html = html.replace(/<\/head>/i, `  ${canonicalTag}\n</head>`);
  }

  if (title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escText(title)}</title>`);
    html = html.replace(/(<meta\s+property="og:title"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(title)}$2`);
    html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(title)}$2`);
  }
  if (description) {
    html = html.replace(/(<meta\s+name="description"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(description)}$2`);
    html = html.replace(/(<meta\s+property="og:description"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(description)}$2`);
    html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(description)}$2`);
  }
  // og:url always reflects the route.
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(url)}$2`);

  return html;
}

async function main() {
  const { SITE, PAGE_META } = await loadConfig();
  if (!SITE?.url || !PAGE_META) throw new Error('seo-config did not yield SITE.url / PAGE_META');

  const template = await readFile(join(DIST, 'index.html'), 'utf8');
  const base = SITE.url.replace(/\/$/, '');
  let written = 0;

  for (const key of Object.keys(PAGE_META)) {
    const meta = PAGE_META[key];
    const path = meta?.canonical;
    if (!path || typeof path !== 'string' || !path.startsWith('/')) continue;
    if (REDIRECTED.has(path)) continue;

    const url = base + (path === '/' ? '/' : path);
    const html = renderHead(template, { url, title: meta.title, description: meta.description }, SITE);

    // '/' overwrites the root index.html (gives the homepage its canonical);
    // every other route writes dist/<path>/index.html (directory index).
    const outFile = path === '/'
      ? join(DIST, 'index.html')
      : join(DIST, path.replace(/^\//, ''), 'index.html');

    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html, 'utf8');
    written++;
  }

  console.log(`[prerender-seo] wrote ${written} per-route HTML file(s).`);
}

main().catch((err) => {
  // Never fail the build — the SPA fallback (index.html via rewrite) still works.
  console.warn('[prerender-seo] skipped (non-fatal):', err?.message || err);
});
