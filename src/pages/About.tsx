/**
 * /about — original structure (hero, mission split, values, quote, CTA),
 * reskinned in the Stanley `.lp6` style with the shared chrome.
 */

import { useEffect, useRef } from 'react';
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
        <div className="wrap herogrid">
          <div>
            <span className="label">Our story</span>
            <h1 className="h1" style={{ margin: '16px 0 18px' }}>Learning was always <span className="mark">meant to move.</span></h1>
            <p className="lead" style={{ marginBottom: 24 }}>We built Draw in the Air because young children learn through their bodies, not their wrists. A webcam and a hand are all it takes to turn a screen into a space for real, physical, joyful learning.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('about_hero', '/parent/signup')}>Try it free <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('about_hero_schools', '/teachers')}>For schools</button>
            </div>
          </div>
          <div className="heroshot reveal">
            <div className="center">
              <img className="ico" src="/landing-assets/icons/globe.png" alt="A globe with an orbiting ring" onError={hideOnError} style={{ animation: 'lp6float 8s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section data-screen-label="Mission">
        <div className="wrap feat">
          <div className="art reveal">
            <div className="shot">
              <img src="/landing-assets/child-at-laptop.jpg" alt="A child learning at a laptop using hand movement" onError={hideOnError} />
            </div>
          </div>
          <div className="txt reveal d1">
            <span className="label">Why we exist</span>
            <h2 className="h2" style={{ margin: '14px 0 16px' }}>Screen time that <span className="mark">earns its place.</span></h2>
            <p className="lead" style={{ marginBottom: 14 }}>Parents and teachers should not have to choose between a screen and an active child. By making movement the entire input, every minute in front of the camera is a minute of whole-arm letter formation, counting, and creative play.</p>
            <p className="lead">We keep the technology invisible. No accounts for children, no downloads, and no video leaving the device. Just a hand in the air and a canvas of light.</p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section data-screen-label="Values">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>What we believe</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>Four principles, every screen.</h2>
          <div className="grid4" style={{ marginTop: 40 }}>
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
          <img src="/landing-assets/icons/star-smile.png" alt="" onError={hideOnError} style={{ width: 64, margin: '0 auto 20px', display: 'block' }} />
          <h3 className="h3">{'“'}The best early-years tool is not the one that holds a child still. It is the one that gets them moving.{'”'}</h3>
          <p className="lead" style={{ margin: '16px auto 0' }}>Draw in the Air, founding principle. A product of MotionPlay Labs and a GESS Education Awards 2026 finalist.</p>
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="About CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Come and move with us.</h2>
            <p>Families start with a 7-day free trial. Schools start a free pilot. Either way, you are a minute from the first stroke.</p>
            <div className="herocta" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={go('about_final', '/parent/signup')}>Try free now <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('about_final_teachers', '/teachers')}>Book a school demo</button>
            </div>
          </div>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
};

export default About;
