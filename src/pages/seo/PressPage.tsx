/**
 * /press, press kit and media resources.
 *
 * Rebuilt 2026-06 on the Calm design system (landing-calm.css).
 * Content (about copy, key facts, brand assets, story angles, media
 * contact) preserved from the previous SEO-theme version; presentation
 * is new and journalist-friendly: one-liner up top, scannable facts,
 * downloadable assets, story angles, contact block.
 */

import { Link } from 'react-router-dom';
import { CalmFooter, GestureTrail, SectionHead } from '../Landing';
import { HeaderNav } from '../../components/landing/HeaderNav';
import { SEOMeta } from '../../seo/SEOMeta';
import '../../components/landing/landing-calm.css';

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const PRODUCT_SCREENSHOTS = [
  { src: '/icons/screenshots/free-paint.png', alt: 'Free Paint Mode', label: 'Free Paint' },
  { src: '/icons/screenshots/tracing.png', alt: 'Letter Tracing Mode', label: 'Letter Tracing' },
  { src: '/icons/screenshots/bubble-pop.png', alt: 'Bubble Pop Game', label: 'Bubble Pop' },
  { src: '/icons/screenshots/sort-and-place.png', alt: 'Sort and Place Activity', label: 'Sort and Place' },
];

const KEY_FACTS = [
  { label: 'Launch', value: '2025' },
  { label: 'Made in', value: 'United Kingdom' },
  { label: 'Age range', value: '3–7 years' },
  { label: 'Activities', value: '10 modes' },
  { label: 'Child accounts', value: 'None, ever' },
  { label: 'Video stored', value: 'None, on-device only' },
  { label: 'Works on', value: 'Any webcam device' },
  { label: 'Technology', value: 'Google MediaPipe' },
];

const BRAND_COLOURS = [
  { name: 'Lavender', hex: '#8A66F0' },
  { name: 'Mint',     hex: '#3FB87F' },
  { name: 'Sky',      hex: '#5A99F2' },
  { name: 'Sun',      hex: '#F0AC1F' },
  { name: 'Peach',    hex: '#F07A5C' },
  { name: 'Cream',    hex: '#FFFDF7' },
  { name: 'Ink',      hex: '#1F1B2E' },
];

const STORY_ANGLES = [
  { angle: 'The privacy-first EdTech story', desc: 'In a landscape of children’s apps collecting data, Draw in the Air processes everything locally in the browser. No child accounts, no video storage, no tracking of identifiable children. How one platform proves you can build for children without harvesting their information.' },
  { angle: 'AI in the classroom without the hype', desc: 'Real-time computer vision that children can see, touch, and understand. Not a chatbot or content generator, a practical application of AI that makes a child’s hand the controller.' },
  { angle: 'Movement learning for the screen-time generation', desc: 'Every interaction requires physical movement. Air tracing builds the same motor pathways used in pencil writing. A counter-intuitive approach: screen time that develops physical skills.' },
  { angle: 'Chromebook-ready learning without IT approval', desc: 'Teachers in managed device environments face weeks of delays getting new software approved. Draw in the Air runs entirely in the browser, no installation, no admin permissions, no IT tickets.' },
  { angle: 'Inclusive learning through gesture', desc: 'Gesture interaction uses gross motor skills that develop before fine motor precision, making it more accessible for children with coordination difficulties, developmental delays, or limited touchscreen experience.' },
];

