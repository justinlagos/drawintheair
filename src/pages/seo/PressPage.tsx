import { SeoLayout, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { SITE } from '../../seo/seo-config';

const PRODUCT_SCREENSHOTS = [
  { src: '/icons/screenshots/free-paint.png', alt: 'Free Paint Mode', label: 'Free Paint' },
  { src: '/icons/screenshots/tracing.png', alt: 'Letter Tracing Mode', label: 'Letter Tracing' },
  { src: '/icons/screenshots/bubble-pop.png', alt: 'Bubble Pop Game', label: 'Bubble Pop' },
  { src: '/icons/screenshots/sort-and-place.png', alt: 'Sort and Place Activity', label: 'Sort and Place' },
];

const KEY_FACTS = [
  { label: 'Launch', value: '2025' },
  { label: 'Activities', value: '9' },
  { label: 'Age Range', value: '3-8 years' },
  { label: 'Cost', value: 'Free' },
  { label: 'Accounts Required', value: 'None' },
  { label: 'Data Collected', value: 'None' },
  { label: 'Works On', value: 'Any webcam device' },
  { label: 'Technology', value: 'Google MediaPipe' },
];

export default function PressPage() {
  return (
    <SeoLayout>
      <SEOMeta
        title="Draw in the Air Press Kit | EdTech for Early Childhood"
        description="Official press kit for Draw in the Air. Download high-resolution logos, screenshots, founder bios, and statistics for articles covering gesture-based educational games."
        canonical="/press"
      />

      <PageHero
        badge="Press Kit & Media"
        emoji="📰"
        title="Draw in the Air Press Kit"
        subtitle="Everything journalists, bloggers, and educators need to cover Draw in the Air — the free, gesture-based learning platform for early childhood education."
      />

      {/* About section */}
      <Section>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>
            About Draw in the Air
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 16 }}>
            Draw in the Air is a free, browser-based educational platform that uses real-time computer vision to transform any standard laptop or tablet camera into an interactive learning environment. Children aged 3 to 8 use natural hand gestures to trace letters, numbers, and shapes in the air, developing fine motor skills, phonics knowledge, and hand-eye coordination through physical play.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 16 }}>
            The platform is powered by Google MediaPipe, a production-grade AI library that detects 21 hand landmarks at 30 frames per second. All processing happens entirely in the browser. No video is recorded, transmitted, or stored. No child accounts, no personal data, no ads.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 32 }}>
            Nine activity modes cover letter formation (A-Z), number writing (1-10), shape recognition (8 shapes), hand-eye coordination games, sorting activities, creative drawing, colour mixing, word finding, and mental arithmetic. The platform works on Chromebooks, laptops, and desktops with no installation or IT approval required.
          </p>

          {/* Key facts grid */}
          <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Key Facts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 40 }}>
            {KEY_FACTS.map(f => (
              <div key={f.label} style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ color: 'white', fontSize: '1rem', fontWeight: 700 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Brand assets */}
      <Section light>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>Brand Assets</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.95rem' }}>Download logos and product screenshots for editorial use. All assets may be used in coverage of Draw in the Air with appropriate attribution.</p>

          <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Logos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
            <div style={{ background: '#0a0e1a', padding: 30, borderRadius: 14, border: '1px solid rgba(108,71,255,0.2)', textAlign: 'center' }}>
              <img src="/logo.png" alt="Draw in the Air Primary Logo" style={{ height: 80, width: 'auto', marginBottom: 12 }} />
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Primary Logo (Dark BG)</div>
              <a href="/logo.png" download style={{ display: 'inline-block', marginTop: 12, color: '#22d3ee', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>Download PNG</a>
            </div>
            <div style={{ background: '#ffffff', padding: 30, borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <img src="/logo.png" alt="Draw in the Air Logo on Light Background" style={{ height: 80, width: 'auto', marginBottom: 12 }} />
              <div style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>Logo on Light BG</div>
              <a href="/logo.png" download style={{ display: 'inline-block', marginTop: 12, color: '#6c47ff', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>Download PNG</a>
            </div>
          </div>

          <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Product Screenshots</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            {PRODUCT_SCREENSHOTS.map(s => (
              <div key={s.label} style={{ background: '#111629', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(108,71,255,0.15)' }}>
                <img src={s.src} alt={s.alt} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>Brand Colours</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {[
              { name: 'Purple', hex: '#6c47ff' },
              { name: 'Cyan', hex: '#22d3ee' },
              { name: 'Orange', hex: '#f97316' },
              { name: 'Navy', hex: '#0a0e1a' },
              { name: 'Mint', hex: '#00f5d4' },
            ].map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: c.hex, flexShrink: 0 }} />
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '0.82rem' }}>{c.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'monospace' }}>{c.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Story angles */}
      <Section>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 20 }}>Story Angles</h2>
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.95rem' }}>Suggested directions for journalists and bloggers covering Draw in the Air:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { angle: 'The Privacy-First EdTech Story', desc: 'In a landscape of children\'s apps collecting data, Draw in the Air processes everything locally in the browser. No accounts, no data collection, no tracking. How one platform proves you can build for children without harvesting their information.' },
              { angle: 'AI in the Classroom Without the Hype', desc: 'Real-time computer vision that children can see, touch, and understand. Not a chatbot or content generator — a practical application of AI that makes a child\'s hand the controller.' },
              { angle: 'Movement Learning for the Screen-Time Generation', desc: 'Every interaction requires physical movement. Air tracing builds the same motor pathways used in pencil writing. A counter-intuitive approach: screen time that develops physical skills.' },
              { angle: 'Chromebook-Ready Learning Without IT Approval', desc: 'Teachers in managed device environments face weeks of delays getting new software approved. Draw in the Air runs entirely in the browser — no installation, no admin permissions, no IT tickets.' },
              { angle: 'Inclusive Learning Through Gesture', desc: 'Gesture interaction uses gross motor skills that develop before fine motor precision, making it more accessible for children with coordination difficulties, developmental delays, or limited touchscreen experience.' },
            ].map(s => (
              <div key={s.angle} style={{ background: 'rgba(108,71,255,0.06)', border: '1px solid rgba(108,71,255,0.15)', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{s.angle}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section light>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 800, marginBottom: 16 }}>Media Contact</h2>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.7, marginBottom: 24 }}>
            For interview requests, high-resolution assets, product demonstrations, or additional information, reach our team directly.
          </p>
          <a href="mailto:partnership@drawintheair.com" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #6c47ff, #22d3ee)',
            color: 'white',
            padding: '14px 32px',
            borderRadius: 50,
            fontWeight: 700,
            fontSize: '0.95rem',
            textDecoration: 'none',
          }}>
            partnership@drawintheair.com
          </a>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 16 }}>
            We typically respond within 24 hours.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button onClick={() => navigate(SITE.appPath)} style={{ background: 'rgba(108,71,255,0.15)', border: '1px solid rgba(108,71,255,0.3)', color: '#c4b5fd', borderRadius: 20, padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              Try the Platform
            </button>
            <button onClick={() => navigate('/schools')} style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: '#67e8f9', borderRadius: 20, padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              School Information
            </button>
            <button onClick={() => navigate('/free-resources')} style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#fdba74', borderRadius: 20, padding: '8px 18px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
              Free Resources
            </button>
          </div>
        </div>
      </Section>
    </SeoLayout>
  );
}
