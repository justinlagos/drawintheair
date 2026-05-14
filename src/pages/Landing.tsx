/**
 * Landing v4 — cinematic redesign.
 *
 * Reference: Justin's design mock + spec ("Apple polish + Nintendo
 * delight + Pixar warmth"). Cream backgrounds, lavender primary,
 * soft 3D icons, gameplay videos in stylised frames, choreographed
 * Framer Motion throughout.
 *
 * Activation path (Phase 1): hero + section CTAs all open the
 * TryFreeModal. The no-modal flow is Phase 2.
 *
 * Assets:
 *   /public/landing-videos/{free-paint,tracing,balloon-math,sort-place,word-search}.{webm,mp4,jpg}
 *   /public/landing-icons/{abc,shapes,math,brain,shield,scan-banner,hand,star-trail,smiley-star,trophy,kids-reading,star-books,globe,crown-star}.png
 *
 * Proof numbers: live from `landing_public_proof` RPC (aggregate
 * platform totals only — no PII, no child data, no school data).
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
import { getSupabaseUrl, getAnonKey } from '../lib/supabase';
import './landing-v3.css';

// ── Main games (videos) ────────────────────────────────────────────────
interface ActivityMeta {
    id: string;
    name: string;
    tagline: string;
    body: string;
    accent: string;
    videoWebm?: string;
    videoMp4?: string;
    poster: string;
}

const MAIN_GAMES: ActivityMeta[] = [
    {
        id: 'free',
        name: 'Free Paint',
        tagline: 'FREE PAINT',
        body: 'Draw in the air with colors and watch your art come alive.',
        accent: '#FF6B6B',
        videoWebm: '/landing-videos/free-paint.webm',
        videoMp4: '/landing-videos/free-paint.mp4',
        poster: '/landing-videos/free-paint.jpg',
    },
    {
        id: 'calibration',
        name: 'Bubble Pop',
        tagline: 'BUBBLE POP',
        body: 'Pop bubbles with your moves and rack up points.',
        accent: '#55DDE0',
        poster: '/landing-images/bubble-pop.jpg',
    },
    {
        id: 'pre-writing',
        name: 'Tracing',
        tagline: 'TRACING',
        body: 'Trace letters and shapes to build recognition.',
        accent: '#6C3FA4',
        videoWebm: '/landing-videos/tracing.webm',
        videoMp4: '/landing-videos/tracing.mp4',
        poster: '/landing-videos/tracing.jpg',
    },
    {
        id: 'gesture-spelling',
        name: 'Spelling Stars',
        tagline: 'SPELLING STARS',
        body: 'Find letters, build words, and earn stars.',
        accent: '#FFB14D',
        poster: '/landing-images/word-search-3d.png',
    },
];

const NEXT_STEP: ActivityMeta[] = [
    {
        id: 'sort-and-place',
        name: 'Match & Sort',
        tagline: 'SORT & PLACE',
        body: 'Pick up objects with a pinch, drop them where they belong.',
        accent: '#7ED957',
        videoWebm: '/landing-videos/sort-place.webm',
        videoMp4: '/landing-videos/sort-place.mp4',
        poster: '/landing-videos/sort-place.jpg',
    },
    {
        id: 'rainbow-bridge',
        name: 'Rainbow Bridge',
        tagline: 'RAINBOW BRIDGE',
        body: 'Match colours in order and watch the rainbow grow.',
        accent: '#FF8E8E',
        poster: '/landing-images/sort-shapes.png',
    },
    {
        id: 'word-search',
        name: 'Word Hunt',
        tagline: 'WORD SEARCH',
        body: 'Find hidden words by sweeping your hand through letters.',
        accent: '#55DDE0',
        videoWebm: '/landing-videos/word-search.webm',
        videoMp4: '/landing-videos/word-search.mp4',
        poster: '/landing-videos/word-search.jpg',
    },
    {
        id: 'balloon-math',
        name: 'Balloon Math',
        tagline: 'BALLOON MATH',
        body: 'Pop the answer balloon to solve early arithmetic.',
        accent: '#FFD84D',
        videoWebm: '/landing-videos/balloon-math.webm',
        videoMp4: '/landing-videos/balloon-math.mp4',
        poster: '/landing-videos/balloon-math.jpg',
    },
];

// ── Skills they build (4 cards with 3D icons) ─────────────────────────
const SKILLS = [
    { id: 'abc',    icon: '/landing-icons/abc.png',    title: 'Letters & Sounds',  body: 'Trace letters in the air and hear them come to life.',    age: 'Ages 3–7' },
    { id: 'shapes', icon: '/landing-icons/shapes.png', title: 'Shapes & Patterns', body: 'Explore shapes, colours, and simple patterns.',           age: 'Ages 3–7' },
    { id: 'math',   icon: '/landing-icons/math.png',   title: 'Early Math',        body: 'Count, compare, and solve with movement.',                age: 'Ages 3–7' },
    { id: 'brain',  icon: '/landing-icons/brain.png',  title: 'Focus & Memory',    body: 'Games that build attention, memory, and listening.',      age: 'Ages 3–7' },
];

// ── Public proof RPC ──────────────────────────────────────────────────
interface PublicProof {
    distinct_devices_90d: number;
    activities_completed: number;
    mode_plays: number;
    tracker_success_pct: number;
    items_touched: number;
    items_mastered: number;
}

async function fetchPublicProof(): Promise<PublicProof | null> {
    try {
        const res = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/landing_public_proof`, {
            method: 'POST',
            headers: { apikey: getAnonKey(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: '{}',
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

// ── Motion primitives ─────────────────────────────────────────────────
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

// ── Count-up animation for proof stats ────────────────────────────────
function useCountUp(target: number | undefined, duration = 1400): number {
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

    useEffect(() => {
        if (hasTrackedView.current) return;
        hasTrackedView.current = true;
        logEvent('landing_view');
        const startedAt = Date.now();
        let engaged = false;
        let maxScroll = 0;
        const mark = (cause: string) => {
            if (engaged) return; engaged = true;
            logEvent('landing_engaged', { meta: { cause, ms_to_engage: Date.now() - startedAt } });
        };
        const onScroll = () => {
            const doc = document.documentElement;
            const px = window.scrollY + window.innerHeight;
            const pct = Math.min(100, Math.round((px / Math.max(1, doc.scrollHeight)) * 100));
            if (pct > maxScroll) maxScroll = pct;
            if (window.scrollY > window.innerHeight * 0.4) mark('scroll_below_hero');
        };
        const onPointer = () => mark('pointer_move');
        const onUnload = () => logEvent('landing_unload', {
            value_number: Date.now() - startedAt,
            meta: { time_on_page_ms: Date.now() - startedAt, scroll_depth_pct: maxScroll, engaged },
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('pointermove', onPointer, { once: true });
        window.addEventListener('beforeunload', onUnload);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('beforeunload', onUnload);
        };
    }, []);

    useEffect(() => { fetchPublicProof().then(setProof); }, []);

    const handleTryFree = (source: string) => {
        logEvent('cta_click', { meta: { source, target: 'try_free_modal', variant: 'landing_v4' } });
        logEvent('try_free_clicked', { meta: { source, variant: 'landing_v4' } });
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
            <Skills />
            <MainGames onTryFree={() => handleTryFree('main_games')} />
            <NextSteps />
            <Parents onTryFree={() => handleTryFree('parents')} />
            <Teachers />
            <LiveProof proof={proof} />
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
            <a href="/pricing">Pricing</a>
        </nav>
        <div className="lp-nav-cta">
            <button className="lp-btn lp-btn-primary lp-btn-magnetic" onClick={onTryFree}>
                Try Draw in the Air
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
    const yKid = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
    const prefersReduced = useReducedMotion();

    return (
        <section ref={heroRef} className="lp-hero" id="hero">
            <FloatingOrb className="lp-orb-1" />
            <FloatingOrb className="lp-orb-2" />
            <FloatingOrb className="lp-orb-3" />

            <div className="lp-hero-inner">
                <motion.div className="lp-hero-copy" variants={stagger} initial="hidden" animate="show">
                    <motion.div className="lp-eyebrow lp-eyebrow-green" variants={fadeUp}>
                        <span className="lp-dot" /> Movement-based learning · Ages 3–7
                    </motion.div>
                    <motion.h1 className="lp-hero-headline" variants={fadeUp}>
                        Learning starts when children{' '}
                        <span className="lp-hero-accent">
                            move
                            <svg className="lp-hero-underline" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden>
                                <motion.path d="M2 10 Q40 2 100 8 T198 6"
                                    fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }} />
                            </svg>
                        </span>.
                    </motion.h1>
                    <motion.p className="lp-hero-sub" variants={fadeUp}>
                        Draw in the Air turns any webcam into a fun, interactive learning space.
                        <strong> No downloads. No controllers. Just your child's hand.</strong>
                    </motion.p>
                    <motion.div className="lp-hero-ctas" variants={fadeUp}>
                        <button className="lp-btn lp-btn-primary lp-btn-lg lp-btn-magnetic" onClick={onTryFree}>
                            Try it free in your browser
                            <span className="lp-btn-arrow" aria-hidden>→</span>
                        </button>
                        <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how-it-works">
                            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden style={{ marginRight: 2 }}>
                                <path d="M3 1.5l7 4.5-7 4.5z" fill="currentColor" />
                            </svg>
                            See how it works
                        </a>
                    </motion.div>
                    <motion.div className="lp-hero-trust" variants={fadeUp}>
                        <TrustChip icon="✓" label="No downloads" />
                        <TrustChip icon="📱" label="Works on any device" />
                        <TrustChip icon="🔒" label="Private & secure" />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="lp-hero-visual"
                    style={prefersReduced ? undefined : { y: yKid }}
                    initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                >
                    <div className="lp-hero-card">
                        <span className="lp-hero-card-brand">
                            <img src="/logo.png" alt="" /> Draw in the Air
                        </span>
                        <img className="lp-hero-card-art" src="/landing-images/hero-kid-star.png" alt="Child reaching for a glowing star" />
                        <HandTrail />
                        <motion.img
                            className="lp-hero-float lp-hero-float-star"
                            src="/landing-icons/smiley-star.png"
                            alt=""
                            animate={prefersReduced ? undefined : { y: [0, -10, 0], rotate: [0, 6, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.img
                            className="lp-hero-float lp-hero-float-trophy"
                            src="/landing-icons/trophy.png"
                            alt=""
                            animate={prefersReduced ? undefined : { y: [0, 8, 0], rotate: [0, -4, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                        />
                        <div className="lp-hero-card-bar">
                            <span className="lp-hero-card-stat"><span className="lp-stat-icon">⭐</span><span><strong>Star Collector</strong></span></span>
                            <span className="lp-hero-card-stat"><span><strong>Level 3</strong></span></span>
                            <span className="lp-hero-card-stat"><span><strong>420 points</strong></span></span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const TrustChip: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
    <span className="lp-chip"><span aria-hidden>{icon}</span>{label}</span>
);

// Animated dotted hand trail across the hero card
const HandTrail: React.FC = () => {
    const prefersReduced = useReducedMotion();
    if (prefersReduced) return null;
    return (
        <svg className="lp-hero-trail" viewBox="0 0 320 220" aria-hidden>
            {[0, 0.15, 0.3].map((delay, i) => (
                <motion.circle
                    key={i}
                    cx="60" cy="160"
                    r={6 - i * 1.2}
                    fill={['#FFD84D', '#55DDE0', '#FF6B6B'][i]}
                    animate={{
                        cx: [60, 120, 220, 280, 60],
                        cy: [160, 80, 100, 60, 160],
                        opacity: [0.3 - i * 0.05, 0.95 - i * 0.15, 0.85 - i * 0.15, 0.6 - i * 0.1, 0.3 - i * 0.05],
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay }}
                />
            ))}
        </svg>
    );
};

const FloatingOrb: React.FC<{ className: string }> = ({ className }) => {
    const prefersReduced = useReducedMotion();
    return (
        <motion.div
            className={`lp-orb ${className}`}
            animate={prefersReduced ? undefined : { y: [0, -14, 0], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 7 + Math.random() * 3, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
        />
    );
};

// ═══════════════════════════════════════════════════════════════════════
// How it works — 4 numbered cards
// ═══════════════════════════════════════════════════════════════════════
const HowItWorks: React.FC = () => {
    const steps = [
        { n: 1, icon: '/landing-icons/hand.png',       title: 'Move your hand',         body: 'Your child waves, points, or draws in the air.' },
        { n: 2, icon: '/landing-icons/star-trail.png', title: 'We track movement',      body: 'Our camera only detects movement — not who they are.' },
        { n: 3, icon: '/landing-icons/smiley-star.png', title: 'Earn points & feedback', body: 'Instant encouragement keeps them engaged and motivated.' },
        { n: 4, icon: '/landing-icons/trophy.png',     title: 'Build skills & confidence', body: 'Small wins add up to big learning breakthroughs.' },
    ];
    return (
        <section id="how-it-works" className="lp-section">
            <SectionHead
                eyebrow="HOW IT WORKS"
                title={<>From a wave to a win in four short steps.</>}
                sub="Our movement tracking makes learning natural, rewarding, and screen time that parents can feel good about."
            />
            <motion.ol
                className="lp-steps"
                variants={stagger} initial="hidden"
                whileInView="show" viewport={{ once: true, amount: 0.2 }}
            >
                {steps.map((s, i) => (
                    <motion.li key={s.n} className="lp-step" variants={fadeUp}>
                        <div className="lp-step-num">{s.n}</div>
                        <img className="lp-step-icon" src={s.icon} alt="" />
                        <h3>{s.title}</h3>
                        <p>{s.body}</p>
                        {i < steps.length - 1 && <span className="lp-step-arrow" aria-hidden>→</span>}
                    </motion.li>
                ))}
            </motion.ol>
        </section>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Camera trust
// ═══════════════════════════════════════════════════════════════════════
const CameraTrust: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => {
    void onTryFree;
    const prefersReduced = useReducedMotion();
    return (
        <section className="lp-section-trust-wrap">
            <motion.div
                className="lp-trust-card"
                variants={fadeUp} initial="hidden"
                whileInView="show" viewport={{ once: true, amount: 0.35 }}
            >
                <div className="lp-trust-visual">
                    <motion.img
                        src="/landing-icons/shield.png" alt=""
                        className="lp-trust-shield"
                        animate={prefersReduced ? undefined : { y: [0, -8, 0], rotate: [0, 2, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <img src="/landing-icons/scan-banner.png" alt="" className="lp-trust-scan" />
                </div>
                <div className="lp-trust-copy">
                    <p className="lp-trust-lead">Your child's privacy comes first. Draw in the Air uses advanced movement detection — we never store video, images, or audio.</p>
                    <h2>The camera only detects movement.</h2>
                    <ul className="lp-trust-list">
                        <li><Check />No video or photos are stored</li>
                        <li><Check />No personal data collected</li>
                        <li><Check />Works offline after it loads</li>
                        <li><Check />COPPA &amp; GDPR friendly</li>
                    </ul>
                    <a className="lp-btn lp-btn-primary lp-btn-magnetic" href="/privacy">
                        See our privacy promise
                    </a>
                </div>
            </motion.div>
        </section>
    );
};

const Check: React.FC = () => (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden className="lp-check">
        <circle cx="8" cy="8" r="8" fill="#7ED957" />
        <path d="M4.5 8.5l2.2 2.2L11.5 6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// Skills they build — 4 cards with 3D icons
// ═══════════════════════════════════════════════════════════════════════
const Skills: React.FC = () => (
    <section className="lp-section">
        <SectionHead
            eyebrow="SKILLS THEY BUILD"
            title={<>First win, then challenge.</>}
            sub="Short, focused activities build the foundations for early learning while keeping children active and engaged."
        />
        <motion.div
            className="lp-skills-grid"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.2 }}
        >
            {SKILLS.map(s => (
                <motion.div key={s.id} className="lp-skill-card" variants={fadeUp}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                >
                    <img src={s.icon} alt="" className="lp-skill-icon" />
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                    <span className="lp-skill-age">{s.age}</span>
                </motion.div>
            ))}
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Main games — gameplay video tiles in stylised frames
// ═══════════════════════════════════════════════════════════════════════
const MainGames: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section id="activities" className="lp-section">
        <SectionHead
            eyebrow="WHERE CONFIDENCE BEGINS"
            title={<>Games that make learning an adventure.</>}
        />
        <motion.div
            className="lp-game-grid"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.1 }}
        >
            {MAIN_GAMES.map(g => <GameCard key={g.id} game={g} primary />)}
        </motion.div>
        <div className="lp-game-foot">
            <button className="lp-btn lp-btn-ghost" onClick={onTryFree}>
                View all games →
            </button>
        </div>
    </section>
);

const NextSteps: React.FC = () => (
    <section className="lp-section">
        <SectionHead
            eyebrow="NEXT-STEP ACTIVITIES"
            title={<>Next-step activities, once confidence is built.</>}
        />
        <motion.div
            className="lp-game-grid lp-game-grid-4"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.1 }}
        >
            {NEXT_STEP.map(g => <GameCard key={g.id} game={g} primary={false} />)}
        </motion.div>
    </section>
);

const GameCard: React.FC<{ game: ActivityMeta; primary: boolean }> = ({ game, primary }) => {
    const [hovered, setHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (hovered) v.play().catch(() => undefined);
        else { v.pause(); v.currentTime = 0; }
    }, [hovered]);

    return (
        <motion.div
            className={`lp-game-card ${primary ? '' : 'lp-game-card-small'}`}
            variants={fadeUp}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
            <div className="lp-game-frame" style={{ '--accent': game.accent } as React.CSSProperties}>
                {game.videoWebm ? (
                    <video
                        ref={videoRef}
                        className="lp-game-media"
                        poster={game.poster}
                        muted
                        playsInline
                        loop
                        preload="metadata"
                        aria-hidden
                    >
                        <source src={game.videoWebm} type="video/webm" />
                        {game.videoMp4 && <source src={game.videoMp4} type="video/mp4" />}
                    </video>
                ) : (
                    <img className="lp-game-media" src={game.poster} alt={`${game.name} preview`} loading="lazy" />
                )}
                <span className="lp-game-tag" style={{ background: game.accent }}>{game.tagline}</span>
            </div>
            <div className="lp-game-meta">
                <h3>{game.name}</h3>
                <p>{game.body}</p>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Parents
// ═══════════════════════════════════════════════════════════════════════
const Parents: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section className="lp-section lp-section-parents">
        <motion.div
            className="lp-split"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.3 }}
        >
            <motion.div className="lp-split-copy" variants={fadeUp}>
                <span className="lp-eyebrow lp-eyebrow-coral">FOR PARENTS</span>
                <h2>Screen time that gets children moving.</h2>
                <p>
                    Research shows that movement boosts focus, mood, and learning. Draw in the Air
                    turns screen time into a healthy, active experience.
                </p>
                <div className="lp-cta-row">
                    <button className="lp-btn lp-btn-primary lp-btn-lg lp-btn-magnetic" onClick={onTryFree}>
                        Try it at home
                    </button>
                    <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/parents/setup">
                        See parent guide
                    </a>
                </div>
            </motion.div>
            <motion.div className="lp-split-visual" variants={fadeUp}>
                <img src="/landing-images/parent-child-screen.jpg" alt="A parent and child playing Draw in the Air together on a TV" />
                <motion.img
                    src="/landing-icons/kids-reading.png"
                    alt=""
                    className="lp-split-icon-corner"
                    whileHover={{ rotate: 4 }}
                />
                <div className="lp-floating-stat lp-floating-stat-br">
                    <strong>5 min a day</strong>
                    <span>can make a difference</span>
                </div>
            </motion.div>
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Teachers
// ═══════════════════════════════════════════════════════════════════════
const Teachers: React.FC = () => (
    <section className="lp-section lp-section-teachers">
        <motion.div
            className="lp-split lp-split-reverse"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.3 }}
        >
            <motion.div className="lp-split-copy" variants={fadeUp}>
                <span className="lp-eyebrow lp-eyebrow-aqua">FOR TEACHERS</span>
                <h2>Built for real classrooms.</h2>
                <p>
                    Use Draw in the Air on any device in your classroom. No accounts needed for
                    students, and easy to manage for teachers.
                </p>
                <div className="lp-cta-row">
                    <a className="lp-btn lp-btn-primary lp-btn-lg lp-btn-magnetic" href="/teachers/setup">
                        See teacher tools
                    </a>
                    <a className="lp-btn lp-btn-ghost lp-btn-lg" href="/teachers/setup">
                        Teacher resources
                    </a>
                </div>
            </motion.div>
            <motion.div className="lp-split-visual" variants={fadeUp}>
                <img src="/landing-images/classroom.jpg" alt="A teacher leading a class with multiple children moving" />
                <motion.img
                    src="/landing-icons/globe.png"
                    alt=""
                    className="lp-split-icon-corner"
                    whileHover={{ rotate: -4 }}
                />
                <div className="lp-floating-stat lp-floating-stat-bl">
                    <strong>Loved by teachers</strong>
                    <span>and early learners</span>
                </div>
            </motion.div>
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Live proof — real numbers from RPC
// ═══════════════════════════════════════════════════════════════════════
const LiveProof: React.FC<{ proof: PublicProof | null }> = ({ proof }) => (
    <section className="lp-section lp-section-proof">
        <SectionHead
            eyebrow="EARLY USAGE"
            title={<>Trusted by families and educators.</>}
            sub="Aggregate platform numbers, updated live. We don't track individual children — these are anonymous device-level counts."
        />
        <motion.div
            className="lp-proof-grid"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.2 }}
        >
            <ProofTile icon="/landing-icons/star-books.png" value={proof?.distinct_devices_90d} label="Children learning" sub="last 90 days" />
            <ProofTile icon="/landing-icons/smiley-star.png" value={proof?.activities_completed} label="Activities completed" sub="finished and counted" />
            <ProofTile icon="/landing-icons/crown-star.png" value={proof?.items_mastered} label="Items mastered" sub="≥5 attempts, ≥80% acc." />
            <ProofTile icon="/landing-icons/globe.png" value={proof?.tracker_success_pct} suffix="%" label="Tracker success" sub="clean hand-tracking starts" />
        </motion.div>
    </section>
);

const ProofTile: React.FC<{
    icon: string; value: number | undefined; label: string; sub: string; suffix?: string;
}> = ({ icon, value, label, sub, suffix }) => {
    const n = useCountUp(value, 1400);
    return (
        <motion.div className="lp-proof-tile" variants={fadeUp}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
            <img src={icon} alt="" className="lp-proof-icon" />
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
            variants={fadeUp} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.35 }}
        >
            <motion.img src="/landing-icons/star-books.png" alt=""
                className="lp-final-deco lp-final-deco-1"
                animate={{ y: [0, -12, 0], rotate: [0, 6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img src="/landing-icons/smiley-star.png" alt=""
                className="lp-final-deco lp-final-deco-2"
                animate={{ y: [0, 10, 0], rotate: [0, -4, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
            <motion.img src="/landing-icons/trophy.png" alt=""
                className="lp-final-deco lp-final-deco-3"
                animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />
            <h2>
                Let them <span className="lp-final-emph">move</span>.
                Let them <span className="lp-final-emph">learn</span>.
            </h2>
            <p>Open Draw in the Air in your browser and turn any space into a learning space.</p>
            <div className="lp-cta-row">
                <button className="lp-btn lp-btn-primary lp-btn-lg lp-btn-magnetic" onClick={onTryFree}>
                    Try Draw in the Air free
                    <span className="lp-btn-arrow" aria-hidden>→</span>
                </button>
                <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how-it-works">
                    See how it works
                </a>
            </div>
            <div className="lp-hero-trust" style={{ marginTop: 24, justifyContent: 'center' }}>
                <TrustChip icon="✓" label="No downloads" />
                <TrustChip icon="📱" label="Works on any device" />
                <TrustChip icon="🔒" label="Private & secure" />
            </div>
        </motion.div>
    </section>
);

// ═══════════════════════════════════════════════════════════════════════
// Footer
// ═══════════════════════════════════════════════════════════════════════
const Footer: React.FC = () => (
    <footer className="lp-footer">
        <div className="lp-footer-inner">
            <div className="lp-footer-brand">
                <img src="/logo.png" alt="Draw in the Air" />
                <p>Movement-based learning for curious kids.</p>
            </div>
            <div className="lp-footer-cols">
                <div>
                    <h4>Product</h4>
                    <a href="#how-it-works">How it works</a>
                    <a href="#activities">Activities</a>
                    <a href="/pricing">Pricing</a>
                </div>
                <div>
                    <h4>For parents</h4>
                    <a href="/parents/setup">Parent guide</a>
                    <a href="/parents/setup">Screen time &amp; kids</a>
                    <a href="/parents/setup">FAQ</a>
                </div>
                <div>
                    <h4>For teachers</h4>
                    <a href="/teachers/setup">Teacher tools</a>
                    <a href="/teachers/setup">Classroom ideas</a>
                    <a href="/teachers/setup">Resources</a>
                </div>
                <div>
                    <h4>Company</h4>
                    <a href="/about">About us</a>
                    <a href="/privacy">Privacy</a>
                    <a href="/safeguarding">Terms</a>
                </div>
            </div>
        </div>
        <div className="lp-footer-fine">
            © {new Date().getFullYear()} Draw in the Air. All rights reserved.
        </div>
    </footer>
);

// ═══════════════════════════════════════════════════════════════════════
// Shared section head
// ═══════════════════════════════════════════════════════════════════════
const SectionHead: React.FC<{ eyebrow: string; title: React.ReactNode; sub?: string }> = ({ eyebrow, title, sub }) => (
    <motion.div className="lp-section-head" variants={stagger} initial="hidden"
        whileInView="show" viewport={{ once: true, amount: 0.5 }}
    >
        <motion.span className="lp-eyebrow lp-eyebrow-plum" variants={fadeUp}>{eyebrow}</motion.span>
        <motion.h2 variants={fadeUp}>{title}</motion.h2>
        {sub && <motion.p className="lp-section-sub" variants={fadeUp}>{sub}</motion.p>}
    </motion.div>
);

export default Landing;
