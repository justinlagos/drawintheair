/**
 * /about. Calm-direction about page.
 *
 * Sections:
 *   1. Hero ("Learning was always meant to move.") + globe icon
 *   2. Mission split (child-at-laptop.jpg + 2 paragraphs)
 *   3. Values grid, 4 cards (Movement first, Private by default,
 *      For every classroom, Real early learning)
 *   4. About quote ("The best early-years tool is not the one that
 *      holds a child still. It is the one that gets them moving.")
 *   5. About CTA banner
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalmFooter, GestureTrail, SectionHead,
} from './Landing';
import { HeaderNav } from '../components/landing/HeaderNav';
import '../components/landing/landing-calm.css';

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true">
      <path d="M6 4l13 8-13 8V4z" />
    </svg>
  );
}
function ArrowIcon({ size = 17 }: { size?: number }) {
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
    // Reveal content that mounts after initial load, never gate
    // visibility of new DOM on a scroll event.
    const mo = new MutationObserver(onScroll);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(r1);
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
      mo.disconnect();
    };
  }, [rootRef]);
}

const ABOUT_VALUES = [
  { img: '/landing-assets/icons/hand.png',       title: 'Movement first',     text: 'The hand is the whole interaction. Children learn with their bodies, the way they were built to.' },
  { img: '/landing-assets/icons/shield.png',     title: 'Private by default', text: 'The camera frame is processed in the browser and discarded. Nothing is stored or sent anywhere.' },
  { img: '/landing-assets/icons/globe.png',      title: 'For every classroom', text: 'Browser-based and EYFS-aligned, so it works on the laptops schools already have.' },
  { img: '/landing-assets/icons/books-star.png', title: 'Real early learning', text: 'Built on early-years pedagogy, not gimmicks. Letters, numbers, shapes and creativity.' },
];

const About: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className="lp-shell">
      <GestureTrail />
      <HeaderNav />
      <div className="page" data-screen-label="About">

        {/* HERO */}
        <section
          className="hero"
          data-screen-label="About hero"
          style={{ paddingBottom: 'clamp(40px,5vw,72px)' }}
        >
          <div className="hero-orb" />
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <div className="eyebrow reveal">
                  <span className="dot" />Our story
                </div>
                <h1 className="h1 reveal d1">
                  Learning was always <span className="grad">meant to move.</span>
                </h1>
                <p className="lead reveal d2">
                  We built Draw in the Air because young children learn through their bodies, not their wrists. A webcam and a hand are all it takes to turn a screen into a space for real, physical, joyful learning.
                </p>
                <div className="hero-actions reveal d3">
                  <Link to="/parent/signup" className="btn btn-primary hero-cta lg">
                    <PlayIcon /> Try it free
                  </Link>
                  <Link to="/teachers" className="btn btn-secondary lg">For schools</Link>
                </div>
              </div>
              <div className="hero-visual reveal d2" style={{ display: 'grid', placeItems: 'center' }}>
                <img
                  className="icon3d float"
                  src="/landing-assets/icons/globe.png"
                  alt="A globe with an orbiting ring"
                  style={{ width: 'min(80%, 380px)' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="section" data-screen-label="Mission">
          <div className="wrap">
            <div className="split">
              <div className="split-media reveal">
                <div className="photo">
                  <img src="/landing-assets/child-at-laptop.jpg" alt="A child learning at a laptop using hand movement" />
                </div>
              </div>
              <div className="reveal d1">
                <div className="eyebrow is-peach"><span className="dot" />Why we exist</div>
                <h2 className="h2" style={{ marginTop: 16 }}>Screen time that earns its place.</h2>
                <p className="lead" style={{ marginTop: 16 }}>
                  Parents and teachers should not have to choose between a screen and an active child. By making movement the entire input, every minute in front of the camera is a minute of whole-arm letter formation, counting, and creative play.
                </p>
                <p className="lead" style={{ marginTop: 14 }}>
                  We keep the technology invisible. No accounts for children, no downloads, and no data leaving the device. Just a hand in the air and a canvas of light.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="section section-tint" data-screen-label="Values">
          <div className="wrap">
            <SectionHead eyebrow="What we believe" tone="mint" title="Four principles, every screen." />
            <div className="vcards">
              {ABOUT_VALUES.map((v, i) => (
                <div key={v.title} className={`vcard reveal d${i + 1}`}>
                  <img src={v.img} alt="" />
                  <h4>{v.title}</h4>
                  <p>{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUOTE */}
        <section className="section" data-screen-label="About quote">
          <div className="wrap-content center reveal">
            <img
              className="icon3d"
              src="/landing-assets/icons/star-smile.png"
              alt=""
              style={{ width: 64, margin: '0 auto 22px' }}
            />
            <p
              className="quote"
              style={{ fontSize: 'clamp(24px,3.2vw,38px)', lineHeight: 1.3, color: 'var(--ink-900)' }}
            >
              {'“'}The best early-years tool is not the one that holds a child still. It is the one that gets them moving.{'”'}
            </p>
            <div className="pill-note" style={{ marginTop: 20, justifyContent: 'center' }}>
              Draw in the Air, founding principle
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section section-stage" data-screen-label="About CTA">
          <div className="wrap">
            <div className="cta-banner reveal">
              <h2 className="h2">Come and move with us.</h2>
              <p className="lead">
                Families start with a 7-day free trial. Schools start a free pilot. Either way, you are a minute from the first stroke.
              </p>
              <div className="cta-actions">
                <Link to="/parent/signup" className="btn btn-secondary lg">Try free now</Link>
                <Link to="/teachers" className="btn btn-ghost lg" style={{ color: 'inherit' }}>
                  Book a school demo <ArrowIcon size={17} />
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

export default About;
