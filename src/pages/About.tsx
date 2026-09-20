/**
 * /about — lp6 redesign, Sept 2026. Mission, values and a clear next step.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEOMeta } from '../seo/SEOMeta';
import { buildOrganizationSchema, buildSoftwareAppSchema } from '../seo/seo-config';
import { logEvent } from '../lib/analytics';
import {
  Lp6Nav, Lp6Footer, Lp6GestureTrail, useLp6Reveal, ArrowIcon, hideOnError,
} from '../components/landing/Lp6Chrome';
import '../pages/landing-redesign.css';

const ABOUT_VALUES = [
  { img: '/landing-assets/icons/hand.png',       title: 'Movement first',      text: 'The hand is the whole interaction. Children learn with their bodies, the way they were built to.' },
  { img: '/landing-assets/icons/shield.png',     title: 'Private by default',  text: 'The camera frame is processed in the browser and discarded. Video is never stored or sent anywhere.' },
  { img: '/landing-assets/icons/globe.png',      title: 'For every classroom', text: 'Browser-based and EYFS-aligned, so it works on the laptops schools already have.' },
  { img: '/landing-assets/icons/books-star.png', title: 'Real early learning', text: 'Built on early-years pedagogy, not gimmicks. Letters, numbers, shapes and creativity.' },
];

const About: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLp6Reveal(rootRef);

  useEffect(() => { logEvent('landing_view', { meta: { page: 'about' } }); }, []);

  const go = (source: string, dest: string) => () => {
    logEvent('cta_click', { meta: { source, dest } });
    navigate(dest);
  };

  return (
    <div ref={rootRef} className="lp6">
      <SEOMeta
        title="About Draw in the Air | Movement-first early learning"
        description="Draw in the Air turns any webcam into an active learning tool for children aged 3 to 7. Our mission: get young children moving again, learning letters, numbers and shapes with their whole bodies. Private by design, EYFS aligned."
        keywords={['about draw in the air', 'movement learning', 'EYFS', 'webcam learning', 'MotionPlay Labs']}
        canonical="/about"
        structuredData={[buildOrganizationSchema(), buildSoftwareAppSchema()]}
      />
      <Lp6GestureTrail />
      <Lp6Nav active="about" />

      {/* HERO */}
      <section className="hero sub" data-screen-label="About hero">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center' }}>Our story</span>
          <h1 className="h1" style={{ marginTop: 16 }}>Learning was always meant to <span className="mark">move.</span></h1>
          <p className="lead" style={{ margin: '18px auto 26px' }}>We trained a generation of children to sit still and tap glass. Draw in the Air is our answer: a webcam, a hand, and early learning that happens through movement.</p>
          <div className="herocta">
            <button type="button" className="btn" onClick={go('about_hero', '/play')}>Try it free <ArrowIcon /></button>
            <button type="button" className="btn ghost" onClick={go('about_hero_schools', '/teachers')}>For schools</button>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section data-screen-label="Mission">
        <div className="wrap lede-split">
          <div className="photo reveal">
            <img src="/landing-assets/child-at-laptop.jpg" alt="A child learning at a laptop using hand movements" onError={hideOnError} />
          </div>
          <div className="reveal d1">
            <span className="label">Why we built it</span>
            <h2 className="h2" style={{ margin: '14px 0 18px' }}>Screens took the movement out of early learning.</h2>
            <p className="lead" style={{ marginBottom: 16 }}>Three to seven year-olds build fine-motor control, letter formation and confidence through big, whole-arm movement. A touchscreen only asks for a wrist. We wanted the whole child in the letter.</p>
            <p className="lead">So we used the camera every laptop already has, and MediaPipe hand tracking that runs entirely on the device, to turn movement itself into the input. No new hardware. No footage leaving the room.</p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section data-screen-label="About values">
        <div className="wrap">
          <h2 className="h2" style={{ textAlign: 'center', maxWidth: '16ch', margin: '0 auto 40px' }}>Four principles, every screen.</h2>
          <div className="grid4">
            {ABOUT_VALUES.map((v) => (
              <div className="vcard reveal" key={v.title}>
                <img className="vico" src={v.img} alt="" onError={hideOnError} />
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section data-screen-label="About quote">
        <div className="wrap quoteband reveal">
          <h3 className="h3">"The best early-years tool is not the one that holds a child still. It is the one that gets them moving."</h3>
          <p className="lead" style={{ margin: '16px auto 0' }}>A product of MotionPlay Labs, built with a UK primary school and a GESS Education Awards 2026 finalist.</p>
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="About CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">See it for yourself in about a minute.</h2>
            <p>Open it on a laptop, wave at the camera, and watch them start to move.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('about_final', '/play')}>Try it free now <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('about_final_teachers', '/teachers')}>Start a school pilot</button>
            </div>
          </div>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
};

export default About;
