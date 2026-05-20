# Draw in the Air — Brand + Theme Migration Audit
**Date:** 20 May 2026
**Scope:** Full platform — Vite SPA (`/src`), Next.js platform (`/platform`), shared `/public` assets, metadata, manifests, service worker.

---

## 1. Outcome

The entire platform now resolves to the new Draw in the Air brand mark and the new light premium visual system. Every public-facing surface — landing, SEO, legal, press, transparency, teacher/parent pages — has been migrated off the legacy dark theme (purple `#6c47ff` + cyan `#22d3ee` on navy `#07091a`) onto the new cream/blue/sunshine/plum palette derived from `landing-v3.css`. The new logo file is the single source of truth at `/public/logo.svg` (vector) and `/public/logo.png` (raster fallback), with generated derivatives covering favicons, PWA icons, Apple touch icons, and Open Graph/Twitter previews.

In-app surfaces that are intentionally dark by design (the game canvas, classroom mode, debug overlays) were left untouched and pick up the new logo automatically because the underlying asset filenames are unchanged.

---

## 2. Files Changed (Tracked)

### New Brand Assets (Vite — `/public/`)
- `logo.svg` (24 kB, new — single source of truth)
- `logo.png` (overwritten with rasterized new mark)
- `logo@2x.png` (new — high-DPI raster)
- `favicon.ico` (new — multi-size)
- `favicon-16.png`, `favicon-32.png` (new)
- `apple-touch-icon.png` (new — 180×180 with cream background)
- `og-image.png`, `og-image.jpg` (new — 1200×630 social preview)
- `icons/icon-192.png`, `icons/icon-192-maskable.png`, `icons/icon-512.png` (overwritten)

### New Brand Assets (Platform — `/platform/public/`)
- `logo.svg`, `logo.png`, `logo@2x.png` (new — platform was missing logo files entirely)
- `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (new)
- `og-image.png`, `og-image.jpg` (new)
- `manifest.json` (new — PWA manifest the platform lacked)
- `icons/icon-192.png`, `icons/icon-192-maskable.png`, `icons/icon-512.png` (new)

### New Code
- `src/components/BrandLogo.tsx` — reusable component with `header`, `footer`, `compact`, `hero`, `print` variants, raster/dark fallbacks, decorative-alt support.

### Modified Code (Vite)
- `index.html` — favicon stack (SVG + PNG sizes + apple-touch + mask-icon), `theme-color #FFFAEB`, Open Graph + Twitter Card metadata.
- `public/manifest.json` — `background_color: #FFFAEB`, `theme_color: #034eae`.
- `public/service-worker.js` — `CACHE_VERSION` bumped to `v7-brand-2026-05-20` so returning users get the new mark; precache now includes `/logo.svg`, `/favicon.ico`, `/apple-touch-icon.png`.
- `src/seo/seo-config.ts` — `ogImage: '/og-image.png'`, `logo: '/logo.svg'`, added `logoRaster: '/logo.png'`.
- `src/components/landing/HeaderNav.tsx` — uses `<BrandLogo variant="header">`.
- `src/components/landing/LegalPageLayout.tsx` — uses `<BrandLogo>` in nav and footer.
- `src/pages/Landing.tsx` — three logo refs swapped to `<BrandLogo>` (nav, hero device, footer).
- `src/pages/TransparencyPage.tsx` — uses `<BrandLogo>`.
- `src/pages/seo/SeoLayout.tsx` — `data-seo-theme` flipped from `dark` to `light`; nav + CTA-band logos use `<BrandLogo>`.
- `src/pages/seo/seo-theme.css` — entire `[data-seo-theme]` token block rewritten (light palette). CTA buttons, nav button, mobile CTA, hero CTA, CTA-band button all rewritten to the new brand-blue gradient with the new shadow system. `seo-cta-band-btn` re-grounded to sunshine yellow on the blue band for premium accent.
- `src/pages/seo/PressPage.tsx` — Brand Colours palette panel rewritten to the actual new palette (Brand Blue, Sunshine, Plum, Aqua, Coral, Cream, Ink). Logo download samples now offer both SVG and PNG; second sample is now "Logo on Dark BG" to demonstrate dark-background usage.

