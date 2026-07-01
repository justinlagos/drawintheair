import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../BrandLogo';
import './landing-calm.css';

interface HeaderNavProps {
  /** Optional override for the Try-free CTA click handler. */
  onTryFree?: () => void;
}

const NAV_LINKS: { id: string; label: string; href: string }[] = [
  { id: 'home',     label: 'Home',         href: '/' },
  { id: 'parents',  label: 'For Parents',  href: '/parents' },
  { id: 'teachers', label: 'For Teachers', href: '/teachers' },
  { id: 'pricing',  label: 'Pricing',      href: '/pricing' },
  { id: 'about',    label: 'About',        href: '/about' },
];

function useScrolled(threshold = 50) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const onScroll = () => setS(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return s;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * HeaderNav, Calm-direction landing nav.
 *
 * Sticky transparent nav that crystallises into glass on scroll, with a
 * five-link rail (Home, For Parents, For Teachers, Pricing, About), a
 * context-aware Log in control, and a primary Try free CTA. Mobile uses
 * a hamburger that drops the rail in a stacked sheet.
 */
export const HeaderNav: React.FC<HeaderNavProps> = ({ onTryFree }) => {
  const scrolled = useScrolled(50);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  // Close mobile sheet when the route changes.
  useEffect(() => { setMobileOpen(false); }, [path]);

  const activeId =
    path === '/'          ? 'home'     :
    path.startsWith('/parents')  ? 'parents'  :
    path.startsWith('/teachers') ? 'teachers' :
    path.startsWith('/pricing')  ? 'pricing'  :
    path.startsWith('/about')    ? 'about'    :
    '';

  // "Try free" must respect context: on the teacher pages it should lead to
  // the teacher pilot signup, not parent signup. Elsewhere it opens the play
  // demo (when provided) or falls back to family signup.
  const tryFreeHref = activeId === 'teachers' ? '/teacher/signup' : '/parent/signup';
  const onTryFreeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (activeId === 'teachers') {
      navigate('/teacher/signup');
      return;
    }
    if (onTryFree) {
      onTryFree();
      return;
    }
    navigate('/parent/signup');
  };

  // Context-aware login: teacher page -> Teacher login, parent page -> Family
  // login, everywhere else -> a tidy dropdown offering both.
  let loginControl: React.ReactNode;
  if (activeId === 'teachers') {
    loginControl = (
      <Link to="/teacher/login" className="btn btn-ghost sm">Teacher login</Link>
    );
  } else if (activeId === 'parents') {
    loginControl = (
      <Link to="/parent/login" className="btn btn-ghost sm">Family login</Link>
    );
  } else {
    loginControl = (
      <div className="nav-login" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`btn btn-ghost sm nav-login-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
        >
          Log in <ChevronIcon />
        </button>
        {menuOpen && (
          <div className="nav-menu">
            <button
              type="button"
              className="nav-menu-item"
              onClick={() => { setMenuOpen(false); navigate('/parent/login'); }}
            >
              <span className="nmi-ic" style={{ background: 'var(--peach-100)' }} aria-hidden="true">{'\u{1F3E0}'}</span>
              <span>
                <strong>Family login</strong>
                <em>For parents at home</em>
              </span>
            </button>
            <button
              type="button"
              className="nav-menu-item"
              onClick={() => { setMenuOpen(false); navigate('/teacher/login'); }}
            >
              <span className="nmi-ic" style={{ background: 'var(--sky-100)' }} aria-hidden="true">{'\u{1F34E}'}</span>
              <span>
                <strong>Teacher login</strong>
                <em>For schools and classrooms</em>
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} data-screen-label="Nav">
      <div className="wrap row">
        <Link to="/" className="nav-logo" aria-label="Draw in the Air, home">
          <BrandLogo variant="header" alt="Draw in the Air" />
        </Link>
        <div className="nav-links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.id}
              to={l.href}
              className={`nav-link ${activeId === l.id ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <span className="nav-spacer" />
        <div className="nav-cta">
          {loginControl}
          <a href={tryFreeHref} className="btn btn-primary sm" onClick={onTryFreeClick}>
            Try free
          </a>
        </div>
        <button
          type="button"
          className="nav-burger"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      {mobileOpen && (
        <div className="nav-mobile">
          <div className="wrap">
            {NAV_LINKS.map((l) => (
              <Link key={l.id} to={l.href}>{l.label}</Link>
            ))}
            <Link to="/parent/login">Family login</Link>
            <Link to="/teacher/login">Teacher login</Link>
            <div className="nav-mobile-cta">
              <a href={tryFreeHref} className="btn btn-primary md" onClick={onTryFreeClick}>
                Try free
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
