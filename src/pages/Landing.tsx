/**
 * Landing v3 — choreograph confidence.
 *
 * Replaces the v2 generic edtech homepage with a confidence-led
 * page that teaches the interaction model, reduces camera fear,
 * shows proof, and guides users into a successful first movement
 * within 15 seconds.
 *
 * Structure: Nav → Hero → How it works → Camera trust → First
 * success → Activation modes → Progression modes → Parents →
 * Teachers → Live proof → Final CTA → Footer.
 *
 * Animation: Framer Motion. Scroll-reveal on every section, hand-
 * trail accent in the hero, stagger on step cards, hover lift on
 * mode cards, number tickers in the proof section. All animations
 * respect prefers-reduced-motion.
 *
 * Proof numbers: live from `landing_public_proof` RPC (anon-callable,
 * aggregate-only — no PII, no child data, no school data).
 *
 * Activation path: Phase 1 keeps the existing Try Free modal flow
 * so the page can ship today. Phase 2 will rewire the CTAs to a
 * no-modal path that lands the kid in Free Paint within 10s.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    motion,
    useReducedMotion,
    useScroll,
    useTransform,
    type Variants,
} from 'framer-motion';
import { TryFreeModal } from '../components/TryFreeModal';
import { SEOMeta } from '../seo/SEOMeta';
import { logEvent } from '../lib/analytics';
import { tokens } from '../styles/tokens';
import { getSupabaseUrl, getAnonKey } from '../lib/supabase';
import './landing-v3.css';

// ── Mode metadata (behavioural order — activation vs progression) ──
const ACTIVATION_MODES = [
    {
        id: 'free',
        label: 'Free Paint',
        tag: 'Best for first-time movement discovery',
        body: 'No rules. Pinch to draw with your hand. The first 20 seconds always feel like a win.',
        poster: '/landing-images/free-paint-particles.jpg',
        video: '/landing-videos/free-paint.webm',
        accent: '#FF6B6B',
    },
    {
        id: 'calibration',
        label: 'Bubble Pop',
        tag: 'Best for fast engagement',
        body: 'Hover over floating bubbles to pop them. Trains hand stability without feeling like training.',
        poster: '/landing-images/bubble-pop.jpg',
        video: '/landing-videos/bubble-pop.webm',
        accent: '#55DDE0',
    },
    {
        id: 'pre-writing',
        label: 'Tracing',
        tag: 'Best for handwriting readiness',
        body: 'Trace lines and letters in mid-air. Builds the motor memory pencil grip will need later.',
        poster: '/landing-images/tracing-letter.jpg',
        video: '/landing-videos/tracing.webm',
        accent: '#6C3FA4',
    },
    {
        id: 'gesture-spelling',
        label: 'Spelling Stars',
        tag: 'Best for letter recognition',
        body: 'Hover the letters to spell a word. Letters glow when correct. No keyboard, no clicking.',
        poster: '/landing-images/word-search-3d.png',
        video: '/landing-videos/spelling.webm',
        accent: '#FFB14D',
    },
];

const PROGRESSION_MODES = [
    { id: 'rainbow-bridge', label: 'Rainbow Bridge', tag: 'Colour memory + sequencing', poster: '/landing-images/sort-shapes.png' },
    { id: 'sort-and-place', label: 'Sort & Place', tag: 'Categorisation reasoning', poster: '/landing-images/sort-place.jpg' },
    { id: 'word-search', label: 'Word Search', tag: 'Letter order + early reading', poster: '/landing-images/wordsearch.jpg' },
    { id: 'balloon-math', label: 'Balloon Math', tag: 'Numbers + early arithmetic', poster: '/landing-images/bubbles.png' },
];

// ── Public proof data shape ──
interface PublicProof {
    as_of: string;
    distinct_devices_90d: number;
    activities_completed: number;
    mode_plays: number;
    tracker_success_pct: number;
    items_touched: number;
    items_mastered: number;
}

// ── Animation primitives ──
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ── Helpers ──
async function fetchPublicProof(): Promise<PublicProof | null> {
    try {
        const res = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/landing_public_proof`, {
            method: 'POST',
            headers: {
                apikey: getAnonKey(),
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: '{}',
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function useCountUp(target: number | undefined, duration = 1200): number {
    const [val, setVal] = useState(0);
    const prefersReduced = useReducedMotion();
    useEffect(() => {
        if (target == null) return;
        if (prefersReduced) { setVal(target); return; }
        const start = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(Math.round(target * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration, prefersReduced]);
    return val;
}

const fmtNum = (n: number) => n.toLocaleString();

// ═══════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════
export const Landing: React.FC = () => {
    const [tryFreeOpen, setTryFreeOpen] = useState(false);
    const [proof, setProof] = useState<PublicProof | null>(null);
    const hasTrackedView = useRef(false);

    // Top-of-funnel + bouncer-shape instrumentation
    useEffect(() => {
        if (hasTrackedView.current) return;
        hasTrackedView.current = true;
        logEvent('landing_view');
        const startedAt = Date.now();
        let engaged = false;
        let maxScrollPct = 0;
        const markEngaged = (cause: string) => {
            if (engaged) return;
            engaged = true;
            logEvent('landing_engaged', { meta: { cause, ms_to_engage: Date.now() - startedAt } });
        };
        const onScroll = () => {
            const doc = document.documentElement;
            const px = window.scrollY + window.innerHeight;
            const pct = Math.min(100, Math.round((px / Math.max(1, doc.scrollHeight)) * 100));
            if (pct > maxScrollPct) maxScrollPct = pct;
            if (window.scrollY > window.innerHeight * 0.5) markEngaged('scroll_below_hero');
        };
        const onPointer = () => markEngaged('pointer_move');
        const onBeforeUnload = () => {
            logEvent('landing_unload', {
                value_number: Date.now() - startedAt,
                meta: { time_on_page_ms: Date.now() - startedAt, scroll_depth_pct: maxScrollPct, engaged },
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pointermove', onPointer, { once: true });
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('beforeunload', onBeforeUnload);
        };
    }, []);

    // Live proof
    useEffect(() => {
        fetchPublicProof().then(setProof);
    }, []);

    // Phase 1: keep existing modal path. Phase 2 will swap this for the no-modal path.
    const handleTryFree = (source: string) => {
        logEvent('cta_click', { meta: { source, target: 'try_free_modal', variant: 'landing_v3' } });
        logEvent('try_free_clicked', { meta: { source, variant: 'landing_v3' } });
        setTryFreeOpen(true);
    };

    return (
        <div className="lp-shell">
            <SEOMeta
                title="Draw in the Air · Movement-based learning for kids"
                description="Children practise letters, shapes, spelling, and early maths by moving their hands in front of a webcam. No apps. No touchscreen. No special hardware."
                canonical="https://drawintheair.com/"
            />

            <Nav onTryFree={() => handleTryFree('nav')} />
            <Hero onTryFree={() => handleTryFree('hero')} />
            <HowItWorks />
            <CameraTrust onTryFree={() => handleTryFree('camera_trust')} />
            <FirstSuccess />
            <ActivationSection onTryFree={() => handleTryFree('activation_modes')} />
            <ProgressionSection />
            <ParentSection onTryFree={() => handleTryFree('parent_section')} />
            <TeacherSection />
            <LiveProofSection proof={proof} />
            <FinalCTA onTryFree={() => handleTryFree('final_cta')} />
            <Footer />

            <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Nav
// ═══════════════════════════════════════════════════════════════════════
const Nav: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <header className="lp-nav">
        <a href="/" className="lp-nav-brand" aria-label="Draw in the Air home">
            <img src="/logo.png" alt="Draw in the Air" />
        </a>
        <nav className="lp-nav-links" aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#activities">Activities</a>
            <a href="/parents/setup">For parents</a>
            <a href="/teachers/setup">For teachers</a>
        </nav>
        <div className="lp-nav-cta">
            <button className="lp-btn lp-btn-primary" onClick={onTryFree}>
                Start free in 10 seconds
            </button>
        </div>
    </header>
);

// ═══════════════════════════════════════════════════════════════════════
// Hero
// ═══════════════════════════════════════════════════════════════════════
const Hero: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => {
    const heroRef = useRef<HTMLElement | null>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const yKid = useTransform(scrollYProgress, [0, 1], ['0%', '-20%']);
    const yClouds = useTransform(scrollYProgress, [0, 1], ['0%', '-8%']);
    const prefersReduced = useReducedMotion();

    return (
        <section ref={heroRef} className="lp-hero" id="hero">
            <motion.div className="lp-hero-bg-clouds" style={prefersReduced ? undefined : { y: yClouds }}>
                <Cloud top="14%" left="6%" w={180} />
                <Cloud top="22%" right="10%" w={140} />
                <Cloud top="60%" left="12%" w={120} opacity={0.6} />
            </motion.div>

            <div className="lp-hero-inner">
                <motion.div className="lp-hero-copy"
                    variants={stagger} initial="hidden" animate="show"
                >
                    <motion.div className="lp-hero-eyebrow" variants={fadeUp}>
                        <span className="lp-dot" /> Movement-based learning · Ages 3–10
                    </motion.div>
                    <motion.h1 className="lp-hero-headline" variants={fadeUp}>
                        Learning starts when children{' '}
                        <span className="lp-hero-accent">
                            move
                            <svg className="lp-hero-underline" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
                                <motion.path
                                    d="M2 10 Q40 2 100 8 T198 6"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.1, delay: 0.6, ease: 'easeOut' }}
                                />
                            </svg>
                        </span>.
                    </motion.h1>
                    <motion.p className="lp-hero-sub" variants={fadeUp}>
                        Draw in the Air helps children practise letters, shapes, spelling, and
                        early maths by moving their hands in front of a webcam.
                        <strong> No apps. No touchscreen. No special hardware.</strong>
                    </motion.p>
                    <motion.div className="lp-hero-ctas" variants={fadeUp}>
                        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onTryFree}>
                            Start free in 10 seconds
                            <span className="lp-btn-arrow" aria-hidden>→</span>
                        </button>
                        <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how-it-works">
                            See how it works
                        </a>
                    </motion.div>
                    <motion.div className="lp-hero-trust" variants={fadeUp}>
                        <TrustItem icon="🌐" label="Works in Chrome, Safari, Edge" />
                        <TrustItem icon="💻" label="Chromebook-friendly" />
                        <TrustItem icon="🏫" label="Used in classrooms and homes" />
                    </motion.div>
                </motion.div>

                <motion.div className="lp-hero-visual"
                    style={prefersReduced ? undefined : { y: yKid }}
                    initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                >
                    <div className="lp-hero-card">
                        <span className="lp-hero-card-pill"><span className="lp-dot" /> Live preview</span>
                        <img src="/landing-images/hero-kid-star.png" alt="Child reaching for a glowing star" />
                        <HandTrail />
                        <div className="lp-hero-card-foot">
                            <span>No download</span>
                            <span>No login</span>
                            <span>No cost</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            <ScrollHint />
        </section>
    );
};

const TrustItem: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
    <span className="lp-trust-item">
        <span aria-hidden>{icon}</span>
        {label}
    </span>
);

// Animated hand trail — three dots tracing a curve, looping subtly
const HandTrail: React.FC = () => {
    const prefersReduced = useReducedMotion();
    if (prefersReduced) return null;
    return (
        <svg className="lp-hero-trail" viewBox="0 0 320 220" aria-hidden>
            <motion.circle
                cx="60" cy="160" r="6" fill="#FFD84D"
                animate={{ cx: [60, 120, 220, 280, 60], cy: [160, 80, 100, 60, 160], opacity: [0.4, 1, 1, 0.7, 0.4] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.circle
                cx="60" cy="160" r="4" fill="#55DDE0"
                animate={{ cx: [60, 120, 220, 280, 60], cy: [160, 80, 100, 60, 160], opacity: [0.2, 0.8, 0.8, 0.5, 0.2] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
            />
            <motion.circle
                cx="60" cy="160" r="3" fill="#FF6B6B"
                animate={{ cx: [60, 120, 220, 280, 60], cy: [160, 80, 100, 60, 160], opacity: [0.15, 0.5, 0.5, 0.3, 0.15] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
        </svg>
    );
};

const Cloud: React.FC<{ top: string; left?: string; right?: string; w: number; opacity?: number }> = ({ top, left, right, w, opacity = 0.85 }) => (
    <motion.div
        className="lp-cloud"
        style={{ top, left, right, width: w, height: w * 0.36, opacity }}
        animate={{ x: [0, 12, 0] }}
        transition={{ duration: 8 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
    />
);

const ScrollHint: React.FC = () => (
    <motion.div
        className="lp-scroll-hint"
        animate={{ y: [0, 8, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
    >
        <span>Scroll</span>
        <svg viewBox="0 0 12 18" width="12" height="18"><path d="M6 2v12M2 10l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════
// How it works — 4 stepped cards with stagger reveal
// ═══════════════════════════════════════════════════════════════════════
const HowItWorks: React.FC = () => {
    const steps = [
        { n: 1, title: 'Allow camera', body: 'One click. The browser asks once.', icon: '📷' },
        { n: 2, title: 'Raise your hand', body: 'Wave at the screen to start.', icon: '✋' },
        { n: 3, title: 'Follow the movement', body: 'Trace, pop, sort, spell.', icon: '✨' },
        { n: 4, title: 'Watch learning respond', body: 'Real-time feedback. Every motion counts.', icon: '🎯' },
    ];
    return (
        <section id="how-it-works" className="lp-section lp-section-pale">
            <SectionHeader
                eyebrow="How it works"
                title={<>From a wave to a win in four short steps.</>}
                sub="The interaction model is simple on purpose. Kids figure it out before adults can finish reading this sentence."
            />
            <motion.ol
                className="lp-steps"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
            >
                {steps.map(s => (
                    <motion.li key={s.n} className="lp-step" variants={fadeUp}>
                        <div className="lp-step-num">
                            <span>{s.n}</span>
                            <span className="lp-step-icon" aria-hidden>{s.icon}</span>
                        </div>
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                    </motion.li>
                ))}
            </motion.ol>
        </section>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Camera trust — single panel, reassurance copy, CTA
// ═══════════════════════════════════════════════════════════════════════
const CameraTrust: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section className="lp-section lp-section-trust">
        <motion.div
            className="lp-trust-card"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
        >
            <div className="lp-trust-card-icon" aria-hidden>
                <motion.div
                    className="lp-trust-shield"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                    🔒
                </motion.div>
            </div>
            <h2>The camera only detects movement.</h2>
            <p>
                Draw in the Air does <strong>not record lessons, store videos, or take photos</strong>.
                The webcam is used only to recognise hand movement during play, frame by frame,
                inside the browser.
            </p>
            <ul className="lp-trust-list">
                <li><Check />No video or audio is ever sent to a server</li>
                <li><Check />No accounts. No names. No emails.</li>
                <li><Check />Frames are analysed on-device and discarded</li>
            </ul>
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onTryFree}>
                Try with camera
                <span className="lp-btn-arrow" aria-hidden>→</span>
            </button>
            <p className="lp-trust-fine">
                Read the full privacy approach at{' '}
                <a href="/privacy">drawintheair.com/privacy</a>.
            </p>
        </motion.div>
    </section>
);

const Check: React.FC = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden className="lp-check">
        <circle cx="8" cy="8" r="8" fill="#7ED957" />
        <path d="M4.5 8.5l2.2 2.2L11.5 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// First success — emotional hook + 4 outcome cards
// ═══════════════════════════════════════════════════════════════════════
const FirstSuccess: React.FC = () => {
    const cards = [
        { icon: '⚡', title: 'Instant feedback', body: "Every wave, every pinch, every trace gets visible confirmation. The screen always answers." },
        { icon: '🤲', title: 'Gentle guidance', body: 'If a child drifts off-path, a soft nudge points them back. Never a buzzer, never a fail screen.' },
        { icon: '🌱', title: 'No wrong-start pressure', body: "The first activity is built so a 3-year-old wins in 10 seconds. Confidence first, challenge after." },
        { icon: '👧', title: 'Made for ages 3–7', body: 'Activities are designed around what small hands can do. Difficulty scales with the child, not the calendar.' },
    ];
    return (
        <section className="lp-section">
            <SectionHeader
                eyebrow="The first 10 seconds"
                title={<>First win, then challenge.</>}
                sub="The first activity is designed to be easy. Children start with simple movement, build confidence, then progress into letters, shapes, spelling, and maths."
            />
            <motion.div
                className="lp-grid-4"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
            >
                {cards.map((c, i) => (
                    <motion.div key={i} className="lp-feature-card" variants={fadeUp}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                        <div className="lp-feature-icon">{c.icon}</div>
                        <h3>{c.title}</h3>
                        <p>{c.body}</p>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Activation modes — Free Paint / Bubble Pop / Tracing / Spelling Stars
// ═══════════════════════════════════════════════════════════════════════
const ActivationSection: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section id="activities" className="lp-section lp-section-pale">
        <SectionHeader
            eyebrow="Start here"
            title={<>Where confidence begins.</>}
            sub="These are the four activities most kids try first. Pick any one — they're all designed so the first 30 seconds feel like a win."
        />
        <motion.div
            className="lp-mode-grid"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
        >
            {ACTIVATION_MODES.map(m => (
                <ModeCard key={m.id} mode={m} onPick={onTryFree} primary />
            ))}
        </motion.div>
    </section>
);

const ProgressionSection: React.FC = () => (
    <section className="lp-section">
        <SectionHeader
            eyebrow="Then keep going"
            title={<>Next-step activities, once confidence is built.</>}
            sub="These open up after a child has a few comfortable sessions under their belt. They blend in more learning — colour memory, sorting, reading, arithmetic."
        />
        <motion.div
            className="lp-mode-grid lp-mode-grid-small"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
        >
            {PROGRESSION_MODES.map(m => (
                <ModeCard key={m.id} mode={{ ...m, body: '', accent: '#6C3FA4', video: '' }} primary={false} onPick={() => undefined} />
            ))}
        </motion.div>
    </section>
);

interface ModeMeta {
    id: string;
    label: string;
    tag: string;
    body: string;
    poster: string;
    video?: string;
    accent: string;
}

const ModeCard: React.FC<{ mode: ModeMeta; onPick: () => void; primary: boolean }> = ({ mode, onPick, primary }) => {
    const [hovered, setHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (hovered) { v.play().catch(() => undefined); } else { v.pause(); v.currentTime = 0; }
    }, [hovered]);
    return (
        <motion.div
            className={`lp-mode-card ${primary ? 'lp-mode-card-primary' : ''}`}
            variants={fadeUp}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
            <div className="lp-mode-preview" style={{ borderColor: `${mode.accent}33` }}>
                {/* Gameplay preview slot — falls back to poster when video is missing */}
                {mode.video ? (
                    <>
                        <video
                            ref={videoRef}
                            className="lp-mode-video"
                            src={mode.video}
                            poster={mode.poster}
                            muted
                            playsInline
                            loop
                            preload="metadata"
                            aria-hidden
                        />
                    </>
                ) : (
                    <img src={mode.poster} alt={`${mode.label} preview`} loading="lazy" />
                )}
                <span className="lp-mode-pill" style={{ background: mode.accent }}>{mode.tag}</span>
            </div>
            <div className="lp-mode-body">
                <h3>{mode.label}</h3>
                {primary && mode.body && <p>{mode.body}</p>}
                {primary && (
                    <button className="lp-mode-cta" onClick={onPick}>
                        Try {mode.label} →
                    </button>
                )}
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Parent section — emotional hook (NOW BEFORE TEACHER)
// ═══════════════════════════════════════════════════════════════════════
const ParentSection: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section className="lp-section lp-section-parent">
        <motion.div
            className="lp-split"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
        >
            <motion.div className="lp-split-copy" variants={fadeUp}>
                <span className="lp-eyebrow lp-eyebrow-coral">For parents</span>
                <h2>Screen time that gets children moving.</h2>
                <p>
                    Kids still use a screen — but not passively. They move, reach, trace, follow, and
                    respond. It turns screen time into active learning time.
                </p>
                <p className="lp-split-sub">
                    No apps to install. No accounts to manage. No subscription. Open the page and play.
                </p>
                <div className="lp-cta-row">
                    <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onTryFree}>
                        Try at home
                    </button>
                    <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/parents/setup">
                        Parents' setup guide
                    </a>
                </div>
            </motion.div>
            <motion.div className="lp-split-visual lp-split-visual-parent" variants={fadeUp}>
                <img src="/landing-images/parent-child-screen.jpg" alt="Parent and child playing together at a laptop" />
                <div className="lp-floating-stat lp-floating-stat-tl">
                    <strong>5 min</strong>
                    <span>median first session</span>
                </div>
                <div className="lp-floating-stat lp-floating-stat-br">
                    <strong>0 setup</strong>
                    <span>open and play</span>
                </div>
            </motion.div>
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Teacher section
// ═══════════════════════════════════════════════════════════════════════
const TeacherSection: React.FC = () => (
    <section className="lp-section lp-section-teacher">
        <motion.div
            className="lp-split lp-split-reverse"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
        >
            <motion.div className="lp-split-copy" variants={fadeUp}>
                <span className="lp-eyebrow lp-eyebrow-aqua">For classrooms</span>
                <h2>Built for real classrooms.</h2>
                <p>
                    Teachers need tools that work quickly, hold attention, and do not create extra admin.
                    Draw in the Air runs in the browser, works with existing devices, and is being
                    shaped through real classroom use.
                </p>
                <p className="lp-split-sub">
                    One join code per class. No student accounts. Teachers see every child's progress
                    in real time from their console.
                </p>
                <div className="lp-cta-row">
                    <a className="lp-btn lp-btn-primary lp-btn-lg" href="/teachers/setup">
                        Start a school pilot
                    </a>
                    <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/teachers/setup">
                        Teachers' setup guide
                    </a>
                </div>
            </motion.div>
            <motion.div className="lp-split-visual lp-split-visual-teacher" variants={fadeUp}>
                <img src="/landing-images/classroom.jpg" alt="Teacher running a class with multiple children" />
                <div className="lp-floating-stat lp-floating-stat-tr">
                    <strong>30 kids</strong>
                    <span>per join code</span>
                </div>
                <div className="lp-floating-stat lp-floating-stat-bl">
                    <strong>1 console</strong>
                    <span>teacher controls everything</span>
                </div>
            </motion.div>
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Live proof
// ═══════════════════════════════════════════════════════════════════════
const LiveProofSection: React.FC<{ proof: PublicProof | null }> = ({ proof }) => {
    return (
        <section className="lp-section lp-section-proof">
            <SectionHeader
                eyebrow="Live numbers"
                title={<>Early usage is already showing the pattern.</>}
                sub="These figures update from live product usage. We're using them to improve the learning experience."
            />
            <motion.div
                className="lp-proof-grid"
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
            >
                <ProofTile label="Distinct devices" value={proof?.distinct_devices_90d} sub="last 90 days" />
                <ProofTile label="Activities completed" value={proof?.activities_completed} sub="finished and counted" />
                <ProofTile label="Tracker success" value={proof?.tracker_success_pct} suffix="%" sub="hand tracking initialised cleanly" />
                <ProofTile label="Mode plays" value={proof?.mode_plays} sub="activity starts" />
                <ProofTile label="Items kids touched" value={proof?.items_touched} sub="distinct letters / numbers / shapes" />
                <ProofTile label="Items mastered" value={proof?.items_mastered} sub="≥5 attempts at ≥80% accuracy" />
            </motion.div>
            <p className="lp-proof-note">
                Aggregate platform numbers. We don't track individual children — these are anonymous device-level counts.
            </p>
        </section>
    );
};

const ProofTile: React.FC<{ label: string; value: number | undefined; sub: string; suffix?: string }> = ({ label, value, sub, suffix }) => {
    const n = useCountUp(value, 1400);
    return (
        <motion.div className="lp-proof-tile" variants={fadeUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <div className="lp-proof-num">
                {value == null ? <span className="lp-proof-skel" /> : <>{fmtNum(n)}{suffix ?? ''}</>}
            </div>
            <div className="lp-proof-label">{label}</div>
            <div className="lp-proof-sub">{sub}</div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Final CTA
// ═══════════════════════════════════════════════════════════════════════
const FinalCTA: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section className="lp-section lp-section-final">
        <motion.div
            className="lp-final"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
        >
            <h2>
                Let them <span className="lp-final-emph">move</span>.
                Let them <span className="lp-final-emph">learn</span>.
            </h2>
            <p>
                Open it once. Wave. Watch a 4-year-old figure out the rest before you can.
            </p>
            <div className="lp-cta-row">
                <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onTryFree}>
                    Start free now
                    <span className="lp-btn-arrow" aria-hidden>→</span>
                </button>
                <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/teachers/setup">
                    Book a school pilot
                </a>
            </div>
        </motion.div>

        {/* Decorative floating shapes — slow drift */}
        <FloatingShape className="lp-shape-1" />
        <FloatingShape className="lp-shape-2" />
        <FloatingShape className="lp-shape-3" />
    </section>
);

const FloatingShape: React.FC<{ className: string }> = ({ className }) => {
    const prefersReduced = useReducedMotion();
    if (prefersReduced) return <div className={`lp-shape ${className}`} aria-hidden />;
    return (
        <motion.div
            className={`lp-shape ${className}`}
            animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
            transition={{ duration: 7 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
        />
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Footer
// ═══════════════════════════════════════════════════════════════════════
const Footer: React.FC = () => (
    <footer className="lp-footer">
        <div className="lp-footer-inner">
            <div className="lp-footer-brand">
                <img src="/logo.png" alt="Draw in the Air" />
                <p>Movement-based learning for kids. Free for homes and classrooms.</p>
            </div>
            <div className="lp-footer-cols">
                <div>
                    <h4>Product</h4>
                    <a href="#how-it-works">How it works</a>
                    <a href="#activities">Activities</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/safeguarding">Safeguarding</a>
                </div>
                <div>
                    <h4>For families</h4>
                    <a href="/parents/setup">Parents' guide</a>
                    <a href="mailto:help@drawintheair.com">help@drawintheair.com</a>
                </div>
                <div>
                    <h4>For schools</h4>
                    <a href="/teachers/setup">Teachers' guide</a>
                    <a href="mailto:partnership@drawintheair.com">partnership@drawintheair.com</a>
                </div>
            </div>
        </div>
        <div className="lp-footer-fine">
            © {new Date().getFullYear()} Draw in the Air. Made in the UK.
        </div>
    </footer>
);

// ═══════════════════════════════════════════════════════════════════════
// Shared section header
// ═══════════════════════════════════════════════════════════════════════
const SectionHeader: React.FC<{ eyebrow: string; title: React.ReactNode; sub?: string }> = ({ eyebrow, title, sub }) => (
    <motion.div
        className="lp-section-head"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
    >
        <motion.span className="lp-eyebrow" variants={fadeUp}>{eyebrow}</motion.span>
        <motion.h2 variants={fadeUp}>{title}</motion.h2>
        {sub && <motion.p className="lp-section-sub" variants={fadeUp}>{sub}</motion.p>}
    </motion.div>
);

// Silence unused warnings on tokens (we don't currently use the JS tokens here —
// everything's in the CSS file by design — but keep the import so styling is
// auditable from one place if we ever inline values).
void tokens;

export default Landing;
