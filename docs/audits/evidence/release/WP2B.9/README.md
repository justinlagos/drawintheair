# WP2B.9: robots.txt prefix rules (DIA-017)

Branch `wp/2b9`. Evidence date 2026-09-07.

## What was wrong

`public/robots.txt` had `Disallow: /school` and `Disallow: /parent` in the `User-agent: *` group. robots.txt rules are prefix matches, so those two lines also blocked `/schools`, `/schools/training` and `/parents`. All three are prerendered marketing pages that are submitted in `sitemap.xml`, so Search Console would report them as "Blocked by robots.txt" and Googlebot could not read their content or canonicals.

## What changed

1. `public/robots.txt`: the two prefix rules became four exact or nested rules.

   ```
   Disallow: /school$
   Disallow: /school/
   Disallow: /parent$
   Disallow: /parent/
   ```

   `$` is the end-of-URL anchor supported by Google, Bing and most crawlers. A crawler that ignores `$` treats `/school$` as a literal prefix that matches nothing, and `/school/` as a prefix; in that case `/school` and `/parent` themselves become crawlable, which is harmless (the parent routes redirect to login client-side). `/admin`, `/demo` and `/*?debug=` are unchanged. The stray em dash in the header comment was removed. A comment in the file explains the rule shape.

2. `src/seo/prerender-paths.ts` (new): the list of paths the SSG build prerenders, as pure data with no React imports. `src/entry-prerender.tsx` now reads its path lists from this module and pairs each static path with its page component through a `Record<StaticPath, ...>`, so adding a path in one file without the other is a type error. The route list, order and count (93) are unchanged.

3. `tests/robots.test.ts` (new): parses the real `public/robots.txt` with a small matcher (longest matching pattern wins, `*` wildcard, `$` anchor, Allow wins a tie) and checks:
   - the prerender list has exactly 93 unique paths;
   - no public prerendered route is disallowed;
   - `/schools`, `/schools/training`, `/parents`, `/parents/setup`, `/teachers` are allowed;
   - `/school`, `/parent`, `/parent/dashboard`, `/admin`, `/demo`, `/play?debug=1` are still blocked.

## Decision: `/school` stays blocked

`/school` is the School Pilot Application form (`src/pages/SchoolPilot.tsx`). It is one of the 93 prerendered routes, but it is not in the sitemap, is not linked from any page, and the audit route map records it as "intentional, robots-blocked". The test therefore exempts exactly that one path. If the founder wants the form indexed, delete the two `/school` lines from robots.txt and remove `/school` from `INTENTIONALLY_BLOCKED` in the test.

## How verified

- `npm ci` clean.
- `npm run type-check`: pass.
- `npm run lint`: 0 errors, 162 warnings (ratchet unchanged).
- `npm test`: all files pass including `tests/robots.test.ts` (7 tests).
- `npm run build`: `[prerender-seo] pass 2: wrote 93 full-body route file(s)`.

## Roll back

Revert the commit. robots.txt returns to the prefix rules and the test file goes away with it.

## Founder steps

- After deploy, in Google Search Console open Settings, then robots.txt, and request a recrawl of `https://drawintheair.com/robots.txt`. Then use URL Inspection on `/schools`, `/schools/training` and `/parents` and request indexing.
- No Vercel or Supabase changes.

## Findings outside scope

- `/teacher/*` (teacher auth and dashboard) is not disallowed in robots.txt while `/parent/*` is. Logged in `docs/audits/RELEASE_FINDINGS_LOG.md`.
