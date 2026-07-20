# Draw in the Air — Keyword & Content Map
### July 2026. Built from live SERP research (~23 queries) mapped against the actual route inventory in the repo.

## The strategy in one paragraph

Do not fight SplashLearn, ABCya, Twinkl or Topmarks on "letter tracing games" head terms. Own the mechanic vocabulary instead: air writing, sky writing, webcam tracing, whole-class, no touchscreen. Research confirmed that every SERP for those terms is either manual-technique instructions (Nemours, Sightwords telling adults how to wave a finger), decaying Flash-era directories (Crickweb), or a total intent mismatch (Google answering "learn letters without a tablet" with tablet-app listicles). No mainstream competitor has a camera mechanic. The first genuinely matching page wins cheaply, and `/trace-c` already ranks for "webcam letter tracing game kids", proving the programmatic layer works.

## The one term that changes the plan: sky writing

"Sky writing" is an established Orton-Gillingham / PAF kinesthetic teaching technique where children write letters in the air with a finger. Teachers already know and trust this word. It is fragmented across TpT worksheets and OT blog posts, and nobody has digitised it. There is even a homework-question trail calling skywriting "a kinesthetic technique for dyslexic students", which opens the SEN angle. ictgames has a mouse-driven "Sky Writer" demo plane already ranking for teacher formation queries; it demonstrates letters, the child never writes. Draw in the Air is literally the digital version of the technique.

Caution: UK "ground-grass-sky" handwriting lines (Sparklebox) are a different concept using the same word. Do not conflate them; one clarifying sentence on the page prevents confusion.

## Tier 1 — Mechanic terms (highest opportunity, build these first)

| Keyword cluster | SERP today | Action | Route |
|---|---|---|---|
| air writing for kids, air writing letters game | Instruction articles only (nemours.org, sightwords.com), zero products | NEW use-case landing | `/air-writing-for-kids` |
| sky writing letters, Orton-Gillingham sky writing | TpT worksheets + OG blogs, no digital tool | NEW use-case landing + Learn article pair | `/sky-writing-letters` + `/learn/what-is-sky-writing` |
| webcam letter tracing game | Mouse/touch games that don't use webcams; you already rank | Extend + retitle programmatic trace pages (done: all 44 now prerendered) | `/trace-*` |
| letter formation game whole class | Only ictgames' mouse demo | NEW page anchored on Class Mode join codes | `/whole-class-letter-formation` |
| learn letters without a tablet, no touchscreen | Google serves tablet listicles; total mismatch | NEW short landing, "the only true answer" page | `/learn-letters-without-a-tablet` |

## Tier 2 — Teacher bottom-of-funnel (pilot lead generators)

| Keyword cluster | SERP today | Action | Route |
|---|---|---|---|
| EYFS interactive whiteboard literacy games free | Crickweb (Flash-era), Topmarks directory, Busy Things | NEW page: the IWB demo story, camera on a classroom display | `/interactive-whiteboard-games-eyfs` |
| Chromebook games kindergarten free / classroom | Weak listicles | EXISTS: `/chromebook-learning-tools`. Retitle toward "free games for school Chromebooks" and add a "camera included, nothing to install" block | edit |
| classroom movement activities, kinesthetic learning primary | Edutopia, WeAreTeachers, thin EYFS coverage | EXISTS: `/classroom-movement-activities`. Add UK EYFS framing and a 5-minute carpet-time warm-up section | edit |
| reception phonics warm up activities | Twinkl moat | Long-tail only: one Learn article "5-minute phonics warm-ups without worksheets", don't fight the head term | new article |
| fine motor skills games classroom | SplashLearn, OT blogs | Position honestly as gross-motor-first; `/hand-eye-coordination-activities` exists, add a gross-vs-fine motor section | edit |

## Tier 3 — Pedagogy bridge content (GEO fuel, cite-worthy)

These are the pages LLMs will quote. Write them as answers, question-format H2s, two to three sentence direct answers, then depth. The ScienceDirect literature on gesture-based games and preschool motor skills gives citable evidence; link to it rather than making unsupported claims.

