// src/pages/seo/SeoLayout.tsx
// Shared layout for all SEO content pages.
// Supports dark (default) and light mode via data-seo-theme attribute + seo-theme.css.

import React, { useState, useEffect } from 'react';
import './seo-theme.css';
import { SITE } from '../../seo/seo-config';

// ─── Theme management ────────────────────────────────────────────────────────

type SeoTheme = 'dark' | 'light';

function getStoredTheme(): SeoTheme {
  try {
    const stored = localStorage.getItem('seo-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* storage may be unavailable */ }
  return 'dark';
}

function saveTheme(theme: SeoTheme) {
  try { localStorage.setItem('seo-theme', theme); } catch { /* ignore */ }
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const NAV_LINKS = [
  { label: 'Home',          path: '/' },
  { label: 'Letter Tracing',path: '/letter-tracing' },
  { label: 'Activities',    path: '/activities/bubble-pop' },
  { label: 'For Parents',   path: '/for-parents' },
  { label: 'For Teachers',  path: '/for-teachers' },
  { label: 'Learn',         path: '/learn' },
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
];

// ─── SeoLayout ───────────────────────────────────────────────────────────────

interface SeoLayoutProps {
  children: React.ReactNode;
}

export function SeoLayout({ children }: SeoLayoutProps) {
  const [theme, setTheme] = useState<SeoTheme>(getStoredTheme);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div
      className="seo-root"
      data-seo-theme={theme}
      aria-label="Draw in the Air"
    >
      {/* ── NAVIGATION ── */}
      <header className="seo-nav">
        <div className="seo-nav-inner">
          {/* Logo */}
          <button className="seo-nav-logo" onClick={() => navigate('/')} aria-label="Go to homepage">
            <img src="/logo.png" alt="Draw in the Air" />
          </button>

          {/* Desktop links */}
          <nav className="seo-nav-links" aria-label="Main navigation">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                className="seo-nav-link"
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="seo-nav-actions">
            <button
              className="seo-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="seo-btn-cta" onClick={() => navigate(SITE.appPath)}>
              Try Free ✨
            </button>
            {/* Hamburger */}
            <button
              className="seo-hamburger"
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <nav className="seo-mobile-menu" aria-label="Mobile navigation">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                className="seo-mobile-link"
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
              >
                {link.label}
              </button>
            ))}
            <button
              className="seo-mobile-cta"
              onClick={() => { navigate(SITE.appPath); setMobileOpen(false); }}
            >
              Try Free ✨
            </button>
          </nav>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main>
        {children}
      </main>

      {/* ── CTA BAND ── */}
      <section className="seo-cta-band">
        <div className="seo-cta-band-inner">
          <img
            src="/logo.png"
            alt="Draw in the Air"
            style={{ height: 72, width: 'auto', display: 'block', margin: '0 auto 14px' }}
          />
          <h2>Ready to Draw in the Air?</h2>
          <p>Free, no download, no account. Just open your browser and start drawing!</p>
          <button className="seo-cta-band-btn" onClick={() => navigate(SITE.appPath)}>
            Start Drawing — It's Free ✨
          </button>
          <div className="seo-cta-band-note">
            No download · No login · Works on any laptop with a camera
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="seo-footer">
        <div className="seo-footer-grid">
          {FOOTER_COLS.map((col, i) => (
            <div key={i}>
              <div className="seo-footer-col-title">{col.title}</div>
              <ul className="seo-footer-list">
                {col.links.map(link => (
                  <li key={link.path}>
                    <button className="seo-footer-link" onClick={() => navigate(link.path)}>
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* More */}
          <div>
            <div className="seo-footer-col-title">More</div>
            <ul className="seo-footer-list">
              {[
                { label: 'Embed Widget',    path: '/embed' },
                { label: 'Press Kit',       path: '/press' },
                { label: 'Free Resources',  path: '/free-resources' },
                { label: 'AI for Kids',     path: '/learn/ai-for-kids' },
                { label: 'Privacy Policy',  path: '/privacy' },
              ].map(link => (
                <li key={link.path}>
                  <button className="seo-footer-link" onClick={() => navigate(link.path)}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="seo-footer-bottom">
          <div className="seo-footer-copy">
            © {new Date().getFullYear()} Draw in the Air. Free for families and classrooms everywhere.
          </div>
          <div className="seo-footer-legal">
            {['/privacy', '/terms', '/cookies', '/safeguarding'].map(path => (
              <button key={path} className="seo-footer-link" onClick={() => navigate(path)}>
                {path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

interface BreadcrumbProps {
  items: { label: string; path?: string }[];
}
export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="seo-breadcrumb" aria-label="Breadcrumb">
      <ol className="seo-breadcrumb-list">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <li className="seo-breadcrumb-sep" aria-hidden>›</li>}
            <li>
              {item.path
                ? (
                  <button
                    className="seo-breadcrumb-link"
                    onClick={() => navigate(item.path!)}
                  >
                    {item.label}
                  </button>
                )
                : <span className="seo-breadcrumb-current">{item.label}</span>
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
    <div className="seo-faq-item">
      <button
        className="seo-faq-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span className="seo-faq-toggle" aria-hidden>{open ? '−' : '+'}</span>
      </button>
      {open && <p className="seo-faq-answer">{a}</p>}
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
    <div className="seo-hero">
      <div className="seo-hero-inner">
        {badge && <div className="seo-hero-badge">{badge}</div>}
        {emoji && <span className="seo-hero-emoji">{emoji}</span>}
        <h1 className="seo-hero-title">{title}</h1>
        <p className={`seo-hero-subtitle${cta ? ' has-cta' : ''}`}>{subtitle}</p>
        {cta && (
          <button className="seo-hero-cta" onClick={() => navigate(cta.path)}>
            {cta.label}
          </button>
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}
export function Section({ children, light, className = '' }: SectionProps) {
  return (
    <section className={`seo-section${light ? ' seo-section-light' : ''} ${className}`.trim()}>
      <div className="seo-section-inner">
        {children}
      </div>
    </section>
  );
}
