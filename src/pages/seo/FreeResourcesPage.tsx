import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { buildBreadcrumbSchema } from '../../seo/seo-config';

const CLASSROOM_GUIDES = [
  { file: '01-teacher-quick-start-guide.pdf', emoji: '🚀', title: "Teacher's Quick Start Guide", desc: 'Get up and running in under 5 minutes. Covers all modes, the pinch gesture, and classroom setup.', audience: 'All teachers' },
  { file: '02-five-day-movement-break-plan.pdf', emoji: '📅', title: '5-Day Movement Break Plan', desc: 'A ready-to-run weekly structure — one Draw in the Air activity per day, Monday to Friday.', audience: 'Class teachers' },
  { file: '03-fine-motor-skills-integration.pdf', emoji: '✋', title: 'Fine Motor Skills Integration', desc: 'The science behind gesture learning and how it connects to pre-writing development.', audience: 'EYFS / Reception' },
  { file: '04-chromebook-classroom-setup.pdf', emoji: '💻', title: 'Chromebook Classroom Setup', desc: 'Step-by-step setup for school Chromebook carts, labs, and managed devices.', audience: 'Tech coordinators' },
  { file: '05-parent-communication-pack.pdf', emoji: '📨', title: 'Parent Communication Pack', desc: 'Ready-to-send letters, ClassDojo messages, and parent FAQ — zero writing required.', audience: 'Class teachers' },
  { file: '06-progress-tracking-sheet.pdf', emoji: '📊', title: 'Progress & Observation Tracker', desc: 'Observation prompts and an A–Z letter mastery grid for learning journey evidence.', audience: 'All teachers' },
  { file: '07-send-inclusion-support-guide.pdf', emoji: '💜', title: 'SEND & Inclusion Support Guide', desc: 'Specific adaptations for ASC, dyspraxia, ADHD, and EAL learners.', audience: 'SENCOs / TAs' },
  { file: '08-eyfs-reception-activity-guide.pdf', emoji: '🎒', title: 'EYFS & Reception Activity Guide', desc: 'Development Matters mapping and a complete 15-minute session plan for Reception.', audience: 'EYFS / Reception' },
  { file: '09-year1-2-curriculum-connections.pdf', emoji: '📚', title: 'Year 1–2 Curriculum Connections', desc: 'KS1 National Curriculum links across English, Maths, Computing, and PE.', audience: 'Year 1 & 2' },
  { file: '10-after-school-club-guide.pdf', emoji: '🌙', title: 'After-School Club & Home Learning', desc: 'A 45-minute club session plan plus a tear-off parent guide for home use.', audience: 'Extended school / Parents' },
];

// Structured word examples for A-Z display
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

