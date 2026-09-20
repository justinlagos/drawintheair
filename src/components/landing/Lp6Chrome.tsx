/**
 * Lp6Chrome.tsx — shared chrome + primitives for the `.lp6` marketing design
 * (Sept 2026 redesign). Used by the home page (Landing) and the Parents,
 * Teachers, Pricing and About pages so all five share one nav + footer.
 *
 * Everything here is styled by src/pages/landing-redesign.css (scoped `.lp6`).
 * The page component must render inside a <div className="lp6"> … </div>.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logEvent } from '../../lib/analytics';
import '../../pages/landing-redesign.css';

/* ---------------------------------------------------------------- icons */
export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
export function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" />
    </svg>
  );
}
export function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}
export function LaptopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="12" rx="2" /><path d="M2 20h20" />
    </svg>
  );
}

/* Hide a badge/logo image gracefully if the asset is missing. */
export function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  const wrap = el.closest('[data-optional]') as HTMLElement | null;
  if (wrap) wrap.style.display = 'none'; else el.style.display = 'none';
}

/* ------------------------------------------------- scroll reveal + trail */
export function useLp6Reveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0, ticking = false;
    const pass = () => {
      ticking = false;
      const h = window.innerHeight;
      root.querySelectorAll('.reveal:not(.in)').forEach((el) => {
        if (el.getBoundingClientRect().top < h - 40) el.classList.add('in');
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; raf = requestAnimationFrame(pass); } };
    const r1 = requestAnimationFrame(() => { root.classList.add('anim'); pass(); });
    const t1 = window.setTimeout(pass, 160);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(r1); clearTimeout(t1);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rootRef]);
}

export function Lp6GestureTrail() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf = 0, w = 0, h = 0, dpr = 1;
    const pts: { x: number; y: number; t: number }[] = [];
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);
    const move = (e: PointerEvent) => {
      pts.push({ x: e.clientX * dpr, y: e.clientY * dpr, t: performance.now() });
      if (pts.length > 18) pts.shift();
    };
    window.addEventListener('pointermove', move, { passive: true });
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const age = (now - p1.t) / 700; if (age > 1) continue;
        const a = (1 - age) * (i / pts.length);
        const mix = i / pts.length;
        const r = Math.round(108 + (85 - 108) * mix);
        const g = Math.round(63 + (221 - 63) * mix);
        const b = Math.round(164 + (224 - 164) * mix);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a * 0.85})`;
        ctx.lineWidth = (1 - age) * 9 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
    };
  }, []);
  return <canvas ref={ref} className="trail-canvas" aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }} />;
}

/* ------------------------------------------------------------- FAQ */
export function Lp6Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {items.map((f, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 16, background: 'none', border: 0, cursor: 'pointer', padding: '22px 4px',
              fontFamily: 'var(--display)', fontWeight: 700, fontSize: 19, textAlign: 'left', color: 'var(--ink)',
            }}
          >
            <span>{f.q}</span>
            <span style={{ color: 'var(--plum)', fontSize: 24, flex: 'none' }}>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && (
            <p style={{ margin: '0 4px 22px', color: 'var(--ink-soft)', fontSize: 17, maxWidth: '60ch' }}>{f.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- nav */
type NavKey = 'home' | 'parents' | 'teachers' | 'pricing' | 'about';
const NAV: { key: NavKey; label: string; to: string }[] = [
  { key: 'home',     label: 'Home',         to: '/' },
  { key: 'parents',  label: 'For Parents',  to: '/parents' },
  { key: 'teachers', label: 'For Teachers', to: '/teachers' },
  { key: 'pricing',  label: 'Pricing',      to: '/pricing' },
  { key: 'about',    label: 'About',        to: '/about' },
];

export function Lp6Nav({ active }: { active?: NavKey }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const go = (label: string, to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    logEvent('nav_click', { meta: { label, dest: to } });
    setOpen(false);
    navigate(to);
  };
  const tryNow = (source: string) => () => {
    logEvent('cta_click', { meta: { source, dest: '/play' } });
    setOpen(false);
    navigate('/play');
  };
  return (
    <nav data-screen-label="Nav">
      <div className="wrap">
        <a className="logo" href="/" onClick={go('home', '/')}>
          <img src="/logo.svg" alt="Draw in the Air" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }} />
        </a>
        <div className="menu">
          {NAV.map((n) => (
            <a key={n.key} className={active === n.key ? 'on' : undefined} href={n.to} onClick={go(n.key, n.to)}>{n.label}</a>
          ))}
        </div>
        <div className="navr">
          <a href="/parent/login" onClick={go('login', '/parent/login')}>Log in</a>
          <button type="button" className="btn" onClick={tryNow('nav')}>Try it now</button>
          <button type="button" className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        {NAV.map((n) => (
          <a key={n.key} href={n.to} onClick={go(n.key, n.to)}>{n.label}</a>
        ))}
        <a href="/parent/login" onClick={go('login', '/parent/login')}>Log in</a>
        <button type="button" className="btn" onClick={tryNow('mobile_menu')}>Try it now</button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------- footer */
export function Lp6Footer() {
  return (
    <footer data-screen-label="Footer">
      <div className="wrap">
        <span className="word">Draw in the Air</span>

        <div className="fnav">
          <Link to="/parents">For Parents</Link>
          <Link to="/teachers">For Teachers</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/free-resources">Free resources</Link>
          <Link to="/transparency">Transparency</Link>
        </div>

        <div className="fbadges">
          <span data-optional>
            <img src="/landing-assets/gess-finalist-2026.png" alt="GESS Education Awards 2026 Finalist" onError={hideOnError} />
          </span>
        </div>

        <div className="fmpl" style={{ justifyContent: 'center', marginTop: 24 }}>
          <span data-optional style={{ display: 'inline-flex' }}>
            <img
              src="/landing-assets/motionplay-labs.png"
              alt="MotionPlay Labs"
              onError={hideOnError}
              style={{ height: 18, width: 'auto', opacity: 0.45 }}
            />
          </span>
          <span>A product of MotionPlay Labs Ltd (Company Number 17304660).</span>
        </div>

        <div className="fl2">
          <span>{'©'} 2026 MotionPlay Labs Ltd. EYFS aligned. Made in the UK.</span>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <Link to="/parent/login">Family login</Link>
            <Link to="/teacher/login">Teacher login</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <a href="mailto:hello@drawintheair.com">hello@drawintheair.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
