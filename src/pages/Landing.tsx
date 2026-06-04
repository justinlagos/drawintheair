/**
 * Landing.tsx, Calm-direction home page.
 *
 * Full rewrite ported from the offline approved prototype (template.html +
 * src2 / src3.jsx). Sections, in order:
 *   1. Sticky nav (HeaderNav)
 *   2. Hero with floating photo + activity card + hero-loop video
 *   3. Pull-quote band ("Movement is the curriculum.")
 *   4. Live demo strip (free-paint gameplay video)
 *   5. Proof band (4 stats)
 *   6. How it works (4 numbered steps)
 *   7. Activities grid (8 tiles, 1 with video preview)
 *   8. For home split (parent-child-screen.jpg + bullets)
 *   9. For schools split (classroom.jpg + bullets)
 *  10. Early-usage stats
 *  11. FAQ accordion
 *  12. CTA banner
 *  13. Calm-direction Footer (inlined)
 *
 * Routing: react-router-dom (paths, not hash).
 * Gesture trail: on by default for marketing pages.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeaderNav } from '../components/landing/HeaderNav';
import { BrandLogo } from '../components/BrandLogo';
import '../components/landing/landing-calm.css';

/* =====================================================================
   Icons (Lucide-style inline SVGs, stroke 1.85)
   ===================================================================== */
const ICONS: Record<string, string> = {
  play: 'M6 4l13 8-13 8V4z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'M6 9l6 6 6-6',
};
function Icon({ name, size = 20, ...p }: { name: keyof typeof ICONS; size?: number } & React.SVGProps<SVGSVGElement>) {
  const filled = name === 'play';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* =====================================================================
   Scroll reveal + gesture trail (visible-first; animation is enhancement)
   ===================================================================== */
function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
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
    pass();
    const r1 = requestAnimationFrame(() => { root.classList.add('anim'); });
    const t1 = window.setTimeout(pass, 140);
    const t2 = window.setTimeout(pass, 450);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Reveal content that mounts AFTER initial load (conditional sections,
    // tab panels). Freshly-mounted .reveal elements must never depend on a
    // scroll event to become visible.
    const mo = new MutationObserver(onScroll);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      mo.disconnect();
    };
  }, [rootRef]);
}

export function GestureTrail() {
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
        const r = Math.round(138 + (123 - 138) * mix);
        const g = Math.round(102 + (182 - 102) * mix);
        const b = Math.round(240 + (255 - 240) * mix);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a * 0.85})`;
        ctx.lineWidth = (1 - age) * 9 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      if (pts.length) {
        const p = pts[pts.length - 1];
        const age = (now - p.t) / 700;
        if (age < 1) {
          ctx.fillStyle = `rgba(123,182,255,${(1 - age) * 0.6})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 * dpr * (1 - age), 0, 7);
          ctx.fill();
        }
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
  return <canvas ref={ref} className="trail-canvas" aria-hidden="true" />;
}

/* =====================================================================
   Section head, FAQ, ActivityGrid (shared marketing primitives)
   ===================================================================== */
export function SectionHead({
  eyebrow, tone, title, lead,
}: { eyebrow?: string; tone?: 'mint' | 'sky' | 'sun' | 'peach'; title: string; lead?: string }) {
  return (
    <div className="sec-head reveal">
      {eyebrow && (
        <div className={`eyebrow ${tone ? 'is-' + tone : ''}`}>
          <span className="dot" />{eyebrow}
        </div>
      )}
      <h2 className="h2" dangerouslySetInnerHTML={{ __html: title }} />
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

export function FAQList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {items.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
          <button
            type="button"
            className="faq-q"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            <span>{f.q}</span><span className="faq-icon">+</span>
          </button>
          <div className="faq-a-wrap"><div className="faq-a"><p>{f.a}</p></div></div>
        </div>
      ))}
    </div>
  );
}

