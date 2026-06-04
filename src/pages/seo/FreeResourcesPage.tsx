/**
 * /free-resources, free classroom guides + printable worksheets.
 *
 * Rebuilt 2026-06 on the Calm design system (landing-calm.css).
 * Content (10 classroom guide PDFs, A–Z tracing sheets, workbook
 * bundle) preserved from the previous SEO-theme version; presentation
 * is new: scannable resource cards, clear download affordances, and a
 * CTA flow into Try Free / parent signup / teacher signup.
 */

import { Link } from 'react-router-dom';
import { CalmFooter, GestureTrail, SectionHead } from '../Landing';
import { HeaderNav } from '../../components/landing/HeaderNav';
import { SEOMeta } from '../../seo/SEOMeta';
import { buildBreadcrumbSchema } from '../../seo/seo-config';
import '../../components/landing/landing-calm.css';

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const CLASSROOM_GUIDES = [
  { file: '01-teacher-quick-start-guide.pdf', emoji: '🚀', title: "Teacher's Quick Start Guide", desc: 'Get up and running in under 5 minutes. Covers all modes, the pinch gesture, and classroom setup.', audience: 'All teachers' },
  { file: '02-five-day-movement-break-plan.pdf', emoji: '📅', title: '5-Day Movement Break Plan', desc: 'A ready-to-run weekly structure, one Draw in the Air activity per day, Monday to Friday.', audience: 'Class teachers' },
  { file: '03-fine-motor-skills-integration.pdf', emoji: '✋', title: 'Fine Motor Skills Integration', desc: 'The science behind gesture learning and how it connects to pre-writing development.', audience: 'EYFS / Reception' },
  { file: '04-chromebook-classroom-setup.pdf', emoji: '💻', title: 'Chromebook Classroom Setup', desc: 'Step-by-step setup for school Chromebook carts, labs, and managed devices.', audience: 'Tech coordinators' },
  { file: '05-parent-communication-pack.pdf', emoji: '📨', title: 'Parent Communication Pack', desc: 'Ready-to-send letters, ClassDojo messages, and parent FAQ, zero writing required.', audience: 'Class teachers' },
  { file: '06-progress-tracking-sheet.pdf', emoji: '📊', title: 'Progress & Observation Tracker', desc: 'Observation prompts and an A–Z letter mastery grid for learning journey evidence.', audience: 'All teachers' },
  { file: '07-send-inclusion-support-guide.pdf', emoji: '💜', title: 'SEND & Inclusion Support Guide', desc: 'Specific adaptations for ASC, dyspraxia, ADHD, and EAL learners.', audience: 'SENCOs / TAs' },
  { file: '08-eyfs-reception-activity-guide.pdf', emoji: '🎒', title: 'EYFS & Reception Activity Guide', desc: 'Development Matters mapping and a complete 15-minute session plan for Reception.', audience: 'EYFS / Reception' },
  { file: '09-year1-2-curriculum-connections.pdf', emoji: '📚', title: 'Year 1–2 Curriculum Connections', desc: 'KS1 National Curriculum links across English, Maths, Computing, and PE.', audience: 'Year 1 & 2' },
  { file: '10-after-school-club-guide.pdf', emoji: '🌙', title: 'After-School Club & Home Learning', desc: 'A 45-minute club session plan plus a tear-off parent guide for home use.', audience: 'Extended school / Parents' },
];

// Structured word examples for A–Z display
const LETTER_WORDS: Record<string, [string, string]> = {
  A: ['Apple', '🍎'],  B: ['Ball', '⚽'],     C: ['Cat', '🐱'],
  D: ['Dog', '🐶'],   E: ['Elephant', '🐘'], F: ['Fish', '🐠'],
  G: ['Giraffe', '🦒'], H: ['Hat', '🎩'],    I: ['Ice Cream', '🍦'],
  J: ['Jellyfish', '🪼'], K: ['Kite', '🪁'],  L: ['Lion', '🦁'],
  M: ['Moon', '🌙'],  N: ['Nest', '🪺'],     O: ['Octopus', '🐙'],
  P: ['Penguin', '🐧'], Q: ['Queen', '👑'],  R: ['Rainbow', '🌈'],
  S: ['Star', '⭐'],   T: ['Tiger', '🐯'],    U: ['Umbrella', '☂️'],
  V: ['Violin', '🎻'], W: ['Whale', '🐳'],   X: ['Xylophone', '🎵'],
  Y: ['Yarn', '🧶'],  Z: ['Zebra', '🦓'],
};

