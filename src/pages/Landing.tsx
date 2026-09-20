/**
 * Landing.tsx — Draw in the Air.
 *
 * The `Landing` component is the Sept 2026 home-page redesign (bold "one idea
 * per section" direction, mockup artifact 48caf124). It renders inside `.lp6`
 * and uses the shared chrome (Lp6Nav + Lp6Footer) from Lp6Chrome, which the
 * Parents / Teachers / Pricing / About pages share too.
 *
 * IMPORTANT: this module is ALSO the shared calm-primitives library. The
 * exports GestureTrail, SectionHead, FAQList, ActivityGrid, ActivityTile,
 * ACTIVITIES, CalmFooter and Icon are imported by About/Teachers/Pricing/
 * ParentsLanding/Training and the SEO pages and are kept unchanged.
 *
 * Data-driven emphases (Admin Insights, 30d): camera permission is the biggest
 * pre-play leak (grant rate 82% -> 77%), so on-device/privacy trust is elevated
 * near both CTAs and given its own band; the wave step is the biggest
 * in-product cliff (85% reach it, 50% get a hand seen), so "How it works" sets
 * concrete setup expectations.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { logEvent } from '../lib/analytics';
import { SEOMeta } from '../seo/SEOMeta';
import {
  SITE, PAGE_META,
  buildOrganizationSchema, buildSoftwareAppSchema, buildFAQSchema,
} from '../seo/seo-config';
import {
  Lp6Nav, Lp6Footer, useLp6Reveal, ArrowIcon, ShieldIcon, BoltIcon, LaptopIcon, hideOnError, Lp6Faq,
} from '../components/landing/Lp6Chrome';
import '../components/landing/landing-calm.css';
import './landing-redesign.css';

/* =====================================================================
   SHARED CALM PRIMITIVES (used by other pages — do not change)
   ===================================================================== */