const TONE: Record<string, { tag: string; soft: string }> = {
  lavender: { tag: 'var(--lavender-700)', soft: 'var(--lavender-100)' },
  mint:     { tag: 'var(--mint-700)',     soft: 'var(--mint-100)' },
  sky:      { tag: 'var(--sky-700)',      soft: 'var(--sky-100)' },
  sun:      { tag: 'var(--sun-600)',      soft: 'var(--sun-100)' },
  peach:    { tag: 'var(--peach-600)',    soft: 'var(--peach-100)' },
};

export type ActivityTile = {
  id: string; icon: string; title: string; sub: string;
  cat: string; tone: keyof typeof TONE; video?: string; poster?: string;
};

const ACTIVITIES: ActivityTile[] = [
  { id: 'bubble',  icon: '\u{1FAE7}', title: 'Bubble Pop',     sub: 'Warm up your hands',    cat: 'Warm-up',  tone: 'peach' },
  { id: 'paint',   icon: '\u{1F3A8}', title: 'Free Paint',     sub: 'Create anything',       cat: 'Creative', tone: 'lavender' },
  { id: 'trace',   icon: '\u{270F}\u{FE0F}',  title: 'Tracing',        sub: 'Follow the path',       cat: 'Learning', tone: 'mint' },
  { id: 'sort',    icon: '\u{1F5C2}\u{FE0F}', title: 'Sort & Place',   sub: 'Think and sort',        cat: 'Puzzle',   tone: 'sky' },
  { id: 'word',    icon: '\u{1F50D}', title: 'Word Search',    sub: 'Find the words',        cat: 'Puzzle',   tone: 'sun' },
  { id: 'balloon', icon: '\u{1F388}', title: 'Balloon Math',   sub: 'Pop the right number',  cat: 'Learning', tone: 'peach' },
  { id: 'rainbow', icon: '\u{1F308}', title: 'Rainbow Bridge', sub: 'Match the colours',     cat: 'Learning', tone: 'sky' },
  { id: 'spell',   icon: '\u{270D}\u{FE0F}',  title: 'Spelling Stars', sub: 'Spell the word',        cat: 'Learning', tone: 'lavender' },
];

