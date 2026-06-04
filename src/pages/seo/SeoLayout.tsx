// src/pages/seo/SeoLayout.tsx
// Shared layout for all SEO content pages.
// Rebuilt June 2026 on the Calm design system (landing-calm.css):
// lp-shell + HeaderNav + CalmFooter. The internal SEO link hub
// (A-Z trace links, activities, learning links) is preserved as a
// Calm-styled tinted section above the footer because those links
// carry SEO value. The exported helpers (navigate, Breadcrumb,
// FAQItem, PageHero, Section) keep identical signatures so all
// consuming pages work without edits.

import React, { useState } from 'react';
import { SITE } from '../../seo/seo-config';
import { HeaderNav } from '../../components/landing/HeaderNav';
import { CalmFooter } from '../Landing';
import '../../components/landing/landing-calm.css';

// ─── Navigation ─────────────────────────────────────────────────────────────

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const LINK_HUB_COLS = [
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
    links: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(n => ({
      label: `Trace ${n}`, path: `/trace-number-${n}`,
    })),
  },
  {
    title: 'Activities',
    links: [
      { label: 'Free Paint',          path: '/free-paint' },
      { label: 'Bubble Pop',          path: '/activities/bubble-pop' },
      { label: 'Sort & Place',        path: '/activities/sort-and-place' },
      { label: 'Letter Tracing A–Z',  path: '/letter-tracing' },
      { label: 'Alphabet Challenge',  path: '/draw-alphabet-in-air' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'For Parents',     path: '/for-parents' },
      { label: 'For Teachers',    path: '/for-teachers' },
      { label: 'For Homeschool',  path: '/for-homeschool' },
      { label: 'AI for Kids',     path: '/learn/ai-for-kids' },
      { label: 'Learning Hub',    path: '/learn' },
      { label: 'Free Resources',  path: '/free-resources' },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'Embed Widget',    path: '/embed' },
      { label: 'Press Kit',       path: '/press' },
      { label: 'Free Resources',  path: '/free-resources' },
      { label: 'AI for Kids',     path: '/learn/ai-for-kids' },
      { label: 'Privacy Policy',  path: '/privacy' },
    ],
  },
];

// ─── SeoLayout ───────────────────────────────────────────────────────────────

interface SeoLayoutProps {
  children: React.ReactNode;
}

export function SeoLayout({ children }: SeoLayoutProps) {
  return (
    <div className="lp-shell" aria-label="Draw in the Air">
      <HeaderNav />

      {/* ── MAIN CONTENT ── */}
      <main className="page">
        {children}

        {/* ── CTA BAND ── */}
        <section className="section section-stage">
          <div className="wrap">
            <div className="cta-banner">
              <h2 className="h2">Ready to Draw in the Air?</h2>
              <p className="lead">Free, no download, no account. Just open your browser and start drawing!</p>
              <div className="cta-actions">
                <button className="btn btn-secondary lg" onClick={() => navigate(SITE.appPath)}>
                  Start Drawing, It's Free ✨
                </button>
              </div>
              <p style={{ marginTop: 18, marginBottom: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>
                No download · No login · Works on any laptop with a camera
              </p>
            </div>
          </div>
        </section>

        {/* ── SEO LINK HUB, internal links carry SEO value ── */}
        <section className="section section-tint" aria-label="Explore Draw in the Air" style={{ paddingTop: 'clamp(40px, 6vw, 64px)', paddingBottom: 'clamp(40px, 6vw, 64px)' }}>
          <div className="wrap">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 24 }}>
              {LINK_HUB_COLS.map((col, i) => (
                <div key={i}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--lavender-700, #5C3FB0)', marginBottom: 12 }}>
                    {col.title}
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {col.links.map(link => (
                      <li key={link.path} style={{ marginBottom: 7 }}>
                        <button
                          className="seo-hub-link"
                          style={{ padding: 0, fontSize: '0.85rem', color: 'var(--ink-700, #3A3450)', opacity: 0.85, textAlign: 'left' }}
                          onClick={() => navigate(link.path)}
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <style>{`
            .lp-shell .seo-hub-link { transition: color 160ms ease, opacity 160ms ease; }
            .lp-shell .seo-hub-link:hover { color: var(--lavender-600, #7350D8); opacity: 1; }
          `}</style>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <CalmFooter />
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

interface BreadcrumbProps {
  items: { label: string; path?: string }[];
}
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" style={{ padding: '18px 0 0' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, listStyle: 'none', margin: 0, padding: 0, fontSize: '0.82rem' }}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <li aria-hidden style={{ color: 'var(--ink-400, #908AA3)' }}>›</li>}
            <li>
              {item.path
                ? (
                  <button
                    onClick={() => navigate(item.path!)}
                    style={{ padding: 0, fontSize: 'inherit', fontWeight: 600, color: 'var(--lavender-700, #5C3FB0)' }}
                  >
                    {item.label}
                  </button>
                )
                : <span style={{ color: 'var(--ink-500, #6B6580)', fontWeight: 600 }}>{item.label}</span>
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
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`} style={{ marginBottom: 12 }}>
      <button
        type="button"
        className="faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="faq-icon" aria-hidden>+</span>
      </button>
      <div className="faq-a-wrap"><div className="faq-a"><p>{a}</p></div></div>
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
    <section className="hero" style={{ paddingBottom: 24 }}>
      <div className="hero-orb" />
      <div className="wrap">
        <div className="sec-head" style={{ marginBottom: 0 }}>
          {badge && (
            <div className="eyebrow" style={{ justifyContent: 'center' }}>
              {emoji ? <span className="ic-chip" aria-hidden="true">{emoji}</span> : <span className="dot" />}
              {badge}
            </div>
          )}
          {!badge && emoji && <div style={{ fontSize: '2.4rem' }} aria-hidden="true">{emoji}</div>}
          <h1 className="h1" style={{ marginTop: 18, fontSize: 'clamp(34px, 5vw, 60px)' }}>{title}</h1>
          <p className="lead" style={{ marginTop: 16 }}>{subtitle}</p>
          {cta && (
            <div className="cta-actions" style={{ justifyContent: 'center', marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary lg" onClick={() => navigate(cta.path)}>
                {cta.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface SectionProps {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}
export function Section({ children, light, className = '' }: SectionProps) {
  return (
    <section
      className={`section${light ? ' section-tint' : ''} ${className}`.trim()}
      style={{ paddingTop: 'clamp(44px, 6vw, 72px)', paddingBottom: 'clamp(44px, 6vw, 72px)' }}
    >
      <div className="wrap" style={{ maxWidth: 980 }}>
        {children}
      </div>
    </section>
  );
}
