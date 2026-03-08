import { SeoLayout, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

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

export default function FreeResourcesPage() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <SeoLayout>
      <SEOMeta
        title="Free Printable Letter Tracing Worksheets | Draw in the Air"
        description="Download free PDF templates for tracing uppercase and lowercase letters. Connect digital active learning with offline fine motor practice."
        canonical="/free-resources"
      />

      <PageHero
        badge="Classroom Extras"
        emoji="🖨️"
        title="Free Printables & Worksheets"
        subtitle="Bridge digital and physical learning with our free kindergarten printables. Download individual tracing sheets or full workbook PDFs for pre-K and primary grades."
      />

      {/* ── Classroom Guide PDFs ── */}
      <Section light>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
            📥  Free Classroom Guides
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: 32, lineHeight: 1.6 }}>
            Ten professionally designed PDF guides covering everything from EYFS curriculum links to Chromebook setup.
            Free to download, print, and share with colleagues.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {CLASSROOM_GUIDES.map(guide => (
              <a
                key={guide.file}
                href={`/classroom-guides/${guide.file}`}
                download
                style={{ textDecoration: 'none' }}
              >
                <div style={{
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
                    <span style={{ background: 'rgba(108,71,255,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 }}>{guide.audience}</span>
                    <span style={{ color: '#22d3ee', fontSize: '0.78rem', fontWeight: 700 }}>↓ Download PDF</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a
              href="/classroom-guides/"
              style={{ display: 'inline-block', background: '#6c47ff', color: 'white', borderRadius: 24, padding: '12px 32px', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', boxShadow: '0 4px 14px rgba(108,71,255,0.4)' }}
            >
              Download All 10 Guides
            </a>
          </div>
        </div>
      </Section>

      <Section>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left' }}>

          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Offline Tracing Series (A-Z)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 40 }}>
            After students master large, gross-motor arm movements using Draw in the Air's camera technology, it helps to transition those pathways into fine-motor pencil skills. We've created high-contrast, easy-to-read printable alphabet sheets for every letter. Download them absolutely free below.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 16,
            marginBottom: 60
          }}>
            {letters.map((char) => (
              <div key={char} style={{
                background: '#111629',
                borderRadius: 12,
                border: '1px solid rgba(108,71,255,0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(108,71,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                <div style={{ padding: '24px 0', textAlign: 'center', background: 'rgba(108,71,255,0.05)', fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>
                  {char}{char.toLowerCase()}
                </div>
                <div style={{ padding: 12, textAlign: 'center', borderTop: '1px solid rgba(108,71,255,0.2)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#22d3ee', fontWeight: 600 }}>Download PDF</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(108,71,255,0.2), rgba(34,211,238,0.1))', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
            <h3 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
              Get the Full A-Z Workbook
            </h3>
            <p style={{ color: '#e2e8f0', fontSize: '1rem', marginBottom: 20, maxWidth: 500, margin: '0 auto 20px auto' }}>
              Want all 26 letters in a single, perfectly formatted 54-page document? Download the whole pack for your classroom instantly.
            </p>
            <button style={{
              background: '#6c47ff',
              color: 'white',
              border: 'none',
              borderRadius: 24,
              padding: '12px 32px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(108,71,255,0.4)',
              transition: 'transform 0.2s'
            }}>
              Download Complete Bundle (.ZIP)
            </button>
          </div>

        </div>
      </Section>
    </SeoLayout>
  );
}
