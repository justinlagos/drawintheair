/**
 * LegalPageLayout — Kid-UI bright sky shell for legal/static pages
 *
 * Used by Privacy, Terms, Cookies, Safeguarding, Accessibility, etc.
 * Replaces the legacy orange/light theme with the bright sky design
 * language: Fredoka headings, Nunito body, plum accents, cream surfaces,
 * sky background.
 */

import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { KidButton } from '../kid-ui';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    heroTitle: string;
    /** Optional kicker shown above the title, e.g. "LEGAL · PRIVACY" */
    eyebrow?: string;
    /** Last-updated string. Auto-shown if provided. */
    lastUpdated?: string;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ children, heroTitle, eyebrow, lastUpdated }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 22%, #FFF6E5 60%, #FFFAEB 100%)',
            fontFamily: tokens.fontFamily.body,
            color: tokens.colors.charcoal,
        }}>
            {/* ═══════ NAV ═══════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(18px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
                borderBottom: '1.5px solid rgba(108, 63, 164, 0.10)',
            }}>
                <div style={{ width: '100%', maxWidth: 1152, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <a href="/#top" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
                        <img src="/logo.png" alt="Draw in the Air" width={120} height={36} className="dl-nav-logo" />
                        <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.1rem', color: tokens.colors.deepPlum }} className="lpl-brand">
                            Draw in the Air
                        </span>
                    </a>
                    <div className="lpl-desktop" style={{ alignItems: 'center', gap: 24, fontFamily: tokens.fontFamily.body, fontWeight: 600, color: tokens.colors.charcoal }}>
                        <a href="/#how-it-works" className="lpl-nav-link">How it Works</a>
                        <a href="/#features" className="lpl-nav-link">Activities</a>
                        <a href="/#parents" className="lpl-nav-link">For Families</a>
                        <a href="/#schools" className="lpl-nav-link">For Educators</a>
                        <a href="/faq" className="lpl-nav-link">FAQ</a>
                        <a href="/play" style={{ textDecoration: 'none' }}>
                            <KidButton variant="primary" size="md" style={{ minHeight: 44, padding: '8px 22px', fontSize: '0.95rem' }}>Try Free</KidButton>
                        </a>
                    </div>
                    <button
                        className="lpl-mobile-toggle"
                        style={{ background: 'none', border: 'none', color: tokens.colors.deepPlum, padding: 4 }}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="lpl-mobile-drawer" style={{ padding: '8px 24px 16px', background: '#FFFFFF', borderTop: '2px solid rgba(108, 63, 164, 0.10)' }}>
                        <a href="/#how-it-works" className="lpl-mobile-link">How it Works</a>
                        <a href="/#features" className="lpl-mobile-link">Activities</a>
                        <a href="/#parents" className="lpl-mobile-link">For Families</a>
                        <a href="/#schools" className="lpl-mobile-link">For Educators</a>
                        <a href="/faq" className="lpl-mobile-link">FAQ</a>
                        <a href="/play" style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}>
                            <KidButton variant="primary" size="md" fullWidth>Try Free</KidButton>
                        </a>
                    </div>
                )}
            </nav>

            {/* ═══════ MAIN CONTENT ═══════ */}
            <main style={{ flexGrow: 1, paddingTop: 110, paddingBottom: 80, position: 'relative' }}>
                {/* Decorative sun + clouds in the background */}
                <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                    <div style={{
                        position: 'absolute',
                        top: '4%',
                        right: '6%',
                        width: 'clamp(120px, 14vw, 180px)',
                        height: 'clamp(120px, 14vw, 180px)',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #FFF1B5 0%, #FFD84D 40%, rgba(255, 216, 77, 0) 100%)',
                        opacity: 0.7,
                    }} />
                    <div style={{ position: 'absolute', top: '14%', left: '-3%', width: 180, height: 50, borderRadius: 9999, background: '#FFFFFF', opacity: 0.85, boxShadow: '40px 8px 0 -8px #FFFFFF, 80px -4px 0 -12px #FFFFFF' }} />
                    <div style={{ position: 'absolute', top: '40%', left: '70%', width: 140, height: 40, borderRadius: 9999, background: '#FFFFFF', opacity: 0.7, boxShadow: '30px -4px 0 -6px #FFFFFF' }} />
                </div>

                <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', padding: '0 24px', zIndex: 1 }}>
                    {/* Eyebrow + heading */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        {eyebrow && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                background: '#FFFFFF',
                                border: '2px solid rgba(108, 63, 164, 0.18)',
                                borderRadius: 9999,
                                padding: '6px 14px',
                                fontFamily: tokens.fontFamily.display,
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: tokens.colors.deepPlum,
                                boxShadow: tokens.shadow.float,
                                marginBottom: 18,
                            }}>{eyebrow}</span>
                        )}
                        <h1 style={{
                            fontFamily: tokens.fontFamily.display,
                            fontWeight: 700,
                            fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)',
                            lineHeight: 1.05,
                            letterSpacing: '-0.02em',
                            color: tokens.colors.charcoal,
                            margin: 0,
                        }}>{heroTitle}</h1>
                        {lastUpdated && (
                            <p style={{
                                marginTop: 14,
                                fontFamily: tokens.fontFamily.body,
                                fontSize: '0.9rem',
                                color: tokens.colors.charcoal,
                                opacity: 0.65,
                                fontWeight: 600,
                            }}>Last updated: {lastUpdated}</p>
                        )}
                    </div>

                    {/* Content card */}
                    <div className="lpl-content" style={{
                        position: 'relative',
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)',
                        border: '3px solid rgba(108, 63, 164, 0.14)',
                        borderRadius: 36,
                        padding: 'clamp(28px, 5vw, 56px)',
                        boxShadow: '0 24px 60px rgba(108, 63, 164, 0.12), 0 6px 20px rgba(108, 63, 164, 0.08)',
                        overflow: 'hidden',
                    }}>
                        {/* Rainbow strip at top */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 6,
                            background: 'linear-gradient(90deg, #FF6B85 0%, #FFD84D 25%, #7ED957 50%, #55DDE0 75%, #6C3FA4 100%)',
                        }} />
                        {children}
                    </div>

                    {/* Bottom CTA */}
                    <div style={{ marginTop: 40, textAlign: 'center' }}>
                        <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1rem', color: tokens.colors.charcoal, opacity: 0.75, marginBottom: 16 }}>
                            Questions? <a href="mailto:partnership@drawintheair.com" style={{ color: tokens.colors.deepPlum, fontWeight: 700, textDecoration: 'none' }}>Get in touch</a>
                        </p>
                        <a href="/" style={{ textDecoration: 'none' }}>
                            <KidButton variant="secondary" size="md">← Back to home</KidButton>
                        </a>
                    </div>
                </div>
            </main>

            {/* ═══════ FOOTER ═══════ */}
            <footer style={{
                background: '#FFFFFF',
                borderTop: '2px solid rgba(108, 63, 164, 0.10)',
                padding: '48px 0 24px',
                marginTop: 'auto',
            }}>
                <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px' }}>
                    <div className="lpl-footer-grid">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <img src="/logo.png" alt="Draw in the Air" width={110} height={32} className="dl-footer-logo" />
                                <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1rem', color: tokens.colors.deepPlum }}>Draw in the Air</span>
                            </div>
                            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.7, lineHeight: 1.55 }}>
                                Active learning that moves young minds forward.
                            </p>
                        </div>
                        <div>
                            <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Product</h4>
                            <a className="lpl-footer-link" href="/play">Try Free</a>
                            <a className="lpl-footer-link" href="/schools">School Pilot Pack</a>
                            <a className="lpl-footer-link" href="/faq">FAQ</a>
                            <a className="lpl-footer-link" href="/pricing">Pricing</a>
                        </div>
                        <div>
                            <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Legal</h4>
                            <a className="lpl-footer-link" href="/privacy">Privacy Policy</a>
                            <a className="lpl-footer-link" href="/terms">Terms of Use</a>
                            <a className="lpl-footer-link" href="/safeguarding">Safeguarding</a>
                            <a className="lpl-footer-link" href="/accessibility">Accessibility</a>
                            <a className="lpl-footer-link" href="/cookies">Cookie Policy</a>
                        </div>
                        <div>
                            <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Contact</h4>
                            <a className="lpl-footer-link" href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
                        </div>
                    </div>
                    <div style={{ borderTop: '1.5px solid rgba(108, 63, 164, 0.10)', paddingTop: 16, marginTop: 32, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.78rem', color: tokens.colors.charcoal, opacity: 0.6 }}>
                            © 2026 Draw in the Air. All rights reserved.
                        </p>
                        <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.78rem', color: tokens.colors.deepPlum, fontWeight: 700 }}>
                            Made with care for young learners.
                        </p>
                    </div>
                </div>
            </footer>

            {/* Scoped styles */}
            <style>{`
                .lpl-desktop { display: none; }
                .lpl-mobile-toggle { display: inline-flex; }
                @media (min-width: 768px) {
                    .lpl-desktop { display: flex; }
                    .lpl-mobile-toggle { display: none; }
                }
                .lpl-brand { display: none; }
                @media (min-width: 640px) { .lpl-brand { display: inline; } }
                .lpl-nav-link {
                    font-size: 0.95rem;
                    transition: opacity 0.2s ease;
                    text-decoration: none;
                    color: inherit;
                    cursor: pointer;
                }
                .lpl-nav-link:hover { opacity: 0.7; }
                .lpl-mobile-link {
                    display: block;
                    padding: 10px 0;
                    font-size: 1rem;
                    font-weight: 600;
                    text-decoration: none;
                    color: ${tokens.colors.charcoal};
                    font-family: ${tokens.fontFamily.body};
                }
                .lpl-footer-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 28px;
                    margin-bottom: 32px;
                }
                @media (min-width: 640px) {
                    .lpl-footer-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (min-width: 1024px) {
                    .lpl-footer-grid { grid-template-columns: repeat(4, 1fr); }
                }
                .lpl-footer-link {
                    display: block;
                    font-family: ${tokens.fontFamily.body};
                    font-size: 0.85rem;
                    color: ${tokens.colors.charcoal};
                    opacity: 0.75;
                    text-decoration: none;
                    margin-bottom: 8px;
                    transition: opacity 0.2s ease;
                }
                .lpl-footer-link:hover { opacity: 1; color: ${tokens.colors.deepPlum}; }

                /* Content typography — Kid-UI bright sky */
                .lpl-content h2 {
                    font-family: ${tokens.fontFamily.display};
                    font-size: clamp(1.4rem, 2.2vw, 1.8rem);
                    font-weight: 700;
                    color: ${tokens.colors.deepPlum};
                    margin-top: 2rem;
                    margin-bottom: 0.8rem;
                    letter-spacing: -0.01em;
                }
                .lpl-content h2:first-of-type { margin-top: 0.5rem; }
                .lpl-content h3 {
                    font-family: ${tokens.fontFamily.display};
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: ${tokens.colors.charcoal};
                    margin-top: 1.5rem;
                    margin-bottom: 0.6rem;
                }
                .lpl-content p {
                    font-family: ${tokens.fontFamily.body};
                    color: ${tokens.colors.charcoal};
                    opacity: 0.85;
                    line-height: 1.7;
                    margin-bottom: 1.1rem;
                    font-size: 1rem;
                }
                .lpl-content strong {
                    color: ${tokens.colors.charcoal};
                    font-weight: 700;
                    opacity: 1;
                }
                .lpl-content a {
                    color: ${tokens.colors.deepPlum};
                    font-weight: 700;
                    text-decoration: underline;
                    text-decoration-color: rgba(108, 63, 164, 0.4);
                    text-underline-offset: 3px;
                    transition: text-decoration-color 0.2s ease;
                }
                .lpl-content a:hover { text-decoration-color: ${tokens.colors.deepPlum}; }
                .lpl-content ul, .lpl-content ol {
                    font-family: ${tokens.fontFamily.body};
                    color: ${tokens.colors.charcoal};
                    opacity: 0.85;
                    padding-left: 1.5rem;
                    margin-bottom: 1.1rem;
                }
                .lpl-content li {
                    margin-bottom: 0.5rem;
                    line-height: 1.65;
                }
                .lpl-content ul li::marker { color: ${tokens.colors.deepPlum}; }
                .lpl-content blockquote {
                    border-left: 4px solid ${tokens.colors.aqua};
                    background: rgba(85, 221, 224, 0.06);
                    padding: 14px 18px;
                    border-radius: 0 14px 14px 0;
                    margin: 1.5rem 0;
                }
                .lpl-content code {
                    background: rgba(108, 63, 164, 0.08);
                    color: ${tokens.colors.deepPlum};
                    padding: 2px 6px;
                    border-radius: 6px;
                    font-size: 0.92em;
                    font-family: 'SF Mono', monospace;
                }

                /* Logo sizing — bulletproof against global img rules */
                .dl-nav-logo {
                    height: 36px !important;
                    width: auto !important;
                    max-height: 36px !important;
                    max-width: 140px !important;
                    object-fit: contain !important;
                    flex-shrink: 0 !important;
                    display: block !important;
                }
                .dl-footer-logo {
                    height: 32px !important;
                    width: auto !important;
                    max-height: 32px !important;
                    max-width: 140px !important;
                    object-fit: contain !important;
                    flex-shrink: 0 !important;
                    display: block !important;
                }
            `}</style>
        </div>
    );
};