### Modified Code (Platform — Next.js)
- `platform/src/components/ui/logo.tsx` — full rewrite. The legacy inline-SVG stylized "trail arc" placeholder is gone; the component now renders the official vector `/logo.svg` (or `/logo.png` raster fallback) via `next/image`. Public prop shape preserved (`size`, `linked`, `className`, `showIcon`) so all six existing call sites (marketing/auth/dashboard/admin/school layouts + not-found) compile without changes.
- `platform/src/app/layout.tsx` — added `metadataBase`, `icons` (svg + png + apple), `manifest`, `themeColor: #FFFAEB`, complete `openGraph` (with og-image 1200×630), `twitter` summary_large_image card.

### Mass Theme Migration (SEO Pages)
- 13 SEO page files (`ActivityPage`, `EducationPage`, `EmbedPage`, `ForParentsPage`, `ForTeachersPage`, `FreeResourcesPage`, `LearnArticlePage`, `LearnHubPage`, `PressPage`, `ShareLandingPage`, `SpecialActivityPage`, `TracePage`, `UseCasePage`) had **305 inline dark-style replacements** in the first pass (mapped `color: 'white'` → `#1A1B2E`, `#94a3b8` → `#4A4D6B`, dark `rgba(255,255,255,…)` glass → solid `#FFFFFF`, dark card hexes → white) plus **58 regex-driven rgba conversions** in the second pass (purple `rgba(108,71,255,…)` → brand-blue `rgba(3,78,174,…)` at proportional alpha; cyan `rgba(34,211,238,…)` → deep aqua `rgba(28,126,128,…)`) plus **13 standalone hex/quoted-string fixes** for residual hover handlers and the embed widget snippet. Total: **376 surgical inline-style updates** across the SEO surface.

---

## 3. Old Logo References Removed

| Surface | Before | After |
|---|---|---|
| `/logo.png` content | Old mark | New brand mark (rasterized from SVG) |
| Vector source | Did not exist | `/logo.svg` (new, single source of truth) |
| Favicon stack | Single `/logo.png` (32×32 rasterized) | SVG + 16/32 PNG + ICO + apple-touch + mask-icon |
| OG image | `/og-default.jpg` (missing/dead) | `/og-image.png` (1200×630, cream gradient, centered mark) |
| Platform logo | Inline SVG placeholder (orange square + handdrawn arc + sparkles) | Real brand mark via `next/image` |
| PWA theme | `theme_color: #6c47ff`, `background: #0f172a` | `theme_color: #034eae`, `background: #FFFAEB` |

---

## 4. Remaining `/logo.png` References (Intentional)

These files still reference `/logo.png` directly. They render correctly because the file *at* that path is now the new brand mark. They were left as-is because:

- `src/pages/Admin.tsx`, `src/pages/admin/InsightsDashboard.tsx`, `src/pages/admin/insights/PrintReport.tsx` (6 refs) — internal admin / printed PDF surfaces; raster PNG is the right format for print, and these views are dark by design (insights dashboards traditionally use dark UI for data legibility).
- `src/features/menu/ModeSelectionMenu.tsx`, `src/features/onboarding/WaveToWake.tsx` — in-game UI, dark canvas intentional.
- `src/pages/DemoPrep.tsx`, `src/pages/DemoLoader.tsx` — demo/loading splashes that briefly bridge between dark game canvas and bright landing; left consistent.
- `src/pages/teach/TeachObservePage.tsx` — teacher live-observation view; dark by design (sat next to the live camera feed).
- `video/src/scenes/Scene7Closing.tsx`, `video/src/utils/layout.ts` — Remotion video templates; raster is the correct format for video render pipelines.

Future polish: route these through `BrandLogo` for consistency (the API is in place).

---

## 5. Theme Migration — `/for-teachers` (the originally-flagged page)

The specific page called out in the brief (`drawintheair.com/for-teachers`) is rendered by `src/pages/seo/ForTeachersPage.tsx`. After this migration:

