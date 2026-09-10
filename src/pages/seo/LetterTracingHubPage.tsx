// src/pages/seo/LetterTracingHubPage.tsx
//
// The /letter-tracing HUB. This is a real, body-prerendered landing page
// (see entry-prerender.tsx + prerender-paths.ts), NOT the old stub that
// rendered <TracePage type="letter" value="a" /> and canonicalised itself
// to /trace-a. It self-canonicalises to /letter-tracing and is the parent
// of the 26 /trace-<letter> spokes in the tracing topic cluster.
//
// CONVERSION PATH (explicit, and in this on-page order): a visitor arrives
// from search → understands what the activity is → PLAYS the live demo
// (the LaunchPanel sits directly under the hero, the activity is never
// buried under an article) → completes a trace inside the app → is offered
// the right sign-up (teacher / school pilot / family). The playable product
// is the proof; the copy is the wrapper, not the point.

import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { analytics } from '../../lib/analytics';
import {
  LETTERS, NUMBERS, SHAPES, PHONICS, NUMBER_META, SHAPE_META,
  PAGE_META, HOW_TO_STEPS,
  buildLearningResourceSchema, buildFAQSchema, buildBreadcrumbSchema, buildHowToSchema,
} from '../../seo/seo-config';

const META = PAGE_META.letterTracing;

// The A–Z demo the hero launches into. Mirrors getLaunchUrl in TracePage.
const HERO_LAUNCH_URL = '/play?screen=game&mode=pre-writing&trace=A';

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** SPA-friendly anchor click: keep client-side navigation for plain
 *  left-clicks, but let modified clicks (new tab/window) and crawlers use
 *  the real href. Internal links MUST be real <a href> so the hub actually
 *  passes crawl authority to the /trace-<x> spokes — the whole point of the
 *  hub. */
function spaClick(path: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(path);
  };
}

/** Fire the "qualified demo start" funnel signal, then navigate into the
 *  live activity. logEvent is fire-and-forget and guards `typeof window`
 *  internally, so it is safe under SSR/prerender and never blocks the
 *  launch. */
function launchDemo(url: string, letter: string) {
  try {
    analytics.logEvent('cta_click', {
      component: 'letter-tracing-hub',
      page: '/letter-tracing',
      meta: { source: 'letter_tracing_hub_launch', funnel_step: 'qualified_demo_start', trace: letter, destination: url },
    });
  } catch { /* analytics is best-effort, never block the launch */ }
  navigate(url);
}

