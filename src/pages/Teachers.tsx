/**
 * /teachers. Calm-direction public marketing page for schools and teachers.
 *
 * Sections:
 *   1. Hero ("Whole-class movement, zero setup.") + classroom photo +
 *      live leaderboard floating card
 *   2. Teacher value cards (3 + 1 ready guides card)
 *   3. Classroom mode section-ink (split with live leaderboard preview)
 *   4. Pilot programme steps (3 + ready-to-start CTA card)
 *   5. Teacher FAQ
 *   6. Teacher CTA banner
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalmFooter, FAQList, GestureTrail, SectionHead,
} from './Landing';
import { HeaderNav } from '../components/landing/HeaderNav';
import '../components/landing/landing-calm.css';

function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
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
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(r1);
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
    };
  }, [rootRef]);
}

const LEADERBOARD = [
  { m: '\u{1F947}', name: 'Amara', s: 980 },
  { m: '\u{1F948}', name: 'Jacob', s: 940 },
  { m: '\u{1F949}', name: 'Priya', s: 870 },
  { m: '4',          name: 'Leah',  s: 820 },
];

const TEACHER_VALUE = [
  { icon: '\u{1F5C2}\u{FE0F}', title: 'EYFS-mapped',           text: 'Activities tagged across communication, language, mathematics, and expressive arts.' },
  { icon: '\u{1F5A5}\u{FE0F}', title: 'One device, whole class', text: 'A single laptop, webcam and projector. The class moves together, no logins for children.' },
  { icon: '\u{1F4CA}',          title: 'Quiet analytics',        text: 'Usage by week, sessions per child, average engagement. Plain English, no dashboards to babysit.' },
];

const PILOT_STEPS = [
  { num: '01', title: 'Book a 20-minute call', text: 'We learn your setup and year group, and answer your safeguarding questions.' },
  { num: '02', title: 'We set up session one', text: 'We join your first classroom session live and calibrate the room with you.' },
  { num: '03', title: 'You run it solo',        text: 'Most teachers are independent by week two. We stay one message away.' },
];

const TEACHER_FAQ = [
  { q: 'Do children need accounts?',         a: 'No. Children never log in. You open the activity on the class device, pupils join the movement, not a system. Teacher accounts exist only for analytics and classroom mode.' },
  { q: 'What about our IT restrictions?',    a: 'It runs in the browser with no install. We provide a Chromebook setup guide and the exact domains to allow-list for your network team.' },
  { q: 'Is there a cost to pilot?',          a: 'The pilot is free, and the full activity set is free to use in class. School licences add admin analytics and whole-school reporting.' },
];

export const Teachers: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="lp-shell">
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="For Teachers">

        {/* HERO */}
        <section className="hero" data-screen-label="Teachers hero">
          <div className="hero-orb" />
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <div className="eyebrow is-sky reveal">
                  <span className="dot" />For teachers and schools
                </div>
                <h1 className="h1 reveal d1">
                  Whole-class movement, <span className="grad">zero setup.</span>
                </h1>
                <p className="lead reveal d2">
                  Run an EYFS-aligned movement break or literacy starter from one laptop and a webcam. No installs, no child accounts, no IT ticket. Open the URL, the class plays.
                </p>
                <div className="hero-actions reveal d3">
                  <Link to="/teacher/signup" className="btn btn-primary hero-cta lg">Start a pilot</Link>
                  <Link to="/pricing" className="btn btn-secondary lg">View school plans</Link>
                </div>
                <div className="hero-trust reveal d4">
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F3EB}'}</span> EYFS aligned</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F512}'}</span> GDPR compliant</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{26A1}'}</span> No installs</span>
                </div>
              </div>
              <div className="hero-visual reveal d2">
                <div className="photo hero-photo float">
                  <img src="/landing-assets/classroom.jpg" alt="A teacher running Draw in the Air with a class" />
                </div>
                <div className="hero-floater fl-1 float s2" style={{ minWidth: 190 }}>
                  <div style={{ width: '100%' }}>
                    <div className="meta" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      Live, 28 active
                    </div>
                    {LEADERBOARD.slice(0, 3).map((r) => (
                      <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{r.m} {r.name}</span>
                        <span style={{ fontWeight: 700, color: 'var(--lavender-600)', fontFamily: 'var(--font-mono)' }}>{r.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUE */}
        <section className="section" data-screen-label="Teacher value">
          <div className="wrap">
            <SectionHead eyebrow="Built for the classroom" tone="sky" title="Less admin. More movement." />
            <div className="steps">
              {TEACHER_VALUE.map((v, i) => (
                <div key={v.title} className={`step reveal d${i + 1}`}>
                  <div className="step-icon">{v.icon}</div>
                  <div className="step-title">{v.title}</div>
                  <p className="step-text">{v.text}</p>
                </div>
              ))}
              <div
                className="step reveal d4"
                style={{ background: 'var(--sky-50)', borderColor: 'var(--sky-200)' }}
              >
                <div className="step-icon">{'\u{1F4DA}'}</div>
                <div className="step-title">Ten ready guides</div>
                <p className="step-text">Quick-start, five-day movement plan, SEND inclusion, Chromebook setup. All printable.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CLASSROOM MODE */}
        <section className="section section-ink" data-screen-label="Classroom mode">
          <div className="wrap">
            <div className="split">
              <div className="reveal">
                <div className="eyebrow is-sky" style={{ color: 'var(--sky-300)' }}>
                  <span className="dot" style={{ background: 'var(--sky-400)' }} />Classroom mode
                </div>
                <h2 className="h2" style={{ color: '#fff', marginTop: 16 }}>Run your whole class at once.</h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.74)', marginTop: 16 }}>
                  A live class view shows energy in the room in real time. Start an activity, watch engagement, and download a session report when you are done.
                </p>
                <div className="bullets">
                  {[
                    'Live class energy view',
                    'A single shared device, no child logins',
                    'Session analytics after every class',
                    'Plain-English insights and suggestions',
                  ].map((b) => (
                    <div className="bullet" key={b}>
                      <span className="check" style={{ background: 'rgba(91,206,154,0.2)' }}>{'✓'}</span>
                      <span className="txt" style={{ color: 'rgba(255,255,255,0.8)' }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="reveal d2">
                <div
                  className="card"
                  style={{ padding: 24, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#fff' }}>Reception, Letter A</span>
                    <span className="pill-note" style={{ color: 'var(--mint-300)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--mint-400)', display: 'inline-block' }} />
                      28 active
                    </span>
                  </div>
                  {LEADERBOARD.map((r) => (
                    <div
                      key={r.name}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{r.m} {r.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--sky-300)' }}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 56 }} className="reveal">
              <div className="demo-frame">
                <video
                  poster="/landing-videos/tracing.jpg"
                  autoPlay muted loop playsInline preload="metadata"
                >
                  <source src="/landing-videos/tracing.webm" type="video/webm" />
                  <source src="/landing-videos/tracing.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* PILOT */}
        <section className="section section-tint" data-screen-label="Pilot programme">
          <div className="wrap">
            <SectionHead
              eyebrow="Pilot programme"
              tone="mint"
              title="We set up session one with you."
              lead="No procurement maze. Three light steps from first call to a class that runs it themselves."
            />
            <div className="steps">
              {PILOT_STEPS.map((s, i) => (
                <div key={s.num} className={`step reveal d${i + 1}`} style={{ gridColumn: 'span 1' }}>
                  <div className="step-num">{s.num}</div>
                  <div className="step-title" style={{ marginTop: 14 }}>{s.title}</div>
                  <p className="step-text">{s.text}</p>
                </div>
              ))}
              <div
                className="step reveal d4"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  background: 'var(--lavender-500)', borderColor: 'var(--lavender-500)',
                }}
              >
                <div className="step-title" style={{ color: '#fff' }}>Ready to start?</div>
                <p className="step-text" style={{ color: 'rgba(255,255,255,0.85)' }}>Book your pilot call this week.</p>
                <Link
                  to="/teacher/signup"
                  className="btn btn-reward sm"
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                >
                  Start a pilot
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* TEACHER FAQ */}
        <section className="section" data-screen-label="Teacher FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="What schools ask first." />
            <FAQList items={TEACHER_FAQ} />
          </div>
        </section>

        {/* CTA */}
        <section className="section" data-screen-label="Teacher CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">Bring movement into your classroom.</h2>
              <p className="lead">
                Start a free pilot. We will run your first session with you and leave you a printable activity pack.
              </p>
              <div className="cta-actions">
                <Link to="/teacher/signup" className="btn btn-secondary lg">Start a pilot</Link>
                <Link to="/pricing" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  View school plans <ArrowIcon size={17} />
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

export default Teachers;
