# Track P: claims text fixes, applied on branch wp/2b9

Evidence date 2026-09-07. Register: `claims-register.md`. Patch: `claims-text-fixes.patch` (generated against `cca72f5`, applied here with `git apply` after a clean `git apply --check`; no 3-way needed).

## What was applied

All 58 hunks of the patch applied cleanly across 28 files. Every hunk was then read against the register. Hunks whose register status is `fix-now-text-only` were kept. Where the patched wording was only true after a package that has not shipped, it was rewritten so it is true about production today (list below). Copy rules: plain English, no em dashes in any added line (en dashes in numeric ranges such as "3–7" are pre-existing house style and were left).

## Hunks changed after review (true today, not only after Gate 3)

| Register | File | Patch wording | Applied wording | Why |
|---|---|---|---|---|
| C42 | `src/pages/setup/ParentSetupGuide.tsx` | "on the marketing pages only, to the analytics tools..." | "only if you accept the cookie banner, to the analytics tools listed in our Privacy Policy" | Today GA4, Clarity, PostHog and the Pixel load on any route once consent is granted (`src/main.tsx` `loadDeferredAnalytics`, `src/lib/observability/index.ts`). "Marketing pages only" becomes true after the analytics-off package. |
| C60 | `docs/store-copy.md` | "Usage events on the play surface go only to our own database; marketing pages use GA4, Clarity and the Meta Pixel after cookie consent." | "Usage events go to our own database. Google Analytics, Microsoft Clarity and the Meta Pixel load only after cookie consent." | Same reason as C42. |
| C54 | `docs/pitch/03_safety_and_compliance_dossier.md` sub-processor table | "Marketing page measurement, after cookie consent only" | "Web measurement, loaded only after cookie consent" | Same reason as C42. |
| C14 | `src/pages/FAQ.tsx` | "Parents and teachers can view, export, and delete this data from their account page." | "Parents can view, export, and delete this data from their account page, and teachers can remove any child and all their data from their dashboard." | Export exists only on the parent Account page (`openJsonExport`). Teachers have delete (`deleteChild`) but no export. |
| C08 | `src/pages/Safeguarding.tsx` | "...Nothing else is collected from children." | "...We never ask children for surnames, dates of birth, or contact details." | Activity progress and pseudonymous events are collected during play, so "nothing else" was too strong. |
| C20 | `src/pages/Teachers.tsx` | kept "School licences add admin analytics and whole-school reporting." | "School licences are agreed with the school after the pilot." | Same defect as C21: no admin analytics or whole-school reporting exists. |
| C25 | `src/pages/TransparencyPage.tsx` | body changed to London, card title still "Hosted in the EU" | title "Hosted in the UK" | Title contradicted the corrected body. |
| C40 | `src/pages/seo/PressPage.tsx` | "No child accounts, no child accounts, no ads." | "No child accounts, no ads." | Duplicated phrase in the patch. |
| C31 | `src/pages/seo/ForTeachersPage.tsx` FAQ | kept "anonymised, aggregated usage analytics ... GDPR and COPPA compliant" | "pseudonymous usage analytics ... aggregated for reporting ... designed around UK GDPR" | The register's own reasoning for C31 (device ID is pseudonymous, COPPA not evidenced) applied to the FAQ answer the patch left alone. |
| C43 | `src/pages/seo/ForTeachersPage.tsx`, `ForParentsPage.tsx` | register marked partial (ParentSetupGuide only) | Common Core removed from the ForTeachers FAQ answer, the ForParents "Curriculum-aligned" card, and the Common Core mapping card in the ForTeachers curriculum section | No Common Core mapping exists in the repo (`docs/EYFS-FRAMEWORK-MAPPING.md` only). |
| C46 | `docs/pitch/03_safety_and_compliance_dossier.md` line 10 | context line "No personal information is collected from children." left | "Children are never asked for anything beyond a first name or nickname." | Same sentence the rest of the dossier patch corrects. |

## Hunks deferred to after Gate 3 (not applied, not in the patch)

These were not in the patch and remain as-is in the code. They become true only when the named package ships. Re-check them then.

