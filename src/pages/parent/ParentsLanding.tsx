/**
 * /parents — public marketing page for families (lp6 redesign, Sept 2026).
 *
 * Conversion-first: one primary action (start the free trial) repeated, with a
 * zero-friction "try it free, no sign-up" secondary that routes to /play. The
 * authenticated parent area at /parent/* is untouched.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEOMeta } from '../../seo/SEOMeta';
import {
  PAGE_META,
  buildOrganizationSchema, buildSoftwareAppSchema, buildFAQSchema, buildBreadcrumbSchema,
} from '../../seo/seo-config';
import { trackMeta } from '../../lib/observability';
import { logEvent } from '../../lib/analytics';
import {
  Lp6Nav, Lp6Footer, Lp6GestureTrail, Lp6Faq, useLp6Reveal, ArrowIcon, ShieldIcon,
} from '../../components/landing/Lp6Chrome';
import '../landing-redesign.css';

const PARENT_VALUE = [
  { icon: '\u{1F9E0}', title: 'Real skill, real movement', text: 'Whole-arm letter formation and counting build the fine-motor control that touchscreens skip.' },
  { icon: '\u{1F512}', title: 'Private by design',         text: 'The camera frame never leaves the browser. Nothing is recorded, stored, or sent anywhere.' },
  { icon: '\u{26A1}',  title: 'Ready in a minute',         text: 'Open the page, allow the camera, wave to start. No app store, no setup.' },
  { icon: '\u{1F9F8}', title: 'They ask to do it again',   text: 'It is play first. The learning rides along inside activities children choose for themselves.' },
];

const PARENT_FAQ = [
  { q: 'Is Draw in the Air safe for my child?', a: "Yes. The webcam feed is processed locally in the browser using Google's MediaPipe AI. No video is ever recorded, stored, or transmitted to any server, and no accounts are required for your child. It is technically impossible for us to access your child's camera feed." },
  { q: 'What age is it for?',                 a: 'Draw in the Air is designed for children aged 3 to 7, spanning preschool letter and number tracing through early primary games. The pinch-to-draw gesture is simple enough for a 3-year-old and engaging enough for a 7-year-old.' },
  { q: 'Will it work on our family laptop?', a: 'Almost certainly. Any laptop from the last five years with a webcam and Chrome, Edge, or Safari 15+ works. It runs best on a laptop or desktop; most tablets work through the front camera, though a computer gives the most room to move. No app to install.' },
  { q: 'How long should a session be?',      a: 'Most children play for five to ten minutes at a time. It is active and physical, so it is naturally self-limiting. The average session is around seven minutes.' },
  { q: 'How much does it cost?',             a: 'Every account starts with a 7-day free trial, up to 2 learners. Core activities are always free to play; the Family plan unlocks the full library, progress reports and parental controls, and you can cancel anytime.' },
  { q: 'Do I need to sit with my child?',    a: 'For the first session, yes, to help with the camera and the wave-to-start. After that most children aged 5+ can open an activity and play independently.' },
  { q: 'Can it replace pencil practice?',    a: 'It is designed to complement, not replace, pencil and paper. The kinesthetic movements are similar and build the motor pattern, but paper practice remains important for the specific grip and pressure of writing. Use both.' },
];

const PARENTS_STRUCTURED_DATA = [
  buildOrganizationSchema(),
  buildSoftwareAppSchema(),
  buildFAQSchema(PARENT_FAQ),
  buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Families', path: '/parents' }]),
];

export default function ParentsLandingV2() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLp6Reveal(rootRef);

  useEffect(() => {
    logEvent('landing_view', { meta: { page: 'parents' } });
    trackMeta('ViewContent', { content_name: 'parents' });
  }, []);

  const go = (source: string, dest: string) => () => {
    logEvent('cta_click', { meta: { source, dest } });
    navigate(dest);
  };

  return (
    <div ref={rootRef} className="lp6">
      <SEOMeta
        title={PAGE_META.parents.title}
        description={PAGE_META.parents.description}
        keywords={PAGE_META.parents.keywords}
        canonical="/parents"
        structuredData={PARENTS_STRUCTURED_DATA}
      />
      <Lp6GestureTrail />
      <Lp6Nav active="parents" />

      {/* HERO */}
      <section className="hero sub" data-screen-label="Parents hero">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center' }}>For families</span>
          <h1 className="h1" style={{ marginTop: 16 }}>Screen time that <span className="mark">gives something back.</span></h1>
          <p className="lead" style={{ margin: '18px auto 26px' }}>Your child moves, draws and counts in the air. It builds the real fine-motor skills that writing needs, and they think it is a game. Ages 3 to 7.</p>
          <div className="herocta">
            <button type="button" className="btn" onClick={go('parents_hero', '/parent/signup')}>Start your 7-day free trial <ArrowIcon /></button>
            <button type="button" className="btn ghost" onClick={go('parents_hero_try', '/play')}>Try it free, no sign-up</button>
          </div>
          <div className="trust" style={{ marginTop: 20 }}>
            <span className="chip"><ShieldIcon /> Webcam stays on your device</span>
            <span className="chip">7 days free, cancel anytime</span>
            <span className="chip">No child accounts</span>
          </div>
          <div className="statcards">
            <div className="statcard"><b>3&ndash;7</b><span>Ages it is built for</span></div>
            <div className="statcard"><b>5&ndash;10 min</b><span>A natural session</span></div>
            <div className="statcard"><b>EYFS</b><span>Curriculum aligned</span></div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section data-screen-label="Why parents">
        <div className="wrap">
          <h2 className="h2" style={{ textAlign: 'center', maxWidth: '16ch', margin: '0 auto 40px' }}>Why families keep it open.</h2>
          <div className="grid4">
            {PARENT_VALUE.map((v) => (
              <div className="vcard reveal" key={v.title}>
                <div className="vico" aria-hidden="true">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEE IT MOVE */}
      <section data-screen-label="See it move">
        <div className="wrap feat">
          <div className="txt reveal">
            <span className="label">See it move</span>
            <h2 className="h2" style={{ margin: '14px 0 18px' }}>Real gameplay, <span className="mark">no edits.</span></h2>
            <p className="lead" style={{ marginBottom: 20 }}>Every stroke is a hand in the air. Children paint, trace letters and pop numbers by moving, then watch it come alive on screen.</p>
            <div className="bullets">
              <div className="b">Whole-arm movement, the way early writing is really built</div>
              <div className="b">Eight activities across literacy, maths and creativity</div>
              <div className="b">Works on the laptop you already own</div>
            </div>
            <button type="button" className="btn" onClick={go('parents_seemove', '/play')}>Try it with your child <ArrowIcon /></button>
          </div>
          <div className="art reveal d1">
            <div className="shot">
              <video autoPlay muted loop playsInline poster="/landing-videos/free-paint.jpg">
                <source src="/landing-videos/free-paint.webm" type="video/webm" />
                <source src="/landing-videos/free-paint.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section data-screen-label="Privacy">
        <div className="wrap">
          <div className="privacy reveal">
            <div>
              <span className="label">Private by design</span>
              <h2 className="h2">The camera never leaves your laptop.</h2>
              <p>It is technically impossible for us to see your child. The webcam is read on your device to track a hand, then each frame is thrown away.</p>
            </div>
            <div className="plist">
              <div className="prow"><span className="tick">&#10003;</span><div><b>Frames never leave the browser</b><small>Hand tracking runs on your device with Google MediaPipe.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>No video or photos are stored</b><small>Nothing is recorded, uploaded or saved. There is no footage to keep.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>No account for your child</b><small>Core activities start with a wave. No name, no email, no login.</small></div></div>
              <div className="prow"><span className="tick">&#10003;</span><div><b>Built around UK GDPR</b><small>Data minimised by default, with clear deletion pathways.</small></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="Parent FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>The questions parents ask first.</h2>
          <Lp6Faq items={PARENT_FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="Parents CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Give them movement, not another screen to swipe.</h2>
            <p>Start your 7-day free trial. Up to 2 learners, the full library, cancel anytime.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('parents_final', '/parent/signup')}>Start free trial <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('parents_final_try', '/play')}>Try it free first</button>
            </div>
          </div>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
}
