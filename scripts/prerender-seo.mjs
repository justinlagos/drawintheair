/**
 * prerender-seo.mjs — static HTML for the marketing/SEO routes.
 *
 * v1 (head-only) HISTORY: the app is a client-rendered SPA and Vercel
 * rewrites every URL to the same dist/index.html, so Googlebot saw dozens
 * of byte-identical documents with no canonical. v1 fixed that by writing
 * dist/<route>/index.html with per-route <head> tags — but the BODY stayed
 * the boot splash, so non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot,
 * social scrapers, Googlebot's first pass) still received ~25 words.
 *
 * v2 (this file) adds FULL BODY prerendering:
 *   Pass 1 — identical to v1: per-route head injection from PAGE_META for
 *            every declared canonical. This is the safety net; it runs even
 *            if SSR fails, so behaviour can never regress below v1.
 *   Pass 2 — imports the SSR bundle built from src/entry-prerender.tsx
 *            (`vite build --ssr`, see package.json "build") and, for every
 *            route it declares:
 *              - renders the real page component to HTML,
 *              - replaces the boot splash between the <!--dia-ssr-start-->
 *                / <!--dia-ssr-end--> markers in index.html with it,
 *              - swaps the template head for the page's own Helmet output
 *                (title, description, canonical, OG/Twitter, JSON-LD) when
 *                the page renders an <SEOMeta>, since that is richer and
 *                covers routes PAGE_META never knew about (trace pages),
 *              - injects <link rel="stylesheet"> for the page chunk's CSS
 *                (from dist/.vite/manifest.json) so humans don't see a
 *                flash of unstyled content, plus a modulepreload for the
 *                chunk itself,
 *              - writes dist/<route>/index.html.
 *
 * ROOT SPECIAL CASE: dist/index.html doubles as the SPA fallback for app
 * routes (/play, /class, /join, /parent/*, …) via the vercel.json rewrite.
 * The homepage body is therefore injected together with a hidden copy of
 * the boot splash and a tiny inline script: on any pathname other than '/'
 * it hides the prerendered landing content and shows the splash, so app
 * visitors never see a homepage flash. No-JS crawlers fetching '/' still
 * get the full landing HTML.
 *
 * SAFETY: additive and fault-tolerant, same contract as v1. Any per-route
 * SSR error is logged and that route keeps its Pass 1 head-only file. Any
 * top-level error leaves the build green.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = process.env.DIST_DIR || 'dist';
const SSR_DIST = process.env.SSR_DIST_DIR || 'dist-ssr';
const SRC_CONFIG = 'src/seo/seo-config.ts';

const MARK_START = '<!--dia-ssr-start-->';
const MARK_END = '<!--dia-ssr-end-->';

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

/** Pass 1: per-route copy of the index.html head (v1 behaviour, unchanged). */
function renderHead(template, { url, title, description }) {
  let html = template;
  const canonicalTag = `<link rel="canonical" href="${escAttr(url)}" />`;

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
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[\s\S]*?("\s*\/?>)/i, `$1${escAttr(url)}$2`);

  return html;
}

/** react-helmet-async v3 under React 19's renderToString does NOT collect
 *  tags into the server context — the <Helmet> children render inline into
 *  the body instead. Browsers tolerate that for JSON-LD, but Google ignores
 *  a rel=canonical outside <head> and a duplicate <title> is a defect. So:
 *  pull every metadata tag out of the rendered body and return them for
 *  head insertion. JSON-LD is extracted first so the <meta>/<link> regexes
 *  can never touch script content. Future-proof: if helmet's server context
 *  starts working again, the body simply contains no such tags and this is
 *  a no-op. */
function extractHeadTags(appHtml) {
  const parts = [];
  let html = appHtml;
  const patterns = [
    /<script\s+[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
    /<title[^>]*>[\s\S]*?<\/title>/gi,
    /<meta\s[^>]*?\/?>(?:<\/meta>)?/gi,
    /<link\s[^>]*?\/?>(?:<\/link>)?/gi,
  ];
  for (const re of patterns) {
    html = html.replace(re, (m) => {
      parts.push(m);
      return '';
    });
  }
  return { bodyHtml: html, tags: parts, hasTitle: parts.some((t) => t.startsWith('<title')) };
}

/** Swap the template's title/description/OG/Twitter block for the page's
 *  own Helmet output. Only called when the page produced a <title>. */
function applyHelmetHead(html, head) {
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
  html = html.replace(/<meta\s+name="description"[^>]*>\s*/i, '');
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');
  html = html.replace(/<link\s+rel="canonical"[^>]*>\s*/i, '');

  const block = [head.title, head.meta, head.link, head.script, head.extra]
    .filter(Boolean)
    .join('\n  ');
  return html.replace(/<\/head>/i, `  ${block}\n</head>`);
}

/** Walk the client build manifest from a page source file, collecting the
 *  chunk's CSS files (own + static imports) and the chunk file itself. */
function chunkAssets(manifest, srcKey) {
  const css = new Set();
  const seen = new Set();
  const walk = (key) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    const entry = manifest[key];
    if (!entry) return;
    for (const c of entry.css || []) css.add(c);
    for (const imp of entry.imports || []) walk(imp);
  };
  walk(srcKey);
  return { css: [...css], file: manifest[srcKey]?.file };
}

/** Inject stylesheet links / modulepreload not already present. */
function injectAssets(html, { css, file }) {
  const tags = [];
  for (const c of css) {
    if (!html.includes(c)) tags.push(`<link rel="stylesheet" href="/${c}" />`);
  }
  if (file && !html.includes(file)) {
    tags.push(`<link rel="modulepreload" href="/${file}" />`);
  }
  if (!tags.length) return html;
  return html.replace(/<\/head>/i, `  ${tags.join('\n  ')}\n</head>`);
}

/** Replace the SSR outlet (between markers) with `inner`. Returns null if
 *  the markers are missing so callers can fall back to head-only output. */
function injectBody(html, inner) {
  const start = html.indexOf(MARK_START);
  const end = html.indexOf(MARK_END);
  if (start === -1 || end === -1 || end < start) return null;
  return html.slice(0, start) + inner + html.slice(end + MARK_END.length);
}

/** Extract the splash markup from the template so the root file can keep a
 *  hidden copy for SPA-fallback routes. */
function extractSplash(template) {
  const start = template.indexOf(MARK_START);
  const end = template.indexOf(MARK_END);
  if (start === -1 || end === -1) return '';
  return template.slice(start + MARK_START.length, end);
}

const outFileFor = (path) =>
  path === '/' ? join(DIST, 'index.html') : join(DIST, path.replace(/^\//, ''), 'index.html');

async function main() {
  const { SITE, PAGE_META } = await loadConfig();
  if (!SITE?.url || !PAGE_META) throw new Error('seo-config did not yield SITE.url / PAGE_META');

  // Pass 2 consumes the SSR outlet markers when it overwrites the root
  // index.html, so a standalone re-run of this script would otherwise see a
  // marker-less "template" and stamp the homepage body onto every route.
  // Keep a pristine copy alongside dist and prefer it when the live file
  // has already been injected. (A fresh `vite build` always restores the
  // pristine index.html, so the normal pipeline never needs the backup.)
  const backupPath = join(DIST, '.prerender-template.html');
  let template = await readFile(join(DIST, 'index.html'), 'utf8');
  if (!template.includes(MARK_START)) {
    try {
      const backup = await readFile(backupPath, 'utf8');
      if (backup.includes(MARK_START)) {
        template = backup;
        console.log('[prerender-seo] dist/index.html already injected; using pristine template backup.');
      }
    } catch {
      /* no backup — head-only fallback below */
    }
  }
  if (template.includes(MARK_START)) {
    await writeFile(backupPath, template, 'utf8');
  }
  const base = SITE.url.replace(/\/$/, '');

  // ── Pass 1: head-only prerender for every PAGE_META canonical (v1) ──
  let headOnly = 0;
  for (const key of Object.keys(PAGE_META)) {
    const meta = PAGE_META[key];
    const path = meta?.canonical;
    if (!path || typeof path !== 'string' || !path.startsWith('/')) continue;
    if (REDIRECTED.has(path)) continue;

    const url = base + (path === '/' ? '/' : path);
    const html = renderHead(template, { url, title: meta.title, description: meta.description });
    const outFile = outFileFor(path);
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html, 'utf8');
    headOnly++;
  }
  console.log(`[prerender-seo] pass 1: wrote ${headOnly} head-only route file(s).`);

  // ── Pass 2: full-body SSR ──
  if (!template.includes(MARK_START)) {
    console.warn('[prerender-seo] pass 2 skipped: SSR outlet markers missing from index.html.');
    return;
  }

  let ssrMod;
  try {
    ssrMod = await import(pathToFileURL(join(process.cwd(), SSR_DIST, 'entry-prerender.js')).href);
  } catch (err) {
    console.warn('[prerender-seo] pass 2 skipped: SSR bundle not importable:', err?.message || err);
    return;
  }

  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(join(DIST, '.vite', 'manifest.json'), 'utf8'));
  } catch {
    console.warn('[prerender-seo] no client manifest; per-route CSS links skipped.');
  }

  const splash = extractSplash(template);
  const hiddenSplash = splash.replace('display:flex', 'display:none');
  // Root doubles as the SPA fallback: hide the prerendered landing and show
  // the splash on any pathname other than '/'.
  const rootGuard =
    `<script>(function(){try{if(location.pathname!=='/'){` +
    `var s=document.getElementById('dia-ssr');if(s)s.style.display='none';` +
    `var b=document.getElementById('boot-splash');if(b)b.style.display='flex';` +
    `}}catch(e){}})();</script>`;

  let full = 0;
  let failed = 0;
  for (const route of ssrMod.ROUTES || []) {
    if (REDIRECTED.has(route.path)) continue;
    try {
      const { html: appHtml, head } = ssrMod.prerenderRoute(route);
      if (!appHtml || appHtml.length < 200) {
        // A page that rendered (near-)nothing would replace the splash with
        // a blank screen. Keep the Pass 1 file instead.
        console.warn(`[prerender-seo] ${route.path}: rendered ${appHtml?.length ?? 0} chars, kept head-only file.`);
        failed++;
        continue;
      }

      // Hoist metadata that rendered inline into the body (see
      // extractHeadTags) and merge with anything helmet's server context
      // did manage to collect.
      const { bodyHtml, tags, hasTitle } = extractHeadTags(appHtml);
      const headParts = [head.title, head.meta, head.link, head.script, ...tags].filter(Boolean);

      // Start from the Pass 1 file when one exists (it already carries the
      // PAGE_META head). Fall back to the pristine template when the file
      // is missing or was already injected by a previous run (no markers).
      let html;
      try {
        html = await readFile(outFileFor(route.path), 'utf8');
        if (!html.includes(MARK_START)) html = template;
      } catch {
        html = template;
      }

      if (hasTitle || head.title) {
        html = applyHelmetHead(html, {
          title: '',
          meta: '',
          link: '',
          script: '',
          extra: headParts.join('\n  '),
        });
      }
      // Every prerendered URL gets a self-canonical if the page didn't
      // declare one (e.g. top-level pages without <SEOMeta>). Without it,
      // near-identical sibling pages risk "duplicate without canonical".
      if (!/rel="canonical"/i.test(html)) {
        const selfUrl = base + (route.path === '/' ? '/' : route.path);
        html = html.replace(/<\/head>/i, `  <link rel="canonical" href="${escAttr(selfUrl)}" />\n</head>`);
      }
      html = injectAssets(html, chunkAssets(manifest, route.src));

      const inner =
        route.path === '/'
          ? `<div id="dia-ssr">${bodyHtml}</div>${hiddenSplash}${rootGuard}`
          : `<div id="dia-ssr">${bodyHtml}</div>`;

      const injected = injectBody(html, inner);
      if (!injected) {
        console.warn(`[prerender-seo] ${route.path}: outlet markers missing, kept head-only file.`);
        failed++;
        continue;
      }

      const outFile = outFileFor(route.path);
      await mkdir(dirname(outFile), { recursive: true });
      await writeFile(outFile, injected, 'utf8');
      full++;
    } catch (err) {
      failed++;
      console.warn(`[prerender-seo] ${route.path}: SSR failed (${err?.message || err}), kept head-only file.`);
    }
  }
  console.log(`[prerender-seo] pass 2: wrote ${full} full-body route file(s)${failed ? `, ${failed} kept head-only` : ''}.`);
}

main().catch((err) => {
  // Never fail the build — the SPA fallback (index.html via rewrite) still works.
  console.warn('[prerender-seo] skipped (non-fatal):', err?.message || err);
});
