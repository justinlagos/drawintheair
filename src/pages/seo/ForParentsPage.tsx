import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildFAQSchema, buildBreadcrumbSchema, SITE } from '../../seo/seo-config';

const FAQ = [
  { q: 'Is Draw in the Air safe for my child?', a: 'Yes. The webcam feed is processed locally in the browser using Google\'s MediaPipe AI. No video is ever recorded, stored, or transmitted to any server. No personal data or accounts are required. Your child\'s safety and privacy are our absolute top priority.' },
  { q: 'What age is Draw in the Air suitable for?', a: 'Draw in the Air is designed for children aged 3–8 years. The activities span preschool letter and number tracing through early primary school games. The pinch-to-draw gesture is simple enough for 3-year-olds and engaging enough for 8-year-olds.' },
  { q: 'Is there any cost?', a: 'Draw in the Air is completely free. There are no subscriptions, ads, in-app purchases, or hidden costs. The full platform is available at no charge — forever.' },
  { q: 'Can my child use it independently?', a: 'Children aged 5+ can typically use Draw in the Air independently once they\'ve been introduced to the gesture controls. For younger children (3–4), sitting alongside them for the first few sessions helps them learn the pinch gesture quickly.' },
  { q: 'Does it work on a tablet?', a: 'Draw in the Air works best on laptops and desktops with a standard webcam. Most tablets support it through the front-facing camera, though performance is best on a computer. It requires a modern browser with WebRTC support (Chrome, Edge, Firefox, Safari).' },
  { q: 'What happens to the webcam footage?', a: 'Nothing — because we never receive it. All camera processing happens entirely within your browser using client-side AI. The video never leaves your device, is never uploaded, and is never stored. It\'s technically impossible for us to access your child\'s camera feed.' },
  { q: 'Does my child need to be good at technology?', a: 'No! Draw in the Air is specifically designed for young children with no technology experience. The only skill needed is raising one finger. The app guides children through everything else with visual prompts and gentle feedback.' },
  { q: 'Can this replace pencil practice?', a: 'Draw in the Air is designed to complement — not replace — traditional pencil and paper practice. The kinesthetic movements are similar, but paper practice remains important for developing the specific grip and pressure needed for writing. Use both!' },
];

const BENEFITS = [
  { icon: '🛡️', title: 'Zero data collection', desc: 'No video stored. No personal data. No accounts required. Your family\'s privacy is completely protected.' },
  { icon: '🚫', title: 'No ads, ever', desc: 'Draw in the Air contains no advertising, no sponsored content, and no promotional material of any kind. Your child\'s learning environment is completely clean.' },
  { icon: '📱', title: 'No download needed', desc: 'Open the browser, visit the site, and play — instantly. No app store, no installation, no waiting for updates.' },
  { icon: '🧠', title: 'Develops real skills', desc: 'Letter recognition, number formation, hand-eye coordination, fine motor control, and phonics — built through genuine play.' },
  { icon: '💰', title: 'Completely free', desc: 'No freemium, no trial periods, no premium tiers. Every activity, letter, number, and game is fully free, always.' },
  { icon: '🎓', title: 'Curriculum-aligned', desc: 'Activities align with preschool and primary school early learning frameworks — including EYFS (UK) and Common Core (US) readiness standards.' },
];

export default function ForParentsPage() {
  const structuredData = [
    buildFAQSchema(FAQ),
    buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Parents', path: '/for-parents' }]),
  ];

  return (
    <SeoLayout>
      <SEOMeta {...PAGE_META.forParents} structuredData={structuredData} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'For Parents' }]} />
      </div>

      <PageHero
        badge="For Parents"
        emoji="👨‍👩‍👧"
        title="Draw in the Air — Screen-Smart Learning for Your Child"
        subtitle="Not all screen time is the same. Draw in the Air uses gesture technology to turn passive watching into active, physical learning. Free, safe, and built with your child's development in mind."
        cta={{ label: 'Try It With Your Child — Free ✨', path: SITE.appPath }}
      />

      {/* Why parents love it */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Why Parents Choose Draw in the Air</h2>
        <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '0.9rem' }}>Thousands of families use Draw in the Air every week. Here's what makes it different from other kids' apps.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{b.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{b.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* What children learn */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>What Your Child Will Learn</h2>
        <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '0.9rem' }}>Draw in the Air isn't just entertainment — every activity is designed to build measurable developmental skills.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { activity: 'Letter Tracing A–Z', skills: ['Letter recognition and formation', 'Phonics — sounds for all 26 letters', 'Pre-writing fine motor skills', 'Alphabetical order awareness'], icon: '🔤' },
            { activity: 'Number Tracing 1–10', skills: ['Numeral recognition and formation', 'Counting and one-to-one correspondence', 'Number name awareness (one, two, three...)', 'Early maths readiness'], icon: '🔢' },
            { activity: 'Shape Tracing', skills: ['Basic shape recognition (8 shapes)', 'Spatial awareness and geometry foundations', 'Visual discrimination skills', 'Pre-maths concept development'], icon: '⭕' },
            { activity: 'Bubble Pop', skills: ['Hand-eye coordination and visual tracking', 'Reaction speed and reflexes', 'Sustained attention and focus', 'Motivation and achievement mindset'], icon: '🫧' },
            { activity: 'Sort and Place', skills: ['Categorisation and classification', 'Logical thinking and reasoning', 'Spatial reasoning (left/right, above/below)', 'Cognitive flexibility'], icon: '🗂️' },
            { activity: 'Free Paint', skills: ['Creative expression and imagination', 'Colour recognition and mixing', 'Fine motor precision control', 'Confidence and self-expression'], icon: '🎨' },
          ].map(item => (
            <div key={item.activity} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 0', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{ fontSize: '2rem' }}>{item.icon}</div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, marginBottom: 8 }}>{item.activity}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.skills.map(s => <span key={s} style={{ background: 'rgba(108,71,255,0.15)', color: '#c4b5fd', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* How to get started */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Getting Started in 60 Seconds</h2>
        {[
          ['Open the browser', 'On any laptop or desktop with a webcam, go to drawintheair.com. No download, no app store, no waiting.'],
          ['Allow camera access', 'Click "Allow" when the browser asks for camera permission. Your video never leaves your device.'],
          ['Pick an activity', 'Choose from Letter Tracing, Number Tracing, Bubble Pop, Sort and Place, or Free Paint.'],
          ['Teach the pinch gesture', 'Show your child: raise your index finger, then pinch your thumb and index finger together to draw. Open your hand to pause.'],
          ['Let them play!', 'Step back and watch the magic happen. For younger children, sit alongside for the first few minutes to help them understand the gesture.'],
        ].map(([step, desc], i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>{step}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.87rem', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <button onClick={() => navigate(SITE.appPath)} style={{ background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', border: 'none', borderRadius: 28, padding: '14px 36px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
            Try It Now — Free ✨
          </button>
        </div>
      </Section>

      {/* Also useful for */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Also Useful For</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: 'Homeschool Families', path: '/for-homeschool', icon: '🏠' },
            { label: 'Classroom Teachers', path: '/for-teachers', icon: '👩‍🏫' },
            { label: 'STEM Learning', path: '/stem-learning', icon: '🤖' },
            { label: 'Free Resources', path: '/free-resources', icon: '📥' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '0.88rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </Section>

      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Parent FAQ</h2>
        {FAQ.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>
    </SeoLayout>
  );
}
