/**
 * /parents. Calm-direction public marketing page for the family plan.
 *
 * Sections:
 *   1. Hero ("Learning they'll ask to do again.") with parent-child photo
 *      + 2 floating stat cards
 *   2. Value cards ("Why parents choose it"), 4 cards
 *   3. Activities band (8 tiles, includes Free Paint video) +
 *      embedded real-kid-1 clip to ground the proof in a real moment
 *   4. Privacy split (privacy-camera.jpg + 4 bullets)
 *   5. Parent FAQ accordion
 *   6. Parent CTA banner
 *
 * Note: this is the PUBLIC marketing landing at /parents. The authenticated
 * parent area lives at /parent/* and is untouched.
 */

import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ActivityGrid, CalmFooter, FAQList, GestureTrail, SectionHead,
} from '../Landing';
import { HeaderNav } from '../../components/landing/HeaderNav';
import '../../components/landing/landing-calm.css';

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
      <path d="M6 4l13 8-13 8V4z" />
    </svg>
  );
}

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
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(r1);
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
    };
  }, [rootRef]);
}

const PARENT_VALUE = [
  { icon: '\u{1F9E0}', title: 'Real skill, real movement', text: "Whole-arm letter formation and counting build the fine-motor control that touchscreens skip." },
  { icon: '\u{1F512}', title: 'Private by design',         text: 'The camera frame never leaves the browser. Nothing is recorded, stored, or sent anywhere.' },
  { icon: '\u{26A1}',  title: 'Ready in a minute',         text: 'Open the page, allow the camera, wave to start. No app store, no setup, just start your free trial.' },
];

const PARENT_FAQ = [
  { q: 'Will it work on our family laptop?', a: 'Almost certainly. Any laptop from the last five years with a webcam and Chrome, Edge, or Safari 15+ works. No phone or tablet app to install.' },
  { q: 'How long should a session be?',      a: 'Most children play for five to ten minutes at a time. It is active and physical, so it is naturally self-limiting. The average session is around seven minutes.' },
  { q: 'How much does it cost?',             a: 'Every account starts with a 14-day free trial, up to 2 learners. After that the Family plan is $4.99 a month or $54.99 a year, with the full activity library and cancel anytime.' },
  { q: 'Do I need to sit with my child?',    a: 'For the first session, yes, to help with the camera and the wave-to-start. After that most children aged 5+ can open an activity and play independently.' },
];

