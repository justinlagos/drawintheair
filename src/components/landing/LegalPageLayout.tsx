/**
 * LegalPageLayout, Calm design system shell for legal/static pages
 *
 * Used by FAQ, Privacy, Terms, Cookies, Safeguarding, Accessibility,
 * Schools. Rebuilt June 2026 on the Calm system (landing-calm.css):
 * lp-shell + HeaderNav + cream wash, content in a white card panel,
 * Outfit headings, lavender accents, CalmFooter.
 *
 * The eyebrow/heroTitle/lastUpdated props API is unchanged so all
 * consuming pages keep working without edits.
 */

import React from 'react';
import { HeaderNav } from './HeaderNav';
import { CalmFooter } from '../../pages/Landing';
import './landing-calm.css';

interface LegalPageLayoutProps {
    children: React.ReactNode;
    heroTitle: string;
    /** Optional kicker shown above the title, e.g. "LEGAL · PRIVACY" */
    eyebrow?: string;
    /** Last-updated string. Auto-shown if provided. */
    lastUpdated?: string;
}

const LAVENDER = '#8A66F0';
const INK = '#1F1B2E';

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ children, heroTitle, eyebrow, lastUpdated }) => {
    return (
        <div className="lp-shell">
            <HeaderNav />
            <div className="page">
                {/* HERO */}
                <section className="hero" style={{ paddingBottom: 8 }}>
                    <div className="hero-orb" />
                    <div className="wrap">
                        <div className="sec-head" style={{ marginBottom: 0 }}>
                            {eyebrow && (
                                <div className="eyebrow" style={{ justifyContent: 'center' }}>
                                    <span className="dot" />{eyebrow}
                                </div>
                            )}
                            <h1 className="h1" style={{ marginTop: eyebrow ? 18 : 0, fontSize: 'clamp(34px, 5vw, 56px)' }}>{heroTitle}</h1>
                            {lastUpdated && (
                                <p style={{ marginTop: 14, fontSize: '0.9rem', opacity: 0.65, fontWeight: 600 }}>
                                    Last updated: {lastUpdated}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* CONTENT */}
                <section className="section" style={{ paddingTop: 32 }}>
                    <div className="wrap" style={{ maxWidth: 920 }}>
                        <div className="card lpl-content" style={{ padding: 'clamp(28px, 5vw, 56px)' }}>
                            {children}
                        </div>

                        {/* Bottom CTA */}
                        <div style={{ marginTop: 36, textAlign: 'center' }}>
                            <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: 16 }}>
                                Questions?{' '}
                                <a href="mailto:partnership@drawintheair.com" style={{ color: LAVENDER, fontWeight: 700, textDecoration: 'none' }}>
                                    Get in touch
                                </a>
                            </p>
                            <a href="/" className="btn btn-secondary md">Back to home</a>
                        </div>
                    </div>
                </section>
            </div>
            <CalmFooter />

            {/* Scoped content typography, Calm tokens */}
            <style>{`
                .lp-shell .lpl-content h2 {
                    font-family: 'Outfit', system-ui, sans-serif;
                    font-size: clamp(1.4rem, 2.2vw, 1.8rem);
                    font-weight: 700;
                    color: ${LAVENDER};
                    margin-top: 2rem;
                    margin-bottom: 0.8rem;
                    letter-spacing: -0.01em;
                }
                .lp-shell .lpl-content h2:first-of-type { margin-top: 0.5rem; }
                .lp-shell .lpl-content h3 {
                    font-family: 'Outfit', system-ui, sans-serif;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: ${INK};
                    margin-top: 1.5rem;
                    margin-bottom: 0.6rem;
                }
                .lp-shell .lpl-content p {
                    color: ${INK};
                    opacity: 0.85;
                    line-height: 1.7;
                    margin-bottom: 1.1rem;
                    font-size: 1rem;
                }
                .lp-shell .lpl-content strong {
                    color: ${INK};
                    font-weight: 700;
                    opacity: 1;
                }
                .lp-shell .lpl-content a {
                    color: ${LAVENDER};
                    font-weight: 700;
                    text-decoration: underline;
                    text-decoration-color: rgba(138, 102, 240, 0.4);
                    text-underline-offset: 3px;
                    transition: text-decoration-color 0.2s ease;
                }
                .lp-shell .lpl-content a:hover { text-decoration-color: ${LAVENDER}; }
                .lp-shell .lpl-content ul, .lp-shell .lpl-content ol {
                    color: ${INK};
                    opacity: 0.85;
                    padding-left: 1.5rem;
                    margin-bottom: 1.1rem;
                }
                .lp-shell .lpl-content li {
                    margin-bottom: 0.5rem;
                    line-height: 1.65;
                }
                .lp-shell .lpl-content ul li::marker { color: ${LAVENDER}; }
                .lp-shell .lpl-content blockquote {
                    border-left: 4px solid ${LAVENDER};
                    background: rgba(138, 102, 240, 0.06);
                    padding: 14px 18px;
                    border-radius: 0 14px 14px 0;
                    margin: 1.5rem 0;
                }
                .lp-shell .lpl-content code {
                    background: rgba(138, 102, 240, 0.08);
                    color: ${LAVENDER};
                    padding: 2px 6px;
                    border-radius: 6px;
                    font-size: 0.92em;
                    font-family: 'SF Mono', monospace;
                }
            `}</style>
        </div>
    );
};