const ICONS: Record<string, string> = {
  play: 'M6 4l13 8-13 8V4z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'M6 9l6 6 6-6',
};
export function Icon({ name, size = 20, ...p }: { name: keyof typeof ICONS; size?: number } & React.SVGProps<SVGSVGElement>) {
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
              <Link to="/play" className="btn btn-primary sm">Try free</Link>
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
              <li><Link to="/teachers#eyfs-mapping">EYFS mapping</Link></li>
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
   NEW HOME PAGE (scoped under .lp6)
   ===================================================================== */
const GAMES: { id: string; label: string; slug: string }[] = [
  { id: 'trace',   label: 'Tracing',        slug: 'tracing' },
  { id: 'paint',   label: 'Free Paint',     slug: 'free-paint' },
  { id: 'bmath',   label: 'Balloon Math',   slug: 'balloon-math' },
  { id: 'pop',     label: 'Balloon Pop',    slug: 'bubble-pop' },
  { id: 'rainbow', label: 'Rainbow Bridge', slug: 'rainbow-bridge' },
  { id: 'sort',    label: 'Sort and Place', slug: 'sort-place' },
  { id: 'spell',   label: 'Spelling Stars', slug: 'spelling-stars' },
  { id: 'word',    label: 'Word Search',    slug: 'word-search' },
];

const HOME_FAQ = [
  { q: "How is my child's privacy protected?", a: 'No video, no audio, and no images are ever stored or sent anywhere. The camera frame is processed entirely inside the browser tab and discarded each frame. An internet connection is needed while playing so progress and class sessions can sync.' },
  { q: 'What ages is it designed for?',         a: 'The interaction is built for children aged 3 to 7. Bubble Pop, Free Paint and Tracing are open from age 3. Spelling Stars and Word Search are pitched at 5 to 7, and Balloon Math at 4 to 7. Adult supervision is recommended for the first session.' },
  { q: 'What do we need to set it up?', a: 'A laptop or Chromebook with a webcam, and a modern browser (Chrome, Edge, Safari 15+). Sit the child about an arm and a half from the screen, in a well-lit room, and give the camera a clear view of one hand. No phone, tablet, controller or glove needed.' },
  { q: 'How is this different from a touchscreen?', a: 'A touchscreen needs only a wrist movement. Draw in the Air rewards whole-arm movement, which is how 3 to 7 year-olds naturally develop fine motor control. It works best on a laptop or Chromebook with a webcam.' },
  { q: 'Is it free?', a: 'Core activities are always free to play, with no sign-up. A Family plan (7-day free trial) unlocks the full activity library, progress reports and parental controls. Schools join a free pilot programme; we set the first classroom session up with you.' },
];

function Tile({ label, slug, onOpen }: { label: string; slug: string; onOpen: () => void }) {
  const vref = useRef<HTMLVideoElement | null>(null);
  return (
    <button
      type="button"
      className="tile"
      onClick={onOpen}
      onMouseEnter={() => { vref.current?.play().catch(() => {}); }}
      onMouseLeave={() => { const v = vref.current; if (v) { v.pause(); v.currentTime = 0; } }}
    >
      <video
        ref={vref}
        muted loop playsInline preload="none"
        poster={`/landing-videos/${slug}.jpg`}
      >
        <source src={`/landing-videos/${slug}.webm`} type="video/webm" />
        <source src={`/landing-videos/${slug}.mp4`} type="video/mp4" />
      </video>
      <span>{label}</span>
    </button>
  );
}

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLp6Reveal(rootRef);

  useEffect(() => {
    logEvent('landing_view');
    let engaged = false;
    const onEngage = () => {
      if (engaged) return;
      if (window.scrollY > 200) { engaged = true; logEvent('landing_engaged', { meta: { via: 'scroll' } }); cleanup(); }
    };
    const cleanup = () => window.removeEventListener('scroll', onEngage);
    window.addEventListener('scroll', onEngage, { passive: true });
    return cleanup;
  }, []);

  const cta = (source: string, dest: string) => {
    logEvent('cta_click', { meta: { source, dest } });
    navigate(dest);
  };

  return (
    <div ref={rootRef} className="lp6">
      <SEOMeta
        title={PAGE_META.home.title}
        description={PAGE_META.home.description}
        keywords={PAGE_META.home.keywords}
        canonical="/"
        ogImage={SITE.ogImage}
        structuredData={[
          buildOrganizationSchema(),
          buildSoftwareAppSchema(),
          buildFAQSchema(HOME_FAQ),
        ]}
      />
      <GestureTrail />
      <Lp6Nav active="home" />

      {/* HERO */}
      <section className="hero" data-screen-label="01 Hero">
        <div className="wrap">
          <h1 className="h1">They draw <span className="mark">in the air.</span><br />They learn.</h1>
          <p className="lead">A webcam, a hand and a laptop. Children aged 3 to 7 trace letters, numbers and shapes by moving. No download. No account.</p>
          <button type="button" className="btn" onClick={() => cta('hero', '/play')}>Try it now, no sign-up <ArrowIcon /></button>
          <div className="trust">
            <span className="chip"><ShieldIcon /> Webcam stays on your device</span>
            <span className="chip"><BoltIcon /> Works instantly</span>
            <span className="chip"><LaptopIcon /> Any laptop or Chromebook</span>
          </div>

          <div className="stage">
            <img className="ico hand" src="/landing-assets/icons/hand.png" alt="" aria-hidden="true" onError={hideOnError} />
            <img className="ico star" src="/landing-assets/icons/star-smile.png" alt="" aria-hidden="true" onError={hideOnError} />

            <div className="kidvid">
              <video autoPlay muted loop playsInline poster="/landing-videos/real-kid-1.jpg">
                <source src="/landing-videos/real-kid-1.webm" type="video/webm" />
                <source src="/landing-videos/real-kid-1.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="frag hud card-lbl">
              <img src="/landing-assets/icons/shapes.png" alt="" onError={hideOnError} />
              <div><b>Tracing</b><small>Shape 4 of 31</small></div>
            </div>

            <div className="frag pop card-lbl">
              <img src="/landing-assets/icons/star-smile.png" alt="" onError={hideOnError} />
              <div><b>+2 stars</b><small>Great pop!</small></div>
            </div>

            <div className="frag balloons">
              <video autoPlay muted loop playsInline poster="/landing-videos/balloon-math.jpg">
                <source src="/landing-videos/balloon-math.webm" type="video/webm" />
                <source src="/landing-videos/balloon-math.mp4" type="video/mp4" />
              </video>
            </div>

            <div className="laptop">
              <div className="screen">
                <video autoPlay muted loop playsInline poster="/landing-videos/free-paint.jpg">
                  <source src="/landing-videos/free-paint.webm" type="video/webm" />
                  <source src="/landing-videos/free-paint.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="base" />
            </div>

            <div className="frag pinch"><span className="dot" /> Pinch to draw, start at the green dot</div>
          </div>
        </div>
      </section>

      {/* ACTIVITIES */}
      <section className="acts" data-screen-label="Activities">
        <div className="wrap">
          <h2 className="h2">One webcam, <span className="mark">eight</span> ways to play.</h2>
          <p className="lead">Every activity is played by moving. Pinch to draw, pop, sort, spell and find. Hover to watch.</p>
          <div className="tiles">
            {GAMES.map((g) => (
              <Tile key={g.id} label={g.label} slug={g.slug} onOpen={() => cta('activities', '/play')} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section data-screen-label="How it works">
        <div className="wrap">
          <div className="card reveal">
            <div>
              <span className="label">How it works</span>
              <h2 className="h2">Wave to start. Pinch to draw.</h2>
              <p className="lead">Wave at the camera and the session begins. Pinch to draw, trace, sort or pop. Open your hand to pause. That is the whole control scheme.</p>
              <div className="tip"><b>Best first go:</b> a well-lit room, the child about an arm and a half from the screen, one hand in clear view. That is all the tracker needs to see the first wave.</div>
            </div>
            <div className="gest">
              <div className="g"><img src="/landing-assets/icons/hand.png" alt="" onError={hideOnError} /><div><b>Wave</b><small>to begin</small></div></div>
              <div className="g"><img src="/landing-assets/icons/shapes.png" alt="" onError={hideOnError} /><div><b>Pinch</b><small>to draw, trace or pick</small></div></div>
              <div className="g"><img src="/landing-assets/icons/star-smile.png" alt="" onError={hideOnError} /><div><b>Open hand</b><small>to pause</small></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* PILOT */}
      <section className="pilot" data-screen-label="Pilot">
        <div className="wrap">
          <span className="label">In classrooms</span>
          <h2 className="h2">Built with a UK primary school.</h2>
          <p className="lead">Piloting with Archbishop Courtenay CE Primary in Kent. Ten to fifteen minute sessions, two or three times a week, on the laptops the school already owns.</p>
          <div className="media reveal">
            <div><img src="/landing-assets/classroom.jpg" alt="Children around a laptop in a classroom" /></div>
            <div>
              <video autoPlay muted loop playsInline poster="/landing-videos/real-kid-2.jpg">
                <source src="/landing-videos/real-kid-2.webm" type="video/webm" />
                <source src="/landing-videos/real-kid-2.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
          <div className="quote"><b>Quote slot.</b> An approved quote from the school goes here. Nothing ships in this box until it is approved in writing.</div>
        </div>
      </section>

      {/* FOR PARENTS */}
      <section id="parents" data-screen-label="For parents">
        <div className="wrap feat">
          <div className="txt reveal">
            <span className="label">For parents</span>
            <h2 className="h2"><span className="mark">Movement,</span> not swiping.</h2>
            <p className="lead">The hand does the work the finger used to do. Letters form through whole-arm movement, which is how early writing readiness is built.</p>
            <Link className="link" to="/parents" onClick={() => logEvent('nav_click', { meta: { label: 'for_parents_link', dest: '/parents' } })}>For parents &rarr;</Link>
          </div>
          <div className="art reveal d1">
            <div className="shot">
              <video autoPlay muted loop playsInline poster="/landing-videos/tracing.jpg">
                <source src="/landing-videos/tracing.webm" type="video/webm" />
                <source src="/landing-videos/tracing.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="fl pill" style={{ right: -16, bottom: -22 }}>
              <img src="/landing-assets/icons/star-smile.png" alt="" onError={hideOnError} /> Keep going!
            </div>
          </div>
        </div>
      </section>

      {/* FOR TEACHERS */}
      <section id="teachers" data-screen-label="For teachers">
        <div className="wrap feat flip">
          <div className="txt reveal">
            <span className="label">For teachers</span>
            <h2 className="h2">Whole class, <span className="mark aqua">one join code.</span></h2>
            <p className="lead">Start a class, share the code, and every child joins from their own laptop. You choose the activity, pause the room and move everyone on together. Aligned to EYFS Physical Development and Literacy.</p>
            <Link className="link" to="/teachers" onClick={() => logEvent('nav_click', { meta: { label: 'for_teachers_link', dest: '/teachers' } })}>For teachers &rarr;</Link>
          </div>
          <div className="art reveal d1">
            <div className="console">
              <div className="hd">
                <div><span className="label">Class code</span><div className="code">4821</div></div>
                <span className="live">Live</span>
              </div>
              <div className="kid"><i style={{ background: 'var(--sun)' }} />Fox<span className="st">Sort and Place</span></div>
              <div className="kid"><i style={{ background: 'var(--aqua)' }} />Owl<span className="st">Sort and Place</span></div>
              <div className="kid"><i style={{ background: 'var(--coral)' }} />Bear<span className="st wait">Joining</span></div>
              <div className="cbtns"><span>Assign activity</span><span className="ghost">Pause all</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY / ON-DEVICE (data-driven: camera trust is the top pre-play leak) */}
      <section data-screen-label="Privacy">
        <div className="wrap">
          <div className="privacy reveal">
            <div>
              <span className="label">Private by design</span>
              <h2 className="h2">The camera never leaves the laptop.</h2>
              <p>Draw in the Air asks for the webcam so it can see a hand move. That is all it is for, and the picture goes nowhere else.</p>
            </div>
            <div className="plist">
              <div className="prow"><span className="tick">&#10003;</span><div><b>Frames never leave the browser</b><small>Hand tracking runs on the device. Each frame is read and thrown away.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>No video or photos are stored</b><small>Nothing is recorded, uploaded or saved. There is no footage to keep.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>No child accounts to play</b><small>Free activities start with a wave. No name, no email, no login.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>You can turn the camera off any time</b><small>Close the tab and the camera light goes out. You are always in control.</small></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ANCHOR BAND */}
      <section className="anchor" data-screen-label="Anchor">
        <div className="wrap">
          <h2 className="h2">We trained children to sit still and tap glass.</h2>
          <p>Draw in the Air gets them moving again.</p>
          <svg viewBox="0 0 560 60" fill="none" aria-hidden="true"><path className="draw" d="M10 40c80-30 140 20 220-10s160-30 320 10" stroke="#55DDE0" strokeWidth="10" strokeLinecap="round" /></svg>
        </div>
      </section>

      {/* TAPPING vs DRAWING */}
      <section data-screen-label="Tapping vs drawing">
        <div className="wrap pair">
          <div className="pc off"><span className="label">Tapping</span><h3 className="h3">A finger on glass.</h3><p>Eyes down. Body still. The letter appears, but nothing in the arm learned it.</p></div>
          <div className="pc on"><img src="/landing-assets/icons/hand.png" alt="" onError={hideOnError} /><span className="label">Drawing in the air</span><h3 className="h3">Whole body in the letter.</h3><p>Arm, shoulder, eyes up. The movement is the practice.</p></div>
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>The questions parents ask first.</h2>
          <Lp6Faq items={HOME_FAQ} />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final" data-screen-label="Final CTA">
        <div className="wrap">
          <img className="trophy" src="/landing-icons/trophy.png" alt="" onError={hideOnError} />
          <h2 className="h2">You set it up once. <span className="mark">They</span> do the rest.</h2>
          <p className="lead">Open it on a laptop, let them wave at the camera, and step back.</p>
          <button type="button" className="btn" onClick={() => cta('final_banner', '/play')}>Try it now, no sign-up <ArrowIcon /></button>
          <div><Link className="alt link" to="/teachers" onClick={() => logEvent('nav_click', { meta: { label: 'create_teacher_account', dest: '/teachers' } })}>Create a teacher account</Link></div>
          <p className="reassure">No sign-up to try. The webcam stays on your device.</p>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
};

export default Landing;