export default function ParentsLandingV2() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="lp-shell">
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="For Parents">

        {/* HERO */}
        <section className="hero" data-screen-label="Parents hero">
          <div className="hero-orb" />
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <div className="eyebrow is-peach reveal">
                  <span className="dot" />For parents, 14-day free trial
                </div>
                <h1 className="h1 reveal d1">
                  Learning they{'’'}ll <span className="grad">ask to do again.</span>
                </h1>
                <p className="lead reveal d2">
                  Draw in the Air is the screen time you do not have to feel guilty about. Your child stands up, moves, and practises letters, numbers and creativity, using nothing but their hands.
                </p>
                <div className="hero-actions reveal d3">
                  <button
                    type="button"
                    className="btn btn-primary hero-cta lg"
                    onClick={() => navigate('/parent/signup')}
                  >
                    <PlayIcon /> Start free trial
                  </button>
                  <Link to="/pricing" className="btn btn-secondary lg">See pricing</Link>
                </div>
                <div className="hero-trust reveal d4">
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F512}'}</span> No data stored</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{2728}'}</span> 14 days free</span>
                  <span className="trust-chip"><span className="ic" aria-hidden="true">{'\u{1F476}'}</span> Ages 3 to 7</span>
                </div>
              </div>
              <div className="hero-visual reveal d2">
                <div className="photo hero-photo float">
                  <img src="/landing-assets/parent-child-screen.jpg" alt="A parent and child playing Draw in the Air together" />
                </div>
                <div className="hero-floater fl-1 float s2">
                  <span className="emoji" aria-hidden="true">{'\u{2B50}'}</span>
                  <div>
                    <div className="ftitle">980 points today</div>
                    <div className="meta">letter A mastered</div>
                  </div>
                </div>
                <div className="hero-floater fl-2 float s3">
                  <span className="emoji" aria-hidden="true">{'\u{1F525}'}</span>
                  <div>
                    <div className="ftitle">14-day streak</div>
                    <div className="meta">5 minutes a day</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUE CARDS */}
        <section className="section" data-screen-label="Why parents">
          <div className="wrap">
            <SectionHead
              eyebrow="Why parents choose it"
              tone="peach"
              title="Movement they feel. Skills they keep."
            />
            <div className="steps">
              {PARENT_VALUE.map((v, i) => (
                <div key={v.title} className={`step reveal d${i + 1}`} style={{ gridColumn: 'span 1' }}>
                  <div className="step-icon">{v.icon}</div>
                  <div className="step-title">{v.title}</div>
                  <p className="step-text">{v.text}</p>
                </div>
              ))}
              <div
                className="step reveal d4"
                style={{ background: 'var(--lavender-50)', borderColor: 'var(--lavender-200)' }}
              >
                <div className="step-icon">{'\u{1F3A8}'}</div>
                <div className="step-title">Joyful, not loud</div>
                <p className="step-text">
                  Calm visuals, gentle rewards, two sparkles, never the slot-machine energy of typical kids{'’'} apps.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVITIES + REAL-KID MOMENT */}
        <section className="section section-tint" data-screen-label="Parent activities">
          <div className="wrap">
            <SectionHead
              eyebrow="Eight ways to play"
              tone="mint"
              title="One gesture. <span class='grad'>Eight adventures.</span>"
              lead="From bubble-popping warm-ups to spelling stars, your child learns the movement once, then explores it all."
            />
            <ActivityGrid />
            <div className="reveal" style={{ marginTop: 56 }}>
              <div className="demo-strip">
                <div>
                  <div className="eyebrow is-peach">
                    <span className="dot" />A real session
                  </div>
                  <h3 className="h3" style={{ marginTop: 14 }}>
                    Five minutes, one big smile.
                  </h3>
                  <p className="lead" style={{ marginTop: 12 }}>
                    A short clip from an actual living room. No script, no edit, just a kid playing.
                  </p>
                </div>
                <div className="demo-frame">
                  <video
                    poster="/landing-videos/real-kid-1.jpg"
                    autoPlay muted loop playsInline preload="metadata"
                  >
                    <source src="/landing-videos/real-kid-1.webm" type="video/webm" />
                    <source src="/landing-videos/real-kid-1.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRIVACY */}
        <section className="section" data-screen-label="Privacy">
          <div className="wrap">
            <div className="split">
              <div className="split-media reveal">
                <div className="photo">
                  <img src="/landing-assets/privacy-camera.jpg" alt="A laptop webcam, used only for hand tracking" />
                </div>
              </div>
              <div className="reveal d1">
                <div className="eyebrow is-mint">
                  <span className="dot" />Safe by design
                </div>
                <h2 className="h2" style={{ marginTop: 16 }}>The camera sees hand position. Nothing else.</h2>
                <p className="lead" style={{ marginTop: 16 }}>
                  No video, no audio, and no images are ever stored or sent anywhere. The frame is processed inside the browser tab and discarded, many times a second.
                </p>
                <div className="bullets">
                  {[
                    'No images, video or biometrics stored',
                    'Processed on-device, then discarded',
                    'GDPR compliant, UK child-privacy ready',
                    'Works with no server connection once loaded',
                  ].map((b) => (
                    <div className="bullet" key={b}>
                      <span className="check">{'✓'}</span>
                      <span className="txt">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PARENT FAQ */}
        <section className="section section-tint" data-screen-label="Parent FAQ">
          <div className="wrap">
            <SectionHead eyebrow="Frequently asked" title="What parents want to know." />
            <FAQList items={PARENT_FAQ} />
          </div>
        </section>

        {/* CTA */}
        <section className="section" data-screen-label="Parent CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">Give it five minutes today.</h2>
              <p className="lead">
                Open it on your laptop, wave to start, and watch your child draw their first letter in the air.
              </p>
              <div className="cta-actions">
                <Link to="/parent/signup" className="btn btn-secondary lg">Start free trial</Link>
              </div>
            </div>
          </div>
        </section>

      </div>
      <CalmFooter />
    </div>
  );
}