export default function PressPage() {
  return (
    <div className="lp-shell">
      <SEOMeta
        title="Draw in the Air Press Kit | EdTech for Early Childhood"
        description="Official press kit for Draw in the Air. Download high-resolution logos, screenshots, key facts, and story angles for articles covering gesture-based educational learning."
        canonical="/press"
      />
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="Press kit">

        {/* HERO */}
        <section className="hero" data-screen-label="Press hero" style={{ paddingBottom: 24 }}>
          <div className="hero-orb" />
          <div className="wrap">
            <div className="sec-head" style={{ marginBottom: 0 }}>
              <div className="eyebrow" style={{ justifyContent: 'center' }}>
                <span className="ic-chip" aria-hidden="true">{'\u{1F4F0}'}</span> Press kit &amp; media
              </div>
              <h1 className="h1" style={{ marginTop: 18 }}>
                The Draw in the Air <span className="grad">press kit.</span>
              </h1>
              <p className="lead" style={{ marginTop: 16 }}>
                <strong>One-liner:</strong> Draw in the Air turns any webcam into a movement-first
                learning tool, children aged 3 to 7 trace letters, numbers and shapes in
                the air, with all camera processing on-device and zero child accounts.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26, flexWrap: 'wrap' }}>
                <a href="mailto:partnership@drawintheair.com" className="btn btn-primary lg">Contact the team</a>
                <Link to="/transparency" className="btn btn-ghost lg">Live pilot metrics <ArrowIcon size={17} /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="section" data-screen-label="About" style={{ paddingTop: 40 }}>
          <div className="wrap" style={{ maxWidth: 860 }}>
            <SectionHead eyebrow="The story" tone="mint" title="About Draw in the Air." />
            <div className="card" style={{ padding: '30px 28px' }}>
              <p style={{ fontSize: '1.02rem', lineHeight: 1.75, marginTop: 0 }}>
                Draw in the Air is a browser-based educational platform that uses real-time
                computer vision to transform any standard laptop or tablet camera into an
                interactive learning environment. Children aged 3 to 7 use natural hand
                gestures to trace letters, numbers, and shapes in the air, developing fine
                motor skills, phonics knowledge, and hand-eye coordination through physical play.
              </p>
              <p style={{ fontSize: '1.02rem', lineHeight: 1.75 }}>
                It was built in the UK around a simple observation: for young children,
                learning lives in the body. Most early-years apps reward tapping; Draw in
                the Air rewards movement, the same whole-arm patterns that pencil writing
                is built on. The platform is EYFS-aligned and used by families at home and
                teachers running whole-class sessions from a single laptop and projector.
              </p>
              <p style={{ fontSize: '1.02rem', lineHeight: 1.75, marginBottom: 0 }}>
                The hand tracking is powered by Google MediaPipe, a production-grade AI
                library that detects 21 hand landmarks in real time, entirely in the
                browser. No video is recorded, transmitted, or stored. No child accounts,
                no personal data on children, no ads.
              </p>
            </div>

            {/* Key facts */}
            <h3 className="h3" style={{ fontSize: '1.15rem', margin: '36px 0 14px' }}>Key facts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              {KEY_FACTS.map(f => (
                <div key={f.label} className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--lavender-600, #7A55E0)', marginBottom: 4 }}>{f.label}</div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{f.value}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.75, marginTop: 14 }}>
              Looking for usage numbers? Our <Link to="/transparency" style={{ fontWeight: 700 }}>transparency page</Link>{' '}
              publishes live, audited pilot metrics straight from production, learners active,
              sessions run, and what we do and don’t yet claim.
            </p>
          </div>
        </section>

        {/* BRAND ASSETS */}
        <section className="section section-tint" data-screen-label="Brand assets">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <SectionHead
              eyebrow="Brand assets"
              tone="sky"
              title="Logos, screenshots and colours."
              lead="All assets may be used in editorial coverage of Draw in the Air with appropriate attribution."
            />

            <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: 14 }}>Logos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 34 }}>
              <div className="card" style={{ padding: 28, textAlign: 'center' }}>
                <img src="/logo.svg" alt="Draw in the Air primary logo" style={{ height: 72, width: 'auto', marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Primary logo (light)</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                  <a href="/logo.svg" download style={{ fontWeight: 700, fontSize: '0.84rem' }}>SVG</a>
                  <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
                  <a href="/logo.png" download style={{ fontWeight: 700, fontSize: '0.84rem' }}>PNG</a>
                </div>
              </div>
              <div className="card" style={{ padding: 28, textAlign: 'center', background: '#1F1B2E' }}>
                <img src="/logo.svg" alt="Draw in the Air logo on dark background" style={{ height: 72, width: 'auto', marginBottom: 12 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFFDF7' }}>Logo on dark</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                  <a href="/logo.svg" download style={{ fontWeight: 700, fontSize: '0.84rem', color: '#C9B5FF' }}>SVG</a>
                  <span aria-hidden="true" style={{ color: '#FFFDF7', opacity: 0.4 }}>·</span>
                  <a href="/logo.png" download style={{ fontWeight: 700, fontSize: '0.84rem', color: '#C9B5FF' }}>PNG</a>
                </div>
              </div>
            </div>

            <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: 14 }}>Product screenshots</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 34 }}>
              {PRODUCT_SCREENSHOTS.map(s => (
                <div key={s.label} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <img src={s.src} alt={s.alt} style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                  <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.86rem' }}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 className="h3" style={{ fontSize: '1.1rem', marginBottom: 14 }}>Brand colours</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {BRAND_COLOURS.map(c => (
                <div key={c.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: c.hex, flexShrink: 0, border: '1px solid rgba(31,27,46,0.12)' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono, monospace)', opacity: 0.7 }}>{c.hex}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STORY ANGLES */}
        <section className="section" data-screen-label="Story angles">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <SectionHead
              eyebrow="For journalists"
              tone="peach"
              title="Story angles."
              lead="Suggested directions for journalists and bloggers covering Draw in the Air."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {STORY_ANGLES.map(s => (
                <div key={s.angle} className="card" style={{ padding: '20px 22px' }}>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>{s.angle}</div>
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.65, opacity: 0.8 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="section section-stage" data-screen-label="Media contact">
          <div className="wrap">
            <div className="cta-banner">
              <h2 className="h2">Media contact.</h2>
              <p className="lead">
                Interview requests, high-resolution assets, product demonstrations, or
                anything else, we typically respond within 24 hours.
              </p>
              <div className="cta-actions">
                <a href="mailto:partnership@drawintheair.com" className="btn btn-secondary lg">
                  partnership@drawintheair.com
                </a>
                <Link to="/play" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  Try the platform <ArrowIcon size={17} />
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