// ─── Live-demo launch panel (the "play" step, kept above the fold) ───────────
function LaunchPanel() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(138,102,240,0.212) 0%, rgba(0,245,212,0.15) 100%)',
      border: '1px solid rgba(138,102,240,0.34)',
      borderRadius: 20,
      padding: '36px 40px',
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
      margin: '8px 0 8px',
      boxShadow: '0 8px 40px rgba(138,102,240,0.17)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🖐️</div>
      <h2 style={{ color: '#1F1B2E', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>
        Trace a letter right now, free
      </h2>
      <p style={{ color: 'rgba(26,27,46,0.70)', fontSize: '0.95rem', margin: '0 0 24px', lineHeight: 1.6 }}>
        No download. No login. Works on any laptop or desktop with a webcam. Start with letter A, then trace the whole alphabet.
      </p>
      <button
        onClick={() => launchDemo(HERO_LAUNCH_URL, 'A')}
        id="launch-trace-hub"
        style={{
          background: 'linear-gradient(180deg, #9D7DFF 0%, #8A66F0 100%)',
          border: 'none',
          borderRadius: 50,
          padding: '16px 40px',
          color: '#1F1B2E',
          fontSize: '1.05rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(138,102,240,0.425)',
          transition: 'all 0.2s ease',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        🎯 Start Tracing Letter A
      </button>
      <p style={{ color: 'rgba(26,27,46,0.55)', fontSize: '0.78rem', marginTop: 14, marginBottom: 0 }}>
        Allow camera access when prompted · Your video is never recorded or uploaded
      </p>
    </div>
  );
}

// ─── Letter / number / shape link card (the hub-and-spoke internal links) ────
function LinkCard({ label, path, emoji }: { label: string; path: string; emoji: string }) {
  return (
    <a href={path} onClick={spaClick(path)} style={{
      background: 'rgba(138,102,240,0.08)',
      border: '1px solid rgba(138,102,240,0.212)',
      borderRadius: 12,
      padding: '14px 16px',
      cursor: 'pointer',
      color: '#1F1B2E',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 78,
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8A66F0'; (e.currentTarget as HTMLElement).style.background = 'rgba(138,102,240,0.16)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(138,102,240,0.212)'; (e.currentTarget as HTMLElement).style.background = 'rgba(138,102,240,0.08)'; }}
    >
      <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
    </a>
  );
}

// ─── "After they play" conversion band (the sign-up step) ────────────────────
function ConversionCard({ emoji, title, body, cta, path }: { emoji: string; title: string; body: string; cta: string; path: string }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid rgba(31,27,46,0.10)',
      borderRadius: 20,
      padding: 24,
      boxShadow: '0 2px 6px rgba(64,50,90,0.08)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: '1.8rem', marginBottom: 8 }} aria-hidden="true">{emoji}</div>
      <h3 style={{ fontFamily: 'Outfit, system-ui, sans-serif', fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px', color: '#1F1B2E' }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', lineHeight: 1.55, opacity: 0.8, margin: '0 0 16px', color: '#1F1B2E' }}>{body}</p>
      <div style={{ marginTop: 'auto' }}>
        <a className="btn btn-primary sm" href={path} onClick={spaClick(path)} style={{ textDecoration: 'none' }}>{cta}</a>
      </div>
    </div>
  );
}

const HUB_FAQ = [
  { q: 'What is air letter tracing?', a: 'Air letter tracing lets a child form each letter of the alphabet by moving their hand in front of a webcam. The browser tracks the fingertip and the child traces the on-screen letter guide with whole-arm movement, no pen, no touchscreen, no download.' },
  { q: 'Which letters can my child trace?', a: 'Every letter of the alphabet, A to Z, has its own guided tracing activity, plus numbers 1 to 10 and eight basic shapes. Each has an uppercase guide, the letter sound, and a simple example word.' },
  { q: 'What age is letter tracing for?', a: 'It is designed for children aged 3 to 7, from preschool through early primary. Tracing builds letter recognition, correct formation order, and the fine-motor control that handwriting depends on.' },
  { q: 'Is it free, and is it safe?', a: 'The core tracing activities are free to play with no account. The camera frame is processed inside the browser and discarded each frame, nothing is recorded, stored, or uploaded. A Family plan unlocks the full library; schools can request a free pilot.' },
  { q: 'What device do I need?', a: 'Any laptop, desktop, or Chromebook with a webcam and a modern browser (Chrome, Edge, Firefox, or Safari 15+). A laptop or Chromebook gives the most room for whole-arm movement.' },
];

export default function LetterTracingHubPage() {
  const structuredData = [
    buildLearningResourceSchema(
      'Letter Tracing A–Z in the Air',
      META.description,
      '/letter-tracing',
      'Alphabet letter recognition and formation A–Z, pre-writing fine-motor skills, letter–sound (phonics) awareness',
    ),
    buildHowToSchema(HOW_TO_STEPS),
    buildFAQSchema(HUB_FAQ),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Letter Tracing', path: '/letter-tracing' },
    ]),
  ];

  return (
    <SeoLayout>
      <SEOMeta
        title={META.title}
        description={META.description}
        keywords={META.keywords}
        canonical="/letter-tracing"
        structuredData={structuredData}
      />

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: 'Letter Tracing' },
        ]} />
      </div>

      <PageHero
        badge="Letter Tracing A–Z · Free"
        emoji="✍️"
        title="Trace Letters A–Z in the Air"
        subtitle="Your child forms each letter by moving their hand in front of the webcam, following the on-screen guide. Whole-arm air tracing builds letter recognition, correct formation, and the fine-motor control handwriting needs. Ages 3–7."
      />

      {/* ── PLAY: live demo, directly under the hero, never buried ── */}
      <Section light>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <LaunchPanel />

          {/* UNDERSTAND: how it works, kept short */}
          <h2 style={{ color: '#1F1B2E', fontSize: '1.35rem', fontWeight: 800, margin: '28px 0 16px' }}>
            How air tracing works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {HOW_TO_STEPS.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: '#8A66F0', fontWeight: 800, fontSize: '1rem', minWidth: 24 }}>{i + 1}</span>
                <div>
                  <div style={{ color: '#1F1B2E', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{s.name}</div>
                  <div style={{ color: '#4A4D6B', fontSize: '0.85rem', lineHeight: 1.5 }}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ color: '#1F1B2E', fontSize: '1.35rem', fontWeight: 800, margin: '28px 0 12px' }}>
            What your child is practising
          </h2>
          <p style={{ color: 'rgba(26,27,46,0.82)', lineHeight: 1.75, fontSize: '0.95rem', margin: 0 }}>
            Each letter guide shows the stroke order for forming the letter, so children build the motor pattern that handwriting relies on. Every letter is paired with its sound and an example word (A is for Apple, B is for Ball), which links letter shapes to early phonics. Because the child traces with their whole arm rather than a fingertip on glass, the movement is bigger and easier for developing muscles at ages 3 to 7.
          </p>
        </div>
      </Section>

      {/* ── The alphabet: 26 spokes ── */}
      <Section>
        <h2 style={{ color: '#1F1B2E', fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>
          Trace every letter, A to Z
        </h2>
        <p style={{ color: '#4A4D6B', fontSize: '0.9rem', marginBottom: 20 }}>
          Each letter has its own guided activity with the letter sound, an example word, and formation tips.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {LETTERS.map(l => (
            <LinkCard key={l} label={`Trace ${l}`} path={`/trace-${l.toLowerCase()}`} emoji={PHONICS[l]?.emoji || '✏️'} />
          ))}
        </div>
      </Section>

      {/* ── Sibling hubs: numbers + shapes ── */}
      <Section light>
        <h2 style={{ color: '#1F1B2E', fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>
          Numbers and shapes, too
        </h2>
        <p style={{ color: '#4A4D6B', fontSize: '0.9rem', marginBottom: 20 }}>
          The same air-tracing activity covers numbers 1–10 and eight basic shapes.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
          {NUMBERS.map(n => (
            <LinkCard key={n} label={`Trace ${n}`} path={`/trace-number-${n}`} emoji={NUMBER_META[n]?.emoji || '🔢'} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {SHAPES.map(s => (
            <LinkCard key={s} label={cap(s)} path={`/trace-${s}`} emoji={SHAPE_META[s]?.emoji || '🔷'} />
          ))}
        </div>
      </Section>

      {/* ── SIGN UP: what to do after they play ── */}
      <Section>
        <h2 style={{ color: '#1F1B2E', fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>
          Loved it? Here's what's next
        </h2>
        <p style={{ color: '#4A4D6B', fontSize: '0.9rem', marginBottom: 20 }}>
          The tracing activities stay free to play. When you're ready to go further:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <ConversionCard
            emoji="🍎"
            title="Teachers"
            body="Use it free on the whiteboard or Chromebooks, no logins or installs. Create a teacher account to save activities and run Class Mode."
            cta="For teachers"
            path="/teachers"
          />
          <ConversionCard
            emoji="🏫"
            title="Schools"
            body="Request a free pilot pack with EYFS/KS1 mapping, lesson plans, and Class Mode for the trial. We set up your first session with you."
            cta="Request a school pilot"
            path="/schools"
          />
          <ConversionCard
            emoji="👪"
            title="Families"
            body="Start free at home. The Family plan (7-day free trial) unlocks the full activity library, progress, and parental controls."
            cta="For families"
            path="/parents"
          />
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section light>
        <h2 style={{ color: '#1F1B2E', fontSize: '1.3rem', fontWeight: 800, marginBottom: 24 }}>Frequently asked questions</h2>
        {HUB_FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>
    </SeoLayout>
  );
}