New Learn articles, priority order: "What is sky writing and how do you teach it" (teacher), "Does air writing help children learn letters" (both, the Nemours SERP is beatable with a better answer plus a tool), "Gross motor skills and handwriting readiness" (teacher/OT), "What is physically active screen time" (parent/press, an existing policy phrase with advocates; Common Sense Media has a movement-apps list). Existing articles to sharpen: `/learn/screen-time-alternatives` retitle H1 to the question form "What are screen time alternatives that still teach?"; `/learn/early-childhood-motor-skills` add letter-formation-specific section.

## Tier 4 — Parent terms

Parents search "handwriting practice games for 4 year old" and "alternatives to tablet for preschooler". The honest fit is pre-writing: before pencil grip, before worksheets. `/for-parents` exists; give it a "before the pencil" section. The known funnel constraint applies: Meta traffic is mobile, the product needs a laptop, so parent SEO pages must carry the "open on your laptop" email-capture bridge rather than a dead-end CTA.

## Programmatic layer — trace pages (44 live, now fully prerendered)

Every `/trace-{letter|number|shape}` page now ships full HTML with per-letter formation guidance, phonics, parent tips and LearningResource schema. Title formula already good. Two upgrades: add "air writing" and "sky writing" to the keyword arrays in TracePage's meta builder (one-line change each), and interlink each letter to its formation-family siblings (letters children confuse: b/d, m/w, p/q), which is both pedagogy and crawl depth.

## Question library (map to FAQ page + article H2s)

Teacher: What is air writing and how do you teach it? What is skywriting in Orton-Gillingham? How do you teach letter formation in Reception? What are letter formation families? How can children practise letters without a pencil? What gross motor skills are needed for handwriting? What are the best interactive whiteboard games for preschool? What free games work on school Chromebooks?

Parent: Does air writing help children learn letters? How do I make handwriting practice fun for a 4 year old? How do I get a reluctant preschooler to practise letters? What is physically active screen time? Do movement games count as physical activity? Is webcam-based learning safe for children? (Answer: video is processed on the device and never recorded or uploaded — this is also the single most quotable trust fact for AI answers.)

## Repo defects found during this work (fix alongside content)

1. Eleven top-level pages (`/faq`, `/about`, `/pricing`, `/teachers`, `/schools`, `/privacy`, `/terms`, `/cookies`, `/safeguarding`, `/accessibility`, `/schools/training`) render real bodies but share the default homepage `<title>` because they don't use SEOMeta. Each needs its own SEOMeta block. The prerenderer now gives them self-canonicals, so this is title/description work only.
2. PAGE_META drift: `christmas`, `halloween`, `backToSchool` canonicals point at `/activities/christmas-drawing` style URLs that render a BLANK page (SPECIAL_DATA keys are `/activities/christmas-drawing-for-kids` style). Fix PAGE_META canonicals to match SPECIAL_DATA, or add alias slugs.
3. `/draw-heart-in-air`, `/draw-star-in-air`, `/draw-alphabet-in-air` have PAGE_META entries but no router match and no SPECIAL_DATA, so they serve the homepage. Add SPECIAL_DATA entries + router lines, or remove from PAGE_META and sitemap.
4. `/letter-tracing` renders TracePage which canonicalises to `/trace-a`, conflicting with PAGE_META's `/letter-tracing` canonical. Decide one owner (recommend: keep `/letter-tracing` as a hub page with its own copy, since "letter tracing online free" deserves a real landing).
5. Age range is stated as 3–7 (repo index.html, brand canon) and 3–11 (live OG tags). Pick 3–7 everywhere; entity consistency is a free GEO ranking factor.
6. Directory/listing copy says "completely free, no premium tiers" (HOMEPAGE_FAQ) while `/pricing` exists and the funnel is moving to subscriptions. Use "free to play in the browser, no download or account needed" in all external submissions until the model settles.

## Sequence

Weeks 1–2: ship the SSG build (done, pending deploy), fix defects 1–5, add air-writing/sky-writing keywords to trace meta. Weeks 2–4: build the five Tier 1 pages (UseCasePage pattern makes each a data entry + router line + prerender line). Weeks 4–8: Tier 2 edits and IWB page, then the four Tier 3 articles. Ongoing: one article per fortnight from the question library, watching Search Console for which mechanic terms move first.