| Register | File | Depends on | Copy to apply once shipped |
|---|---|---|---|
| C05 | `src/pages/Privacy.tsx` "The hand-tracking model (MediaPipe) is loaded from Google's CDN on first use" | MediaPipe self-host package (R2) | "The hand-tracking model (MediaPipe) is served from our own domain. Loading it sends no request to a third party." Today it loads from jsDelivr and storage.googleapis.com, so the current sentence stays. |
| C49 | `docs/pitch/03_safety_and_compliance_dossier.md` line 76 and `docs/pitch/02_school_one_pager.md` line 24: "Google Analytics, Microsoft Clarity runs only on the public marketing pages, never inside the child play surfaces"; "No tracking cookies for child sessions" | Analytics-off-on-child-routes package (R1) | Keep the wording once R1 ships. Until then these two lines are not true for a consenting visitor who then opens /play. Founder: do not send the dossier or one-pager to a school before R1 ships, or strike those two lines by hand. |
| C57 | `public/classroom-guides/00-teacher-guide.pdf` steps 3 and 4 (picture-tap join) | Persistent-class-learner package | Regenerate the PDF once that join flow ships. Kept for now because it is the main teacher guide. |
| (new) | `src/pages/teacher/TeacherViews.tsx` `SETUP_STEPS` ("tap their picture ... no names to type") | Persistent-class-learner package | Not in the register. Same defect as C57 but inside the teacher dashboard. Logged in `docs/audits/RELEASE_FINDINGS_LOG.md`. |
| C42, C60 | see table above | R1 | After R1 ships, the "marketing pages only" wording from the patch can replace the consent-based wording used here. |

## "remove" items

| Register | Action taken |
|---|---|
| C45, C55 | `public/pilot-pack.pdf` deleted. The "complete pilot pack" download banner in `src/pages/teacher/TeacherViews.tsx` `ResourcesView` removed (patch hunk) with a code comment pointing here. |
| C56 | `public/classroom-guides/05-parent-communication-pack.pdf` deleted ("Ages 3-8"). Removed from the guide tables in `TeacherViews.tsx` and `src/pages/seo/FreeResourcesPage.tsx`. |
| C58 | `public/classroom-guides/01-teacher-quick-start-guide.pdf` deleted ("No accounts. Just a URL."). Removed from `FreeResourcesPage.tsx`. The "Download the most popular guide" CTA that linked it now links `08-eyfs-reception-activity-guide.pdf` with the label "Download the EYFS activity guide". Guide counts on that page changed from "Ten" to "Eight". |
| C63, C64, C65 | `src/components/landing/SocialProof.tsx`, `CTASection.tsx`, `HeroSection.tsx`, `PrivacySafety.tsx`, `FAQSection.tsx`, `Footer.tsx` deleted. Proof they were dead: `grep -rn` across `src/` found no import of any of them (the `Footer` in use everywhere is `CalmFooter` from `src/pages/Landing.tsx`); `tsc -b --noEmit` passes after deletion; the production build succeeds. Deleting them removed 2 lint warnings, so the ratchet in `package.json` went from `--max-warnings 162` to `160` (also updated in `CLAUDE.md` and `CONTRIBUTING.md`). |

`scripts/generate-brand-pdfs.py` still contains the generator definitions for the two deleted guides (`01-teacher-quick-start-guide.pdf` at line 465, `05-parent-communication-pack.pdf` at line 636) with the old copy. Correct the copy in that script before running it again, or the deleted files come back with the same defects.

## New test

`tests/public-assets.test.ts`: scans `src/` and `index.html` for every linked `/classroom-guides/*.pdf` (including bare `file: '...pdf'` entries in the guide tables) and `/pilot-pack.pdf`, asserts each file exists in `public/`, and asserts the three deleted files are no longer linked. The per-letter worksheet links (`letter-a.pdf` and so on) are built from a template literal and are not caught by this scan; they are dangling on production already and are logged as a finding.

## Check results (after both commits)

- `npm ci`: clean.
- `npm run lint`: 0 errors, 160 warnings (ratchet lowered to 160).
- `npm run type-check`: pass.
- `npm test`: 28 files, 266 tests pass.
- `check-env-safety`, `check:csp`, `check:secrets`: pass.
- `npm run build`: `[prerender-seo] pass 2: wrote 93 full-body route file(s)`. Spot check: `dist/index.html` og:image:alt reads "ages 3 to 7"; `dist/privacy/index.html` contains "London".

## Roll back

Revert the Track P commit. The three PDFs and six components come back with it.

## Founder steps

- Nothing in Vercel or Supabase.
- Do not circulate `docs/pitch/*` to a school until C49 (analytics off on child routes) ships or those two lines are struck by hand.
- Regenerate `pilot-pack.pdf`, `01-teacher-quick-start-guide.pdf` and `05-parent-communication-pack.pdf` from the corrected web copy when convenient (fix `scripts/generate-brand-pdfs.py` first), then re-add the links.