export function ActivityGrid({ limit }: { limit?: number }) {
  const list = limit ? ACTIVITIES.slice(0, limit) : ACTIVITIES;
  return (
    <div className="acts">
      {list.map((a, i) => (
        <button key={a.id} type="button" className={`act reveal d${(i % 4) + 1}`}>
          {a.video ? (
            <div className="act-media">
              <video
                src={a.video}
                poster={a.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          ) : null}
          <span className="act-ico" style={{ background: TONE[a.tone].soft }} aria-hidden="true">{a.icon}</span>
          <div className="act-cat" style={{ color: TONE[a.tone].tag, background: TONE[a.tone].soft }}>{a.cat}</div>
          <div className="act-title">{a.title}</div>
          <div className="act-sub">{a.sub}</div>
          <span className="act-go"><Icon name="arrow" size={16} /></span>
        </button>
      ))}
    </div>
  );
}

/* =====================================================================
   Page-specific data (Calm direction copy only)
   ===================================================================== */
const HOW_STEPS = [
  { num: '01', img: '/landing-assets/icons/globe.png',      title: 'Open the page',     text: 'Any browser, any laptop. Camera permission is the only setup.' },
  { num: '02', img: '/landing-assets/icons/hand.png',       title: 'Wave to start',     text: 'Five small waves wake the canvas and calibrate the tracker.' },
  { num: '03', img: '/landing-assets/icons/shapes.png',     title: 'Pick an activity',  text: 'Point and hold for 1.5 seconds. No tap, no click, no controller.' },
  { num: '04', img: '/landing-assets/icons/star-smile.png', title: 'Move to learn',     text: 'Draw, trace, pop and sort. The hand is the input, always.' },
];

const HOME_FAQ = [
  { q: "How is my child's privacy protected?", a: 'No video, no audio, and no images are ever stored or sent anywhere. The camera frame is processed entirely inside the browser tab and discarded each frame. The product runs without a server connection once loaded.' },
  { q: 'What ages is it designed for?',         a: 'The interaction is built for children aged 3 to 7. Younger children play the warm-up and free-paint modes; from age 5 onward, tracing, spelling, and maths activities open up. Adult supervision is recommended for the first session.' },
  { q: 'Does it really not need special hardware?', a: 'Just a modern browser (Chrome, Edge, Safari 15+) and a webcam. Most laptops from the last five years work. No phone, no tablet, no controller, no glove.' },
  { q: 'How is this different from a touchscreen?', a: 'A touchscreen needs only a wrist movement. Draw in the Air rewards whole-arm movement, how 3 to 7 year-olds naturally develop fine motor control. It is designed for a laptop and webcam, not a tablet.' },
  { q: 'Is it free for parents?', a: 'Yes. The full activity set is free for individual families. Schools join a pilot programme; we set the first classroom session up with you personally.' },
];

const TRUST_STATS = [
  { img: 'books-star.png',  n: '4,300+',   label: 'Children learning',     sub: 'last 90 days' },
  { img: 'star-smile.png',  n: '128,000+', label: 'Activities completed',  sub: 'finished and counted' },
  { img: 'badge-crown.png', n: '47,000+',  label: 'Items mastered',        sub: '5+ attempts, 80% accuracy' },
  { img: 'globe.png',       n: '96%',      label: 'Tracker success',       sub: 'clean hand-tracking starts' },
];

const PROOF_STATS = [
  { n: '5,000+', l: 'Children reached' },
  { n: '200+',   l: 'UK classrooms' },
  { n: 'EYFS',   l: 'Curriculum aligned' },
  { n: '100%',   l: 'Frames stay on-device' },
];

/* =====================================================================
   Calm Footer (inlined for visual consistency)
   ===================================================================== */
export function CalmFooter() {
  return (
    <footer className="footer" data-screen-label="Footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandLogo variant="footer" alt="Draw in the Air" />
            <p className="footer-tag">
              Movement-first learning for children aged 3 to 7. Built for the browser. Built for families and classrooms.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <Link to="/parent/signup" className="btn btn-primary sm">Try free</Link>
            </div>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><Link to="/">How it works</Link></li>
              <li><Link to="/">Activities</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h5>For Schools</h5>
            <ul>
              <li><Link to="/teachers">For teachers</Link></li>
              <li><Link to="/schools">Pilot programme</Link></li>
              <li><Link to="/for-teachers#eyfs-mapping">EYFS mapping</Link></li>
              <li><Link to="/teachers">Classroom guides</Link></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/press">Press kit</Link></li>
              <li><Link to="/free-resources">Free resources</Link></li>
              <li><Link to="/transparency">Transparency</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-legal">
          <span>{'©'} 2026 Draw in the Air Ltd, EYFS aligned, Made in the UK</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/parent/login">Family login</Link>
            <Link to="/teacher/login">Teacher login</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* =====================================================================
   Landing page component
   ===================================================================== */
export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  const go = (path: string) => navigate(path);

  return (
    <div ref={rootRef} className="lp-shell">
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="Home">

        {/* HERO */}
        <section className="hero" data-screen-label="01 Hero">
          <div className="hero-orb" />
          <img
            className="hero-deco trail float"
            src="/landing-assets/icons/trail-star.png"
            alt=""
            aria-hidden="true"
          />
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <div className="eyebrow reveal">
                  <span className="dot" />EYFS aligned, free for families
                </div>
                <h1 className="h1 reveal d1">
                  Screen time that <span className="grad">makes you smile.</span>
                </h1>
                <p className="lead reveal d2">
                  Watch your child practise letters, numbers, and creativity using just their hands. No touchscreen. No controller. Just natural movement and imagination.
                </p>
                <div className="hero-actions reveal d3">
                  <button
                    type="button"
                    className="btn btn-primary hero-cta lg"
                    onClick={() => go('/parent/signup')}
                  >
                    <Icon name="play" size={18} />Try free now
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary lg"
                    onClick={() => go('/teachers')}
                  >
                    For schools
                  </button>
                </div>
                <div className="hero-trust reveal d4">
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F512}'}</span> No data stored</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{2728}'}</span> 7 days free</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{26A1}'}</span> Works instantly</span>
                </div>
              </div>

              {/* Hero visual: child-drawing-light photo + 3 floating cards.
                  fl-2 is a small autoplaying hero-loop gameplay clip so
                  visitors see real motion within a second. */}
              <div className="hero-visual reveal d2">
                <div className="photo hero-photo float">
                  <img src="/landing-assets/child-drawing-light.jpg" alt="A child tracing a letter in the air with their finger" />
                </div>
                <div className="hero-floater fl-1 float s2">
                  <span className="emoji" aria-hidden="true">{'\u{270F}\u{FE0F}'}</span>
                  <div>
                    <div className="ftitle">Tracing the letter A</div>
                    <div className="meta">+2 stars earned</div>
                  </div>
                </div>
                <div className="hero-floater fl-2 video-floater float s3" aria-hidden="true">
                  <video
                    poster="/landing-videos/hero-loop.jpg"
                    autoPlay muted loop playsInline preload="metadata"
                  >
                    <source src="/landing-videos/hero-loop.webm" type="video/webm" />
                    <source src="/landing-videos/hero-loop.mp4" type="video/mp4" />
                  </video>
                </div>
                <div className="hero-floater fl-3 float">
                  <span className="emoji" aria-hidden="true">{'\u{1F3A8}'}</span>
                  <div>
                    <div className="ftitle">Free paint</div>
                    <div className="meta">3 colours, M brush</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PULL QUOTE BAND */}
        <section className="section section-stage" data-screen-label="Pull quote">
          <div className="wrap-content center reveal">
            <p className="quote" style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.3, color: 'var(--ink-900)' }}>
              {'“'}Movement is the curriculum. The screen is just the canvas.{'”'}
            </p>
            <div className="pill-note" style={{ marginTop: 22, justifyContent: 'center' }}>
              The Draw in the Air principle
            </div>
          </div>
        </section>

        {/* LIVE DEMO STRIP (single embedded gameplay clip) */}
        <section className="section section-ink" data-screen-label="Live demo strip">
          <div className="wrap">
            <div className="demo-strip">
              <div className="reveal">
                <div className="eyebrow is-sky" style={{ color: 'var(--sky-300)' }}>
                  <span className="dot" style={{ background: 'var(--sky-400)' }} />See it move
                </div>
                <h2 className="h2" style={{ color: '#fff', marginTop: 16 }}>
                  Real gameplay, <br />no edits.
                </h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.74)', marginTop: 16 }}>
                  A clip from Balloon Math, captured live. Every pop is a finger in the air, every count is a confident jab. This is what a session actually looks like.
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="btn btn-reward lg"
                    onClick={() => go('/parent/signup')}
                  >
                    Try it with your child
                  </button>
                </div>
              </div>
              <div className="reveal d2">
                <div className="demo-frame">
                  <video
                    poster="/landing-videos/balloon-math.jpg"
                    autoPlay muted loop playsInline preload="metadata"
                  >
                    <source src="/landing-videos/balloon-math.webm" type="video/webm" />
                    <source src="/landing-videos/balloon-math.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF BAND */}
        <section className="section section-tint" data-screen-label="Proof band">
          <div className="wrap">
            <div className="stats">
              {PROOF_STATS.map((s, i) => (
                <div key={s.l} className={`stat reveal d${i + 1}`}>
                  <div className="stat-num">{s.n}</div>
                  <div className="stat-lbl">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section" data-screen-label="How it works">
          <div className="wrap">
            <SectionHead
              eyebrow="How it works"
              title="Four steps. No download."
              lead="From URL to first stroke in under a minute. The whole interaction lives in the browser tab."
            />
            <div className="steps">
              {HOW_STEPS.map((s, i) => (
                <div key={s.num} className={`step reveal d${i + 1}`}>
                  <div className="step-num">{s.num}</div>
                  <img className="step-img" src={s.img} alt="" />
                  <div className="step-title">{s.title}</div>
                  <p className="step-text">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ACTIVITIES */}
        <section className="section section-tint" data-screen-label="Activities">
          <div className="wrap">
            <SectionHead
              eyebrow="Eight ways to play"
              tone="mint"
              title="Eight activities. <span class='grad'>One gesture.</span>"
              lead="Every activity uses the same pinch-to-draw, point-to-select interaction. Children learn the language once, then explore freely."
            />
            <ActivityGrid />
            <div className="center mt-cta reveal">
              <button
                type="button"
                className="btn btn-primary md"
                onClick={() => go('/parent/signup')}
              >
                Start playing free <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
        </section>

        {/* FOR HOME */}
        <section className="section" data-screen-label="For home">
          <div className="wrap">
            <div className="split">
              <div className="split-media reveal">
                <div className="photo">
                  <img src="/landing-assets/parent-child-screen.jpg" alt="A parent and child playing together at a laptop" />
                </div>
              </div>
              <div className="reveal d1">
                <div className="eyebrow is-peach"><span className="dot" />For home</div>
                <h2 className="h2" style={{ marginTop: 16 }}>Screen time that actually means something.</h2>
                <p className="lead" style={{ marginTop: 16 }}>
                  Draw in the Air turns any webcam session into an active, physical learning moment. Children get up, move, and practise real skills, you get peace of mind.
                </p>
                <div className="bullets">
                  {[
                    'EYFS and early-literacy aligned',
                    'No registration for free activities',
                    'Works on any laptop or tablet with a camera',
                    'Children stay safe, no data collected',
                  ].map((b) => (
                    <div className="bullet" key={b}>
                      <span className="check">{'✓'}</span>
                      <span className="txt">{b}</span>
                    </div>
                  ))}
                </div>
                <Link to="/parents" className="btn btn-primary md">
                  Explore for parents <Icon name="arrow" size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FOR SCHOOLS */}
        <section className="section section-stage" data-screen-label="For schools">
          <div className="wrap">
            <div className="split flip">
              <div className="split-media reveal">
                <div className="photo">
                  <img src="/landing-assets/classroom.jpg" alt="Children using Draw in the Air together in a classroom" />
                </div>
              </div>
              <div className="reveal d1">
                <div className="eyebrow is-sky"><span className="dot" />For schools</div>
                <h2 className="h2" style={{ marginTop: 16 }}>Whole-class movement, EYFS aligned.</h2>
                <p className="lead" style={{ marginTop: 16 }}>
                  A free, browser-based tool that fits your existing classroom setup. One laptop, one webcam, one projector, the whole class moves together.
                </p>
                <div className="bullets">
                  {[
                    'EYFS-mapped activities across communication, maths and expressive arts',
                    'No installs and no accounts for children',
                    'A quiet teacher dashboard: usage, sessions, engagement',
                    'Pilot programme, we set up your first session with you',
                  ].map((b) => (
                    <div className="bullet" key={b}>
                      <span className="check">{'✓'}</span>
                      <span className="txt">{b}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to="/teachers" className="btn btn-primary md">Start a pilot</Link>
                  <Link to="/for-teachers#eyfs-mapping" className="btn btn-ghost md">
                    Read the EYFS mapping <Icon name="arrow" size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EARLY USAGE */}
        <section className="section" data-screen-label="Early usage">
          <div className="wrap">
            <SectionHead
              eyebrow="Early usage"
              title="Trusted by families and educators."
              lead="Aggregate platform numbers, updated live. We do not track individual children. These are anonymous, device-level counts."
            />
            <div className="tstats">
              {TRUST_STATS.map((s, i) => (
                <div key={s.label} className={`tstat reveal d${i + 1}`}>
                  <img src={`/landing-assets/icons/${s.img}`} alt="" />
                  <div className="tstat-num">{s.n}</div>
                  <div className="tstat-label">{s.label}</div>
                  <div className="tstat-sub">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section section-tint" data-screen-label="FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="The questions parents ask first." />
            <FAQList items={HOME_FAQ} />
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="section" data-screen-label="CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">Ready to see them light up?</h2>
              <p className="lead">
                Start your 7-day free trial. Up to 2 learners, the full activity library, and cancel anytime. Works on any laptop with a webcam.
              </p>
              <div className="cta-actions">
                <Link to="/parent/signup" className="btn btn-secondary lg">Start free trial</Link>
                <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  Book a school demo <Icon name="arrow" size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
};

export default Landing;