const WHATS_INSIDE = [
  { icon: '✏️', label: 'Guided tracing rows', desc: 'Dotted letterforms to trace over, uppercase and lowercase.' },
  { icon: '📝', label: 'Free practice rows', desc: 'Blank ruled lines to write independently after tracing.' },
  { icon: '📖', label: 'Word examples', desc: 'Each letter includes a picture word, A for Apple, B for Ball.' },
  { icon: '🖨️', label: 'Print-ready layout', desc: 'Clean margins, high contrast, prints perfectly on any home printer.' },
];

export default function FreeResourcesPage() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const structuredData = [
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Free Resources', path: '/free-resources' },
    ]),
  ];

  return (
    <div className="lp-shell">
      <SEOMeta
        title="Free Printable Letter Tracing Worksheets | Draw in the Air"
        description="Download free PDF templates for tracing uppercase and lowercase letters A to Z. Individual sheets plus a complete workbook bundle for pre-K and primary grades."
        canonical="/free-resources"
        keywords={[
          'free letter tracing worksheets',
          'printable alphabet worksheets',
          'letter tracing pdf download',
          'free printable tracing sheets',
          'kindergarten letter worksheets',
          'EYFS printable activities',
          'preschool alphabet tracing',
          'A to Z tracing worksheets',
        ]}
        structuredData={structuredData}
      />
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="Free resources">

        {/* HERO */}
        <section className="hero" data-screen-label="Resources hero" style={{ paddingBottom: 24 }}>
          <div className="hero-orb" />
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 0 }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>
                <span className="ic-chip" aria-hidden="true">{'\u{1F5A8}\u{FE0F}'}</span> Free for everyone
              </div>
              <h1 className="h1" style={{ marginTop: 18 }}>
                Free printables and <span className="grad">classroom guides.</span>
              </h1>
              <p className="lead" style={{ marginTop: 16 }}>
                Bridge digital and physical learning. Ten professional classroom guides
                and a full A–Z tracing worksheet series, free to download, print, and
                share with colleagues. No email required.
              </p>
            </div>
          </div>
        </section>

        {/* CLASSROOM GUIDES */}
        <section className="section" data-screen-label="Classroom guides" style={{ paddingTop: 40 }}>
          <div className="wrap">
            <SectionHead
              eyebrow="Classroom guides"
              tone="mint"
              title="Ten guides, written for real classrooms."
              lead="From EYFS curriculum links to Chromebook setup, everything a teacher needs to run Draw in the Air with confidence."
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {CLASSROOM_GUIDES.map(guide => (
                <a
                  key={guide.file}
                  href={`/classroom-guides/${guide.file}`}
                  download={guide.title}
                  className="card hoverable"
                  style={{ textDecoration: 'none', color: 'inherit', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ fontSize: '1.8rem' }} aria-hidden="true">{guide.emoji}</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '0.95rem', lineHeight: 1.4 }}>{guide.title}</div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.55, opacity: 0.75, flexGrow: 1 }}>{guide.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span className="eyebrow is-sky" style={{ fontSize: '0.68rem', padding: '3px 9px' }}>{guide.audience}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mint-600, #2E9D68)' }}>{'↓'} PDF</span>
                  </div>
                </a>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
              <a href="/classroom-guides/01-teacher-quick-start-guide.pdf" download="Draw-in-the-Air-Teacher-Quick-Start.pdf" className="btn btn-primary md">
                Download the most popular guide
              </a>
              <a href="/classroom-guides/az-letter-tracing-workbook.pdf" download="Draw-in-the-Air-AZ-Workbook.pdf" className="btn btn-secondary md">
                Get the A–Z workbook
              </a>
            </div>
          </div>
        </section>

        {/* A–Z TRACING SERIES */}
        <section className="section section-tint" data-screen-label="A-Z tracing series">
          <div className="wrap">
            <SectionHead
              eyebrow="Printable worksheets"
              tone="sun"
              title="Offline tracing series, A to Z."
              lead="After children master large, gross-motor arm movements with the camera activities, these high-contrast sheets help transition those pathways into fine-motor pencil skills. Tracing guides, a word example, and free practice rows on every sheet."
            />

            {/* A–Z grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 12, marginBottom: 40 }}>
              {letters.map((char) => {
                const [word, emoji] = LETTER_WORDS[char] || [char, ''];
                return (
                  <a
                    key={char}
                    href={`/classroom-guides/letter-${char.toLowerCase()}.pdf`}
                    download={`Draw-in-the-Air-Letter-${char}-Tracing.pdf`}
                    className="card hoverable"
                    style={{ textDecoration: 'none', color: 'inherit', padding: 0, overflow: 'hidden', textAlign: 'center' }}
                    title={`Download Letter ${char} tracing worksheet, ${emoji} ${word}`}
                  >
                    <div style={{ padding: '16px 0 8px' }}>
                      <div style={{ fontSize: '1.9rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{char}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--lavender-600, #7A55E0)', lineHeight: 1.1 }}>{char.toLowerCase()}</div>
                      <div style={{ fontSize: '1rem', marginTop: 4 }} aria-hidden="true">{emoji}</div>
                    </div>
                    <div style={{ padding: '7px 0', borderTop: '1px solid var(--border-1, rgba(31,27,46,0.08))', fontSize: '0.72rem', fontWeight: 700, color: 'var(--mint-600, #2E9D68)' }}>
                      {'↓'} PDF
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Workbook CTA */}
            <div className="cta-banner" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.3rem', marginBottom: 10 }} aria-hidden="true">📖</div>
              <h2 className="h2">Get the full A–Z workbook.</h2>
              <p className="lead" style={{ maxWidth: 520, margin: '10px auto 22px' }}>
                All 26 letters in one perfectly-formatted 27-page PDF, cover page, tracing
                guides, word examples, and free practice rows for every letter.
              </p>
              <div className="cta-actions" style={{ justifyContent: 'center' }}>
                <a href="/classroom-guides/az-letter-tracing-workbook.pdf" download="Draw-in-the-Air-AZ-Letter-Tracing-Workbook.pdf" className="btn btn-secondary lg">
                  {'📥'} Download complete workbook (PDF)
                </a>
              </div>
              <p style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 14, marginBottom: 0 }}>
                27 pages · A4 / US Letter · Print-ready · Free to share with colleagues
              </p>
            </div>

            {/* What's inside */}
            <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {WHATS_INSIDE.map(item => (
                <div key={item.label} className="card" style={{ padding: '18px 18px' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 6 }} aria-hidden="true">{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', lineHeight: 1.55, opacity: 0.75 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RELATED + interactive pairing */}
        <section className="section" data-screen-label="Related resources">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <SectionHead
              eyebrow="Pair with the interactive activities"
              tone="peach"
              title="These printables work best with the camera activities."
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: '✏️ Letter Tracing A–Z', path: '/letter-tracing' },
                { label: '🔢 Number Tracing', path: '/trace-number-1' },
                { label: '⭕ Shape Tracing', path: '/trace-circle' },
                { label: '👩‍🏫 For Teachers', path: '/for-teachers' },
                { label: '👨‍👩‍👧 For Parents', path: '/for-parents' },
              ].map(link => (
                <Link key={link.path} to={link.path} className="btn btn-ghost md">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA into product */}
        <section className="section section-stage" data-screen-label="Resources CTA">
          <div className="wrap">
            <div className="cta-banner">
              <h2 className="h2">Ready to try the live activities?</h2>
              <p className="lead">
                Free Paint is open to everyone, no account needed. Families get 7 days
                free, and teachers can pilot a whole class at no cost.
              </p>
              <div className="cta-actions">
                <Link to="/play" className="btn btn-secondary lg">Try it free now</Link>
                <Link to="/parent/signup" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  Parent free trial <ArrowIcon size={17} />
                </Link>
                <Link to="/teacher/signup" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  Teacher free pilot <ArrowIcon size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
}
