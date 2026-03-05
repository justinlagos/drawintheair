// src/pages/seo/SeoLayout.tsx
// Shared layout for all SEO content pages — navigation, CTA, footer, internal links

import React from 'react';
import { SITE } from '../../seo/seo-config';

interface SeoLayoutProps {
  children: React.ReactNode;
}

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Letter Tracing', path: '/letter-tracing' },
  { label: 'Activities', path: '/activities/bubble-pop' },
  { label: 'For Parents', path: '/for-parents' },
  { label: 'For Teachers', path: '/for-teachers' },
  { label: 'Learn', path: '/learn' },
];

const FOOTER_COLS = [
  {
    title: 'Trace Letters',
    links: 'ABCDEFGHIJKLM'.split('').map(l => ({ label: `Trace ${l}`, path: `/trace-${l.toLowerCase()}` })),
  },
  {
    title: 'Trace Letters',
    links: 'NOPQRSTUVWXYZ'.split('').map(l => ({ label: `Trace ${l}`, path: `/trace-${l.toLowerCase()}` })),
  },
  {
    title: 'Trace Numbers',
    links: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(n => ({ label: `Trace ${n}`, path: `/trace-number-${n}` })),
  },
  {
    title: 'Activities',
    links: [
      { label: 'Free Paint', path: '/free-paint' },
      { label: 'Bubble Pop', path: '/activities/bubble-pop' },
      { label: 'Sort & Place', path: '/activities/sort-and-place' },
      { label: 'Draw a Heart', path: '/draw-heart-in-air' },
      { label: 'Draw a Star', path: '/draw-star-in-air' },
      { label: 'Alphabet Challenge', path: '/draw-alphabet-in-air' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'For Parents', path: '/for-parents' },
      { label: 'For Teachers', path: '/for-teachers' },
      { label: 'For Homeschool', path: '/for-homeschool' },
      { label: 'STEM Learning', path: '/stem-learning' },
      { label: 'Learning Hub', path: '/learn' },
      { label: 'Free Resources', path: '/free-resources' },
    ],
  },
];

export function SeoLayout({ children }: SeoLayoutProps) {
  return (
    <div style={{ fontFamily: "'Nunito', system-ui, sans-serif", background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0' }}>

      {/* ── HEADER ── */}
      <header style={{ background: 'rgba(10,14,26,0.95)', borderBottom: '1px solid rgba(34,211,238,0.15)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0 }}>
            <img src="/logo.png" alt="Draw in the Air" style={{ height: 44, width: 'auto' }} />
          </button>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', padding: '4px 0' }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => navigate(SITE.appPath)}
              style={{ background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', border: 'none', borderRadius: 24, padding: '8px 20px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}
            >
              Try Free ✨
            </button>
          </nav>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main>
        {children}
      </main>

      {/* ── CTA BAND ── */}
      <section style={{ background: 'linear-gradient(135deg, #6c47ff 0%, #a855f7 50%, #22d3ee 100%)', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <img src="/logo.png" alt="Draw in the Air" style={{ height: 72, width: 'auto', marginBottom: 12 }} />
          <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>Ready to Draw in the Air?</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', marginBottom: 28 }}>Free, no download, no account. Just open your browser and start drawing!</p>
          <button
            onClick={() => navigate(SITE.appPath)}
            style={{ background: 'white', color: '#6c47ff', border: 'none', borderRadius: 32, padding: '16px 40px', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
          >
            Start Drawing — It's Free ✨
          </button>
          <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
            No download · No login · Works on any laptop with a camera
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#060810', borderTop: '1px solid rgba(108,71,255,0.2)', padding: '48px 20px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Link grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px 16px', marginBottom: 40 }}>
            {FOOTER_COLS.map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6c47ff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>{col.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {col.links.map(link => (
                    <li key={link.path} style={{ marginBottom: 6 }}>
                      <button
                        onClick={() => navigate(link.path)}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {/* About col */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6c47ff', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>More</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  { label: 'Embed Widget', path: '/embed' },
                  { label: 'Press Kit', path: '/press' },
                  { label: 'Free Resources', path: '/free-resources' },
                  { label: 'Privacy Policy', path: '/privacy' },
                  { label: 'AI for Kids', path: '/learn/ai-for-kids' },
                ].map(link => (
                  <li key={link.path} style={{ marginBottom: 6 }}>
                    <button onClick={() => navigate(link.path)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}>
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ color: '#475569', fontSize: '0.8rem' }}>
              © {new Date().getFullYear()} Draw in the Air. Free for families and classrooms everywhere.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {['/privacy', '/terms', '/cookies', '/safeguarding'].map(path => (
                <button key={path} onClick={() => navigate(path)} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.78rem', cursor: 'pointer' }}>
                  {path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

interface BreadcrumbProps { items: { label: string; path?: string }[] }
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" style={{ padding: '12px 0', marginBottom: 8 }}>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <li style={{ color: '#475569', fontSize: '0.8rem' }}>›</li>}
            <li>
              {item.path
                ? <button onClick={() => navigate(item.path!)} style={{ background: 'none', border: 'none', color: '#6c47ff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>{item.label}</button>
                : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{item.label}</span>
              }
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

interface FAQItemProps { q: string; a: string }
export function FAQItem({ q, a }: FAQItemProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16, marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', padding: 0, textAlign: 'left', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <span>{q}</span>
        <span style={{ color: '#6c47ff', fontSize: '1.2rem', flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: 10, lineHeight: 1.65 }}>{a}</p>}
    </div>
  );
}

interface PageHeroProps {
  badge?: string;
  title: string;
  subtitle: string;
  emoji?: string;
  cta?: { label: string; path: string };
}
export function PageHero({ badge, title, subtitle, emoji, cta }: PageHeroProps) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1042 50%, #0a0e1a 100%)', padding: '64px 24px 56px', textAlign: 'center', borderBottom: '1px solid rgba(108,71,255,0.2)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {badge && (
          <div style={{ display: 'inline-block', background: 'rgba(108,71,255,0.2)', border: '1px solid rgba(108,71,255,0.4)', color: '#a78bfa', padding: '4px 16px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20 }}>
            {badge}
          </div>
        )}
        {emoji && <div style={{ fontSize: '3rem', marginBottom: 12 }}>{emoji}</div>}
        <h1 style={{ color: 'white', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ color: '#c4b5fd', fontSize: '1.05rem', lineHeight: 1.65, marginBottom: cta ? 28 : 0 }}>{subtitle}</p>
        {cta && (
          <button
            onClick={() => navigate(cta.path)}
            style={{ background: 'linear-gradient(135deg, #6c47ff, #22d3ee)', color: 'white', border: 'none', borderRadius: 32, padding: '14px 36px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
          >
            {cta.label}
          </button>
        )}
      </div>
    </div>
  );
}

interface SectionProps { children: React.ReactNode; light?: boolean }
export function Section({ children, light }: SectionProps) {
  return (
    <section style={{ padding: '56px 24px', background: light ? '#111629' : '#0a0e1a' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {children}
      </div>
    </section>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { navigate };
