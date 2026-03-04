import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildFAQSchema, buildBreadcrumbSchema, SITE } from '../../seo/seo-config';

const FAQ = [
  { q: 'Does Draw in the Air require student accounts?', a: 'No. Draw in the Air requires zero accounts, logins, or registrations for students or teachers. Simply visit the website and start — making it ideal for any classroom environment.' },
  { q: 'Does it work on school Chromebooks?', a: 'Yes! Draw in the Air is built as a browser-based web app and works on all modern browsers including Chrome on Chromebooks. It requires only camera access, which most school Chromebooks support. No installation or admin approval needed in most school networks.' },
  { q: 'Can I use it on an interactive whiteboard?', a: 'Absolutely. Draw in the Air can be displayed on an interactive whiteboard through any connected laptop. The teacher can demonstrate gestures to the whole class while students follow along on individual devices.' },
  { q: 'Is student data collected?', a: 'No student data is collected. The app runs entirely in the browser with no backend data collection. There are no cookies, no analytics tied to individual students, and no personal data stored. It\'s fully GDPR and COPPA compliant in this regard.' },
  { q: 'Which curriculum frameworks does it support?', a: 'Draw in the Air supports Early Years Foundation Stage (EYFS) in the UK, Common Core early learning standards in the US, and general pre-school/kindergarten readiness frameworks globally. Letter and number tracing are aligned with typical curriculum sequences.' },
  { q: 'Can the whole class use it simultaneously?', a: 'Yes! Each student uses Draw in the Air independently on their own device. There\'s no multi-user setup required — just have every student open the website on their Chromebook or computer.' },
  { q: 'Can I embed it on our school website?', a: 'Yes! Visit drawintheair.com/embed to get the free embed code. Paste it into any school website or blog and it runs directly in the page — great for homework pages or classroom portals.' },
];

const USE_CASES = [
  { icon: '📺', title: 'Interactive Whiteboard Demo', desc: 'Project Draw in the Air on your IWB and demonstrate letter formation to the whole class before individual practice time.' },
  { icon: '💻', title: 'Computer Lab Activity', desc: 'Set up every computer on the Letter Tracing or Number Tracing page for a structured 10-minute finger gym warm-up.' },
  { icon: '🏃', title: 'Brain Break Activity', desc: 'Use Bubble Pop for 5-minute movement breaks — children pop bubbles in the air, getting physical activity without leaving their seats.' },
  { icon: '🏠', title: 'Homework Extension', desc: 'Share the link with parents for at-home practice. No setup needed — just send the URL and the activity name.' },
  { icon: '📐', title: 'Maths Warm-Up', desc: 'Use Number Tracing 1–10 and Shape Tracing as a daily maths warm-up to reinforce numeral formation and geometry concepts.' },
  { icon: '🌐', title: 'Remote / Hybrid Learning', desc: 'Share your screen in Zoom or Meet to demonstrate activities. Students follow along on their own devices from home.' },
];

export default function ForTeachersPage() {
  const structuredData = [
    buildFAQSchema(FAQ),
    buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Teachers', path: '/for-teachers' }]),
  ];

  return (
    <SeoLayout>
      <SEOMeta {...PAGE_META.forTeachers} structuredData={structuredData} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'For Teachers' }]} />
      </div>

      <PageHero
        badge="For Teachers & Educators"
        emoji="👩‍🏫"
        title="Bring Gesture Learning into Your Classroom"
        subtitle="Draw in the Air works on any device with a webcam — no installation, no accounts, no IT tickets. Just a URL. Perfect for Chromebooks, computer labs, interactive whiteboards, and remote learning."
        cta={{ label: 'Open in Browser — Free ✨', path: SITE.appPath }}
      />

      {/* Quick stats */}
      <Section light>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[['0', 'Accounts needed'], ['0', 'Downloads required'], ['26', 'Letter activities'], ['10', 'Number activities'], ['8', 'Shape activities'], ['4', 'Interactive games']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center', background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#6c47ff' }}>{num}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Classroom Use Cases</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.9rem' }}>How teachers are already using Draw in the Air in their classrooms:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {USE_CASES.map(u => (
            <div key={u.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{u.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{u.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.81rem', lineHeight: 1.6 }}>{u.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Curriculum alignment */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Curriculum Alignment</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.9rem' }}>Draw in the Air activities are designed to support early childhood curriculum objectives across multiple frameworks:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { framework: 'EYFS (UK)', areas: ['Communication, Language and Literacy', 'Physical Development — Fine Motor Skills', 'Mathematics — Numbers and Shape', 'Understanding the World — Technology'], color: '#22d3ee' },
            { framework: 'Common Core (US)', areas: ['Print Concepts — Letter Recognition', 'Counting and Cardinality K.CC', 'Geometry — Shape Identification', 'Physical Development — Fine Motor'], color: '#a855f7' },
            { framework: 'General Pre-K', areas: ['Alphabet knowledge A–Z', 'Numeral formation 1–10', 'Basic shape recognition', 'Hand-eye coordination development'], color: '#ec4899' },
          ].map(fw => (
            <div key={fw.framework} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${fw.color}33`, borderRadius: 14, padding: 20 }}>
              <div style={{ color: fw.color, fontWeight: 800, fontSize: '0.9rem', marginBottom: 12 }}>{fw.framework}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {fw.areas.map(a => <li key={a} style={{ color: '#e2e8f0', fontSize: '0.82rem', marginBottom: 6, display: 'flex', gap: 8 }}><span style={{ color: fw.color }}>✓</span>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Resources for teachers */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Free Resources for Your Classroom</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { icon: '📥', label: 'Free Printable Worksheets', path: '/free-resources', desc: 'Letter and number tracing worksheets to complement air drawing practice' },
            { icon: '🔗', label: 'Embed on School Website', path: '/embed', desc: 'Add a Draw in the Air widget to your classroom blog or school portal' },
            { icon: '🏠', label: 'Share With Parents', path: '/for-parents', desc: 'A parent-friendly guide to setting up Draw in the Air at home' },
            { icon: '🤖', label: 'AI for Kids Guide', path: '/learn/ai-for-kids', desc: 'Explain hand tracking technology to students in simple terms' },
          ].map(r => (
            <button key={r.path} onClick={() => navigate(r.path)} style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: 18, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{r.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{r.label}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.5 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Teacher FAQ</h2>
        {FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>
    </SeoLayout>
  );
}