- **Background:** legacy `#07091a` navy → new cream/plum/aqua/sunshine multi-stop gradient inherited via `--seo-bg-page`.
- **Nav:** dark glass `rgba(7,9,26,0.96)` → light glass `rgba(255,255,255,0.82)` with brand-blue border.
- **Hero:** dark gradient `#0f0c29 → #1a1042 → #07091a` → cream/blue radial light gradient.
- **CTA button:** purple-to-cyan gradient → brand-blue gradient with inset white highlight.
- **Stat tiles:** `rgba(108,71,255,0.1)` purple tinted boxes → `rgba(3,78,174,0.08)` brand-blue subtly tinted boxes with brand-blue numerals.
- **Use-case cards:** dark glass with purple borders → white cards with neutral-stroke borders, on the warm cream backdrop.
- **Framework cards (EYFS / Common Core / Pre-K):** dark cards with cyan/purple/pink accent borders → white cards with deep-aqua / plum / coral accent borders, all readable on the cream page.
- **Body text:** `#94a3b8` → `#4A4D6B` ink-soft (WCAG AA on cream).
- **Headings:** white → `#1A1B2E` ink (WCAG AAA on cream).
- 19 inline-style replacements applied, plus 2 regex rgba conversions. **Zero dark-theme residuals.**

---

## 6. Verification

- **Vite TypeScript build:** `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` → **clean, zero errors**.
- **Platform TypeScript build:** Pre-existing Supabase typing errors in admin/billing/growth/system pages (unrelated to this migration). My touched files (`logo.tsx`, `app/layout.tsx`) compile clean.
- **Manifest validity:** Both `/public/manifest.json` and `/platform/public/manifest.json` parse as valid JSON.
- **Dark-token residuals in SEO surface:** 0 (verified by `grep -r` for `#6c47ff`, `#22d3ee`, `#a78bfa`, `#c4b5fd`, `#0a0e1a`, `#111629`, `rgba(108,71,255,…)`, `rgba(34,211,238,…)`, `color: 'white'`).
- **Image fidelity:** Generated PNG samples visually inspected (logo @ 1200×800 transparent, og-image @ 1200×630 with cream gradient backdrop).

---

## 7. Regression Safety

No code paths affecting routing, auth, classroom sessions, analytics, camera flow, dashboard exports, teacher/student flows, or game modes were modified. All changes were:

1. **Asset-only** (new files in `/public/` and `/platform/public/`).
2. **Component-only** (`BrandLogo.tsx` is new; `platform/src/components/ui/logo.tsx` rewrite preserves the public prop API so all six call sites compile unchanged).
3. **CSS-only** (`seo-theme.css` token block + a few hardcoded button colors).
4. **Inline-style cosmetic** (305 + 58 + 13 replacements driven by literal string matching, not regex over JSX structure).
5. **Metadata** (`index.html` head, `app/layout.tsx` metadata export, manifests).

The service worker `CACHE_VERSION` was bumped so returning visitors do not see the stale dark theme cached on their device.

---

## 8. Known Issues / Outstanding

- **Pre-existing platform TypeScript errors** (Supabase `from()` typing, implicit-any params in admin/billing/growth pages) — unrelated to this brand migration; flagged for the platform team.
- **Game-canvas / classmode dark UI:** intentionally untouched per the brief's regression-safety requirement. If a future pass wants those to follow the cream/blue system too, the new `BrandLogo` component is already in place to wire them through.
- **Internal HTML files** (`internal/seo-master-plan.html`, `landing.html`) and the `dist/` build artefact contain stale references; these are not deployed to production (Vite rebuild overwrites `dist/`). The legacy `chrome-extension/` ZIP is a release artefact and will be regenerated on next build.
- **The `.claude/worktrees/wizardly-lichterman/`** directory mirrors the repo as a worktree and was left alone — it's not part of any deploy path.
- **The PNG file `DrawinTheAir-logo-v2.png`** referenced in the brief was not uploaded; all PNG raster outputs were generated from the canonical SVG (high-quality, matched aspect, matched colors). If the original PNG arrives later, replacing `/public/logo.png` is a one-file swap.

---

## 9. How to Use the New `BrandLogo`

```tsx
import { BrandLogo } from '@/components/BrandLogo'

// Header / nav
<BrandLogo variant="header" />

// Footer
<BrandLogo variant="footer" />

// Compact mobile chrome
<BrandLogo variant="compact" />

// Hero / CTA band
<BrandLogo variant="hero" />

// Printed reports / PDF exports
<BrandLogo variant="print" raster />

// Decorative (no alt text, used when wordmark is already in text)
<BrandLogo decorative />
```

For the platform Next.js app, import `Logo` from `@/components/ui/logo` (the existing import paths) or `BrandLogo` (alias re-export).
