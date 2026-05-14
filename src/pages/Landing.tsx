/**
 * Landing v5. cinematic, conversion-first.
 *
 * Changes vs v4:
 *  - All icons swapped for transparent (no white bg) ChatGPT 3D renders.
 *  - Em dashes removed from all copy. Sentences read clean.
 *  - Camera trust redesigned to match the green-shield-on-scan-frame mock.
 *  - Hero re-composed: floating 3D icons over a tilted device frame that
 *    plays the Free Paint clip on load. No more single-photo card.
 *  - Floating orbs constrained inside the hero section (no edge cuts).
 *  - Game cards tightened: 4 by 3 aspect, smaller frames, padding bumps,
 *    inner device-style border. Reads "cute", not "fullscreen video".
 *  - Real-kid proof section added: two portrait clips from in-store
 *    sessions, framed as device mock-ups.
 *  - Rainbow Bridge + Bubble Pop now have real gameplay video.
 *  - Heavier Framer Motion choreography: parallax tilt on the hero
 *    device, magnetic CTA shimmer, scroll-driven section reveals,
 *    spring lift on every card, ticker count-ups, looping float
 *    decorations on every section header.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    animate,
    motion,
    useInView,
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
import { NavMetricsTicker, type PublicProof as TickerProof } from '../components/landing/NavMetricsTicker';

// ── Activity meta ─────────────────────────────────────────────────────
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
        body: 'Draw in the air with colours and watch your art come alive.',
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
        videoWebm: '/landing-videos/bubble-pop.webm',
        videoMp4: '/landing-videos/bubble-pop.mp4',
        poster: '/landing-videos/bubble-pop.jpg',
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
        videoWebm: '/landing-videos/spelling-stars.webm',
        videoMp4: '/landing-videos/spelling-stars.mp4',
        poster: '/landing-videos/spelling-stars.jpg',
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
        videoWebm: '/landing-videos/rainbow-bridge.webm',
        videoMp4: '/landing-videos/rainbow-bridge.mp4',
        poster: '/landing-videos/rainbow-bridge.jpg',
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

const SKILLS = [
    { id: 'abc',    icon: '/landing-icons/abc.png',    title: 'Letters & Sounds',  body: 'Trace letters in the air and hear them come to life.',    age: 'Ages 3 to 7' },
    { id: 'shapes', icon: '/landing-icons/shapes.png', title: 'Shapes & Patterns', body: 'Explore shapes, colours, and simple patterns.',           age: 'Ages 3 to 7' },
    { id: 'math',   icon: '/landing-icons/math.png',   title: 'Early Math',        body: 'Count, compare, and solve with movement.',                age: 'Ages 3 to 7' },
    { id: 'brain',  icon: '/landing-icons/brain.png',  title: 'Focus & Memory',    body: 'Games that build attention, memory, and listening.',      age: 'Ages 3 to 7' },
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
    // Phase 3: prefers the new dashboard_public_proof name. Falls back
    // to landing_public_proof if dashboard_* is not yet deployed so
    // the page never goes dark while the migration is rolling out.
    const tryRpc = async (fn: string): Promise<PublicProof | null> => {
        try {
            const res = await fetch(`${getSupabaseUrl()}/rest/v1/rpc/${fn}`, {
                method: 'POST',
                headers: { apikey: getAnonKey(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
                body: '{}',
            });
            if (!res.ok) return null;
            return await res.json();
        } catch { return null; }
    };
    const fresh = await tryRpc('dashboard_public_proof');
    if (fresh) return fresh;
    return tryRpc('landing_public_proof');
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
const popIn: Variants = {
    hidden: { opacity: 0, scale: 0.85, y: 14 },
    show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

// ── Count-up animation ────────────────────────────────────────────────
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

// ── Bounce-scroll to a section by id ──────────────────────────────────
// Framer-driven spring scroll with a subtle overshoot so the destination
// lands with character.
function bounceScrollTo(id: string, prefersReduced: boolean) {
    const el = document.getElementById(id);
    if (!el) return;
    const navOffset = 80;
    const target = el.getBoundingClientRect().top + window.scrollY - navOffset;
    if (prefersReduced) {
        window.scrollTo({ top: target, behavior: 'auto' });
        return;
    }
    const start = window.scrollY;
    const controls = animate(start, target, {
        type: 'spring',
        stiffness: 90,
        damping: 18,
        mass: 1.1,
        onUpdate: v => window.scrollTo(0, v),
    });
    return () => controls.stop();
}

// Use within a component so it picks up the user's reduced-motion preference.
function useBounceScroll() {
    const prefersReduced = useReducedMotion() ?? false;
    return (id: string) => bounceScrollTo(id, prefersReduced);
}

// ═══════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════
export const Landing: React.FC = () => {
    const [tryFreeOpen, setTryFreeOpen] = useState(false);
    const [proof, setProof] = useState<PublicProof | null>(null);
    const hasTrackedView = useRef(false);

    // Mark <html> so landing-v3.css can override the global :root
    // night-theme background. Without this, macOS rubber-band
    // overscroll and Chrome's paint-fallback expose the dark
    // --world-bg-0 canvas behind the light landing — the "black
    // space on scroll" issue. Cleaned up on unmount so the app
    // shell goes back to its night-theme canvas.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('lp-route');
        return () => { root.classList.remove('lp-route'); };
    }, []);

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

    // Phase 3: live proof. Fetch on mount, then refresh every 60s
    // while the tab is visible. Investors who keep the tab open
    // (or leave it backgrounded and come back) see live growth, not
    // a frozen snapshot. Visibility check avoids hammering the RPC
    // for backgrounded tabs.
    useEffect(() => {
        let mounted = true;
        const load = () => {
            if (document.visibilityState !== 'visible') return;
            fetchPublicProof().then(p => { if (mounted && p) setProof(p); });
        };
        load();
        const id = window.setInterval(load, 60_000);
        const onVisibility = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            mounted = false;
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    const handleTryFree = (source: string) => {
        logEvent('cta_click', { meta: { source, target: 'try_free_modal', variant: 'landing_v5' } });
        logEvent('try_free_clicked', { meta: { source, variant: 'landing_v5' } });
        setTryFreeOpen(true);
    };

    return (
        <div className="lp-shell">
            <SEOMeta
                title="Draw in the Air. Movement-based learning for kids"
                description="Children practise letters, shapes, spelling, and early maths by moving their hands in front of a webcam. No apps. No touchscreen. No special hardware."
                canonical="https://drawintheair.com/"
            />

            <Nav onTryFree={() => handleTryFree('nav')} proof={proof as TickerProof | null} />
            <Hero onTryFree={() => handleTryFree('hero')} />
            <HowItWorks />
            <CameraTrust />
            <Skills />
            <MainGames onTryFree={() => handleTryFree('main_games')} />
            <NextSteps />
            <RealKidProof />
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
const Nav: React.FC<{ onTryFree: () => void; proof: TickerProof | null }> = ({ onTryFree, proof }) => {
    const bounceTo = useBounceScroll();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const go = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        logEvent('nav_click', { meta: { target: id } });
        setMenuOpen(false);
        bounceTo(id);
    };

    return (
        <motion.header
            className={`lp-nav ${scrolled ? 'lp-nav-scrolled' : ''} ${menuOpen ? 'lp-nav-open' : ''}`}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
            <a href="#hero" className="lp-nav-brand" aria-label="Draw in the Air home" onClick={go('hero')}>
                <img src="/logo.png" alt="Draw in the Air" />
            </a>
            <nav className="lp-nav-links" aria-label="Primary">
                <a href="#how-it-works" onClick={go('how-it-works')}>How it works</a>
                <a href="#activities" onClick={go('activities')}>Activities</a>
                <a href="#real-proof" onClick={go('real-proof')}>Proof</a>
                <a href="#parents" onClick={go('parents')}>For parents</a>
                <a href="#teachers" onClick={go('teachers')}>For teachers</a>
                <a href="/pricing">Pricing</a>
            </nav>
            <div className="lp-nav-cta">
                <NavMetricsTicker isScrolled={scrolled} proof={proof} />
                <motion.button
                    className="lp-btn lp-btn-primary lp-btn-magnetic lp-nav-cta-btn"
                    onClick={onTryFree}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                >
                    Try free
                </motion.button>
                <button
                    className="lp-nav-burger"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(o => !o)}
                >
                    <span className={`lp-burger-line ${menuOpen ? 'a' : ''}`} />
                    <span className={`lp-burger-line ${menuOpen ? 'b' : ''}`} />
                    <span className={`lp-burger-line ${menuOpen ? 'c' : ''}`} />
                </button>
            </div>

            <motion.div
                className="lp-nav-drawer"
                initial={false}
                animate={menuOpen ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: -12, pointerEvents: 'none' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden={!menuOpen}
            >
                <a href="#how-it-works" onClick={go('how-it-works')}>How it works</a>
                <a href="#activities" onClick={go('activities')}>Activities</a>
                <a href="#real-proof" onClick={go('real-proof')}>Proof</a>
                <a href="#parents" onClick={go('parents')}>For parents</a>
                <a href="#teachers" onClick={go('teachers')}>For teachers</a>
                <a href="/pricing">Pricing</a>
                <button
                    className="lp-btn lp-btn-primary lp-btn-lg lp-nav-drawer-cta"
                    onClick={() => { setMenuOpen(false); onTryFree(); }}
                >
                    Try Draw in the Air
                </button>
            </motion.div>
        </motion.header>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Hero. floating 3D icons over an animated device frame
// ═══════════════════════════════════════════════════════════════════════
const Hero: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => {
    const heroRef = useRef<HTMLElement | null>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
    const visualScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
    const prefersReduced = useReducedMotion();

    // Scroll-linked parallax was the biggest single source of
    // scroll-time jank: useTransform writes inline transforms on
    // every scroll frame to a large rotated layer that already
    // costs a lot to repaint. Gate it behind real desktop hardware
    // (mouse, hover-capable, wide viewport) so touch devices,
    // tablets and small laptops scroll smoothly. Hooks themselves
    // must still run unconditionally — we just skip applying the
    // motion values to the `style` prop.
    const [enableParallax, setEnableParallax] = useState(false);
    useEffect(() => {
        if (prefersReduced) return;
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
        const apply = () => setEnableParallax(mq.matches);
        apply();
        mq.addEventListener?.('change', apply);
        return () => mq.removeEventListener?.('change', apply);
    }, [prefersReduced]);

    // Defer the hero loop video until after first paint. Poster shows
    // instantly; the <video> mounts ~250ms later so the browser is not
    // racing to decode 280 KB of webm at the same moment React is
    // hydrating the rest of the landing.
    const [videoReady, setVideoReady] = useState(false);
    useEffect(() => {
        if (prefersReduced) return;
        type IdleWindow = Window & {
            requestIdleCallback?: (cb: () => void) => number;
            cancelIdleCallback?: (h: number) => void;
        };
        const w = window as IdleWindow;
        const hasIdle = typeof w.requestIdleCallback === 'function';
        const t = hasIdle && w.requestIdleCallback
            ? w.requestIdleCallback(() => setVideoReady(true))
            : window.setTimeout(() => setVideoReady(true), 250);
        return () => {
            if (hasIdle && w.cancelIdleCallback) w.cancelIdleCallback(t);
            else window.clearTimeout(t as number);
        };
    }, [prefersReduced]);

    return (
        <section ref={heroRef} className="lp-hero" id="hero">
            <FloatingOrb className="lp-orb-1" />
            <FloatingOrb className="lp-orb-2" />
            <FloatingOrb className="lp-orb-3" />

            <div className="lp-hero-inner">
                <motion.div className="lp-hero-copy" variants={stagger} initial="hidden" animate="show">
                    <motion.div className="lp-eyebrow lp-eyebrow-green" variants={fadeUp}>
                        <span className="lp-dot" /> Movement-based learning . Ages 3 to 7
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
                        <TrustChip icon="🔒" label="Private &amp; secure" />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="lp-hero-visual"
                    style={enableParallax ? { y: visualY, scale: visualScale } : undefined}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                >
                    <div className="lp-hero-stage">
                        <motion.div
                            className="lp-hero-device"
                            initial={{ rotate: -2 }}
                            animate={prefersReduced ? undefined : { rotate: [-2, 0.6, -2] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <span className="lp-hero-device-brand">
                                <img src="/logo.png" alt="" /> Draw in the Air
                            </span>
                            {videoReady ? (
                                <video
                                    className="lp-hero-device-screen"
                                    poster="/landing-videos/hero-loop.jpg"
                                    autoPlay muted loop playsInline preload="metadata"
                                    aria-hidden
                                >
                                    <source src="/landing-videos/hero-loop.webm" type="video/webm" />
                                    <source src="/landing-videos/hero-loop.mp4" type="video/mp4" />
                                </video>
                            ) : (
                                <img
                                    className="lp-hero-device-screen"
                                    src="/landing-videos/hero-loop.jpg"
                                    alt=""
                                    aria-hidden
                                    decoding="async"
                                    fetchPriority="high"
                                />
                            )}
                            <div className="lp-hero-device-bar">
                                <span className="lp-hero-device-stat"><span aria-hidden>⭐</span><strong>Star Collector</strong></span>
                                <span className="lp-hero-device-stat"><strong>Level 3</strong></span>
                                <span className="lp-hero-device-stat"><strong>420 points</strong></span>
                            </div>
                        </motion.div>

                        {/* Motion budget: keep two of the four hero icons
                            looping (star + hand) so the hero still reads
                            as alive, and render trophy + crown as static
                            decoration. Net saving: 2 of the 4 continuous
                            Framer rAF drivers in the hero. */}
                        <motion.img
                            src="/landing-icons/smiley-star.png" alt="" className="lp-hero-float lp-hero-float-star"
                            animate={prefersReduced ? undefined : { y: [0, -14, 0], rotate: [0, 8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <img
                            src="/landing-icons/trophy.png" alt=""
                            className="lp-hero-float lp-hero-float-trophy"
                            loading="lazy" decoding="async"
                        />
                        <img
                            src="/landing-icons/crown-star.png" alt=""
                            className="lp-hero-float lp-hero-float-crown"
                            loading="lazy" decoding="async"
                        />
                        <motion.img
                            src="/landing-icons/hand.png" alt="" className="lp-hero-float lp-hero-float-hand"
                            animate={prefersReduced ? undefined : { y: [0, 10, 0], rotate: [-4, 4, -4] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                        />

                        <HandTrail />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const TrustChip: React.FC<{ icon: string; label: React.ReactNode }> = ({ icon, label }) => (
    <span className="lp-chip"><span aria-hidden>{icon}</span>{label}</span>
);

const HandTrail: React.FC = () => {
    const prefersReduced = useReducedMotion();
    if (prefersReduced) return null;
    // Motion budget: was 3 SVG circles each animating cx/cy/opacity
    // through 5 keyframes infinitely — 3 simultaneous rAF drivers on
    // top of the already-heavy hero. Reduced to a single circle.
    // Visually you still get the "trail" suggestion; the eye fills
    // the rest from the floating icons around the device.
    return (
        <svg className="lp-hero-trail" viewBox="0 0 400 280" aria-hidden>
            <motion.circle
                cx="60" cy="220" r="6"
                fill="#FFD84D"
                animate={{
                    cx: [60, 140, 240, 320, 60],
                    cy: [220, 100, 150, 70, 220],
                    opacity: [0.3, 0.95, 0.85, 0.6, 0.3],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
        </svg>
    );
};

const FloatingOrb: React.FC<{ className: string }> = ({ className }) => {
    // Motion budget: the orbs used to bob 14 px and pulse opacity
    // 0.45→0.65→0.45 forever. The bob is imperceptible at this scale
    // and the opacity pulse is invisible against the page gradient.
    // Three orbs × infinite rAF = three composite layers redrawn on
    // every frame for no visible payoff. Now static.
    return <div className={`lp-orb ${className}`} aria-hidden />;
};

// ═══════════════════════════════════════════════════════════════════════
// How it works
// ═══════════════════════════════════════════════════════════════════════
const HowItWorks: React.FC = () => {
    const steps = [
        { n: 1, icon: '/landing-icons/hand.png',        title: 'Move your hand',           body: 'Your child waves, points, or draws in the air.' },
        { n: 2, icon: '/landing-icons/star-trail.png',  title: 'We track movement',        body: 'Our camera only detects movement, not who they are.' },
        { n: 3, icon: '/landing-icons/smiley-star.png', title: 'Earn points & feedback',    body: 'Instant encouragement keeps them engaged and motivated.' },
        { n: 4, icon: '/landing-icons/trophy.png',      title: 'Build skills & confidence', body: 'Small wins add up to big learning breakthroughs.' },
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
                    <motion.li key={s.n} className="lp-step" variants={popIn}>
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
// Camera trust . Redesigned: shield sits ON the scan-frame backdrop
// ═══════════════════════════════════════════════════════════════════════
const CameraTrust: React.FC = () => {
    const prefersReduced = useReducedMotion();
    // Motion budget: shield bobbed forever, even while the user was
    // miles away in another section. Pause it off-view so we only
    // pay rAF cost when someone is actually looking.
    const sectionRef = useRef<HTMLElement | null>(null);
    const inView = useInView(sectionRef, { amount: 0.2 });
    const shieldAnimate = !prefersReduced && inView
        ? { y: [0, -10, 0], rotate: [-2, 2, -2] }
        : undefined;
    return (
        <section ref={sectionRef} className="lp-section-trust-wrap">
            <motion.div
                className="lp-trust-card"
                variants={fadeUp} initial="hidden"
                whileInView="show" viewport={{ once: true, amount: 0.35 }}
            >
                <div className="lp-trust-stage">
                    <img src="/landing-icons/scan-banner.png" alt="" className="lp-trust-frame" loading="lazy" decoding="async" />
                    <motion.img
                        src="/landing-icons/shield.png" alt=""
                        className="lp-trust-shield"
                        animate={shieldAnimate}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
                <div className="lp-trust-copy">
                    <p className="lp-trust-lead">
                        Your child's privacy comes first. Draw in the Air uses advanced movement
                        detection. We never store video, images, or audio.
                    </p>
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
    <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden className="lp-check">
        <circle cx="8" cy="8" r="8" fill="#7ED957" />
        <path d="M4.5 8.5l2.2 2.2L11.5 6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// ═══════════════════════════════════════════════════════════════════════
// Skills they build
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
                <motion.div key={s.id} className="lp-skill-card" variants={popIn}
                    whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
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
// Main games . Tighter, cuter framing
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
            title={<>Once confidence is built.</>}
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
    // Activity previews: only mount the <video> element AFTER the
    // card scrolls into view. Posters show until then. This avoids
    // browsers downloading + decoding 6+ webm streams on first load,
    // which is what was making the landing sluggish on mid-tier
    // phones. IntersectionObserver flips visible once, never goes
    // back . once mounted the video keeps playing in the background
    // and the browser handles tab/visibility itself.
    const [visible, setVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const prefersReduced = useReducedMotion();

    useEffect(() => {
        const card = cardRef.current;
        if (!card || prefersReduced) return;

        let observer: IntersectionObserver | null = null;
        try {
            observer = new IntersectionObserver(
                entries => {
                    if (entries.some(e => e.isIntersecting)) {
                        setVisible(true);
                        observer?.disconnect();
                    }
                },
                // Pre-load 10% of a viewport before the card enters.
                // Was 25%, which mounted 3–5 videos in quick succession
                // during a fast downward scroll and caused decode
                // contention. 10% gives enough lead time for the
                // poster to show without thrashing.
                { threshold: 0.1, rootMargin: '0px 0px 10% 0px' }
            );
            observer.observe(card);
        } catch {
            // Old browsers: just show the video.
            setVisible(true);
        }

        return () => { observer?.disconnect(); };
    }, [prefersReduced]);

    const showVideo = visible && !prefersReduced && Boolean(game.videoWebm);

    return (
        <motion.div
            ref={cardRef}
            className={`lp-game-card ${primary ? '' : 'lp-game-card-small'}`}
            variants={popIn}
            whileHover={{ y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            style={{ '--accent': game.accent } as React.CSSProperties}
        >
            <div className="lp-game-frame">
                <div className="lp-game-screen">
                    {/* Keep the poster <img> mounted at all times. The
                        <video> overlays on top once IntersectionObserver
                        flips visible=true. This means there is never a
                        moment where the screen wrapper's background
                        shows through — eliminating the "grey/black box
                        flashing into view" artefact from the scroll
                        recording. The poster is decoded async so it
                        doesn't compete with the hero on first paint. */}
                    <img
                        className="lp-game-media"
                        src={game.poster}
                        alt={`${game.name} preview`}
                        loading="lazy"
                        decoding="async"
                    />
                    {showVideo && (
                        <video
                            className="lp-game-media"
                            poster={game.poster}
                            muted playsInline loop autoPlay preload="metadata"
                            aria-hidden
                        >
                            <source src={game.videoWebm} type="video/webm" />
                            {game.videoMp4 && <source src={game.videoMp4} type="video/mp4" />}
                        </video>
                    )}
                </div>
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
// Real-kid proof . Two clips of children playing in-store
// ═══════════════════════════════════════════════════════════════════════
const RealKidProof: React.FC = () => {
    const prefersReduced = useReducedMotion();
    // Motion budget: deco star bobs only while this section is in view.
    const sectionRef = useRef<HTMLElement | null>(null);
    const inView = useInView(sectionRef, { amount: 0.2 });
    const decoAnimate = !prefersReduced && inView
        ? { y: [0, -10, 0], rotate: [0, 6, 0] }
        : undefined;
    return (
        <section ref={sectionRef} id="real-proof" className="lp-section lp-section-realproof">
            <SectionHead
                eyebrow="REAL CHILDREN. REAL MOMENTS."
                title={<>The first hand they raise is the moment learning begins.</>}
                sub="Caught on camera at our in-store demo days. No script, no setup. Just curious kids who walked up and started moving."
            />
            <motion.div
                className="lp-realproof-grid"
                variants={stagger} initial="hidden"
                whileInView="show" viewport={{ once: true, amount: 0.15 }}
            >
                <RealKidCard
                    webm="/landing-videos/real-kid-1.webm"
                    mp4="/landing-videos/real-kid-1.mp4"
                    poster="/landing-videos/real-kid-1.jpg"
                    caption="Popping bubbles with a wave"
                    sub="First-time player"
                />
                <RealKidCard
                    webm="/landing-videos/real-kid-2.webm"
                    mp4="/landing-videos/real-kid-2.mp4"
                    poster="/landing-videos/real-kid-2.jpg"
                    caption="First time, hand already up"
                    sub="Walked up, started playing"
                />
            </motion.div>
            {!prefersReduced && (
                <motion.img
                    src="/landing-icons/smiley-star.png" alt="" className="lp-realproof-deco"
                    animate={decoAnimate}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}
        </section>
    );
};

const RealKidCard: React.FC<{
    webm: string; mp4: string; poster: string; caption: string; sub: string;
}> = ({ webm, mp4, poster, caption, sub }) => {
    // Lazy-mount the <video> for the same reason as game cards .
    // browsers don't even fetch the webm/mp4 until the card is in
    // view. Two real-kid videos at 700 KB each used to start
    // downloading on first paint even though they're well below
    // the fold.
    const [visible, setVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const prefersReduced = useReducedMotion();

    useEffect(() => {
        const card = cardRef.current;
        if (!card || prefersReduced) return;
        let observer: IntersectionObserver | null = null;
        try {
            observer = new IntersectionObserver(
                entries => {
                    if (entries.some(e => e.isIntersecting)) {
                        setVisible(true);
                        observer?.disconnect();
                    }
                },
                // Tightened from 25% to 10% to avoid simultaneous
                // mounts of these (700 KB-ish each) clips during
                // a fast scroll.
                { threshold: 0.1, rootMargin: '0px 0px 10% 0px' }
            );
            observer.observe(card);
        } catch {
            setVisible(true);
        }
        return () => { observer?.disconnect(); };
    }, [prefersReduced]);

    return (
        <motion.div
            ref={cardRef}
            className="lp-realproof-card"
            variants={popIn}
            whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        >
            <div className="lp-realproof-phone">
                {/* Same poster-under-video stack as GameCard. The phone
                    bezel is intentionally dark, so this matters less
                    visually, but keeping the poster mounted prevents
                    the brief dark-screen flash between observer mount
                    and the first video frame decoding. */}
                <img
                    className="lp-realproof-video"
                    src={poster}
                    alt={caption}
                    loading="lazy"
                    decoding="async"
                />
                {visible && !prefersReduced && (
                    <video
                        className="lp-realproof-video"
                        poster={poster}
                        muted playsInline loop preload="metadata" autoPlay
                    >
                        <source src={webm} type="video/webm" />
                        <source src={mp4} type="video/mp4" />
                    </video>
                )}
            </div>
            <div className="lp-realproof-caption">
                <strong>{caption}</strong>
                <span>{sub}</span>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// Parents
// ═══════════════════════════════════════════════════════════════════════
const Parents: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => (
    <section id="parents" className="lp-section lp-section-parents">
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
                <img
                    src="/landing-images/parent-child-screen.jpg"
                    alt="A parent and child playing Draw in the Air together on a TV"
                    loading="lazy"
                    decoding="async"
                />
                <motion.img
                    src="/landing-icons/kids-reading.png"
                    alt=""
                    className="lp-split-icon-corner"
                    whileHover={{ rotate: 4 }}
                    loading="lazy"
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
    <section id="teachers" className="lp-section lp-section-teachers">
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
                <img
                    src="/landing-images/classroom.jpg"
                    alt="A teacher leading a class with multiple children moving"
                    loading="lazy"
                    decoding="async"
                />
                <motion.img
                    src="/landing-icons/globe.png"
                    alt=""
                    className="lp-split-icon-corner"
                    whileHover={{ rotate: -4 }}
                    loading="lazy"
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
// Live proof . Real RPC numbers
// ═══════════════════════════════════════════════════════════════════════
const LiveProof: React.FC<{ proof: PublicProof | null }> = ({ proof }) => (
    <section className="lp-section lp-section-proof">
        <SectionHead
            eyebrow="EARLY USAGE"
            title={<>Trusted by families and educators.</>}
            sub="Aggregate platform numbers, updated live. We don't track individual children. These are anonymous device-level counts."
        />
        <motion.div
            className="lp-proof-grid"
            variants={stagger} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.2 }}
        >
            <ProofTile icon="/landing-icons/star-books.png"  value={proof?.distinct_devices_90d} label="Children learning"   sub="last 90 days" />
            <ProofTile icon="/landing-icons/smiley-star.png" value={proof?.activities_completed} label="Activities completed" sub="finished and counted" />
            <ProofTile icon="/landing-icons/crown-star.png"  value={proof?.items_mastered}        label="Items mastered"      sub="5 plus attempts, 80 percent acc." />
            <ProofTile icon="/landing-icons/globe.png"       value={proof?.tracker_success_pct}   suffix="%" label="Tracker success" sub="clean hand-tracking starts" />
        </motion.div>
    </section>
);

const ProofTile: React.FC<{
    icon: string; value: number | undefined; label: string; sub: string; suffix?: string;
}> = ({ icon, value, label, sub, suffix }) => {
    const n = useCountUp(value, 1400);
    return (
        <motion.div className="lp-proof-tile" variants={popIn}
            whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
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
const FinalCTA: React.FC<{ onTryFree: () => void }> = ({ onTryFree }) => {
    const prefersReduced = useReducedMotion();
    // Motion budget: was three decos all bobbing forever. Dropped the
    // third one entirely (the layout reads cleaner without it) and
    // gated the remaining two behind in-view so they only bob while
    // someone has scrolled to the final CTA.
    const sectionRef = useRef<HTMLElement | null>(null);
    const inView = useInView(sectionRef, { amount: 0.3 });
    const deco1Animate = !prefersReduced && inView
        ? { y: [0, -12, 0], rotate: [0, 6, 0] }
        : undefined;
    const deco2Animate = !prefersReduced && inView
        ? { y: [0, 10, 0], rotate: [0, -4, 0] }
        : undefined;
    return (
    <section ref={sectionRef} className="lp-section lp-section-final">
        <motion.div
            className="lp-final"
            variants={fadeUp} initial="hidden"
            whileInView="show" viewport={{ once: true, amount: 0.35 }}
        >
            <motion.img src="/landing-icons/star-books.png" alt=""
                className="lp-final-deco lp-final-deco-1"
                animate={deco1Animate}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img src="/landing-icons/smiley-star.png" alt=""
                className="lp-final-deco lp-final-deco-2"
                animate={deco2Animate}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
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
                <TrustChip icon="🔒" label="Private &amp; secure" />
            </div>
        </motion.div>
    </section>
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