export default function FreeResourcesPage() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const structuredData = [
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Free Resources', path: '/free-resources' },
    ]),
  ];

  return (
    <SeoLayout>
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

      <PageHero
        badge="Classroom Extras"
        emoji="🖨️"
        title="Free Printables & Worksheets"
        subtitle="Bridge digital and physical learning with our free kindergarten printables. Download individual tracing sheets or the full A–Z workbook PDF for pre-K and primary grades."
      />

      {/* ── Classroom Guide PDFs ─────────────────────────────── */}
      <Section light>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
            📥  Free Classroom Guides
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: 32, lineHeight: 1.6 }}>
            Ten professionally designed PDF guides covering everything from EYFS curriculum links
            to Chromebook setup. Free to download, print, and share with colleagues.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {CLASSROOM_GUIDES.map(guide => (
              <a
                key={guide.file}
                href={`/classroom-guides/${guide.file}`}
                download={guide.title}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    background: '#111629',
                    borderRadius: 14,
                    border: '1px solid rgba(108,71,255,0.2)',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(108,71,255,0.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>{guide.emoji}</div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{guide.title}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5, flexGrow: 1 }}>{guide.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ background: 'rgba(108,71,255,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 }}>
                      {guide.audience}
                    </span>
                    <span style={{ color: '#22d3ee', fontSize: '0.78rem', fontWeight: 700 }}>↓ Download PDF</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a
              href="/classroom-guides/01-teacher-quick-start-guide.pdf"
              download="Draw-in-the-Air-Teacher-Quick-Start.pdf"
              style={{
                display: 'inline-block',
                background: '#6c47ff',
                color: 'white',
                borderRadius: 24,
                padding: '12px 32px',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(108,71,255,0.4)',
                marginRight: 12,
              }}
            >
              Download Most Popular Guide
            </a>
            <a
              href="/classroom-guides/az-letter-tracing-workbook.pdf"
              download="Draw-in-the-Air-AZ-Workbook.pdf"
              style={{
                display: 'inline-block',
                background: 'rgba(34,211,238,0.15)',
                color: '#22d3ee',
                border: '1px solid rgba(34,211,238,0.4)',
                borderRadius: 24,
                padding: '12px 32px',
                fontWeight: 700,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              Get the A–Z Workbook
            </a>
          </div>
        </div>
      </Section>

      {/* ── Offline A–Z Tracing Series ───────────────────────── */}
      <Section>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>
            Offline Tracing Series (A–Z)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 36 }}>
            After students master large, gross-motor arm movements using Draw in the Air's camera
            technology, it helps to transition those pathways into fine-motor pencil skills.
            We've created high-contrast, easy-to-read printable alphabet sheets for every letter.
            Each sheet includes tracing guides, a word example, and free practice rows.
            Download them absolutely free.
          </p>

          {/* A–Z grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 12,
            marginBottom: 48,
          }}>
            {letters.map((char) => {
              const [word, emoji] = LETTER_WORDS[char] || [char, ''];
              return (
                <a
                  key={char}
                  href={`/classroom-guides/letter-${char.toLowerCase()}.pdf`}
                  download={`Draw-in-the-Air-Letter-${char}-Tracing.pdf`}
                  style={{ textDecoration: 'none' }}
                  title={`Download Letter ${char} tracing worksheet — ${emoji} ${word}`}
                >
                  <div
                    style={{
                      background: '#111629',
                      borderRadius: 12,
                      border: '1px solid rgba(108,71,255,0.2)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(108,71,255,0.25)';
                      e.currentTarget.style.borderColor = 'rgba(108,71,255,0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'rgba(108,71,255,0.2)';
                    }}
                  >
                    {/* Letter display */}
                    <div style={{
                      padding: '20px 0 8px',
                      textAlign: 'center',
                      background: 'rgba(108,71,255,0.07)',
                    }}>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                        {char}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa', lineHeight: 1, marginTop: 2 }}>
                        {char.toLowerCase()}
                      </div>
                      <div style={{ fontSize: '1.1rem', marginTop: 4 }}>{emoji}</div>
                    </div>
                    {/* Download label */}
                    <div style={{
                      padding: '8px 0',
                      textAlign: 'center',
                      borderTop: '1px solid rgba(108,71,255,0.15)',
                      background: 'rgba(34,211,238,0.04)',
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#22d3ee', fontWeight: 700 }}>
                        ↓ PDF
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Workbook CTA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(108,71,255,0.18), rgba(34,211,238,0.08))',
            border: '1px solid rgba(34,211,238,0.25)',
            borderRadius: 18,
            padding: '36px 32px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📖</div>
            <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
              Get the Full A–Z Workbook
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px auto' }}>
              All 26 letters in a single perfectly-formatted 27-page PDF.
              Cover page, tracing guides, word examples, and free practice rows for every letter.
              Print one copy for the whole class or send home for family practice.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="/classroom-guides/az-letter-tracing-workbook.pdf"
                download="Draw-in-the-Air-AZ-Letter-Tracing-Workbook.pdf"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#6c47ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 24,
                  padding: '14px 36px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(108,71,255,0.5)',
                  textDecoration: 'none',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
              >
                📥 Download Complete Workbook (PDF)
              </a>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 14 }}>
              27 pages · A4 / US Letter · Print-ready · Free to share with colleagues
            </p>
          </div>

          {/* What's inside */}
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { icon: '✏️', label: 'Guided tracing rows', desc: 'Dotted letterforms to trace over — uppercase and lowercase' },
              { icon: '📝', label: 'Free practice rows', desc: 'Blank ruled lines to write independently after tracing' },
              { icon: '📖', label: 'Word examples', desc: 'Each letter includes a picture word — A for Apple, B for Ball' },
              { icon: '🖨️', label: 'Print-ready layout', desc: 'Clean margins, high contrast — prints perfectly on any home printer' },
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(108,71,255,0.07)', borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(108,71,255,0.15)' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{item.icon}</div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>

        </div>
      </Section>

      {/* ── Related Resources ────────────────────────────────── */}
      <Section light>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
            More from Draw in the Air
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: 28 }}>
            These printables work best when paired with the interactive camera activities.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: '✏️ Letter Tracing A–Z', path: '/letter-tracing' },
              { label: '🔢 Number Tracing', path: '/trace-number-1' },
              { label: '⭕ Shape Tracing', path: '/trace-circle' },
              { label: '👩‍🏫 For Teachers', path: '/for-teachers' },
              { label: '👨‍👩‍👧 For Parents', path: '/for-parents' },
            ].map(link => (
              <a
                key={link.path}
                href={link.path}
                style={{
                  background: 'rgba(108,71,255,0.12)',
                  border: '1px solid rgba(108,71,255,0.3)',
                  color: '#a78bfa',
                  borderRadius: 20,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#6c47ff';
                  (e.currentTarget as HTMLElement).style.color = 'white';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.12)';
                  (e.currentTarget as HTMLElement).style.color = '#a78bfa';
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </Section>

    </SeoLayout>
  );
}
