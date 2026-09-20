/**
 * /parents — public marketing page for families.
 *
 * Structure is the original marketing page (hero split, why-parents value
 * cards, eight-activity band + real-session clip, privacy split, FAQ, CTA).
 * Only the visual design is changed: Stanley `.lp6` style + shared chrome.
 * The authenticated parent area at /parent/* is untouched.
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
  Lp6Nav, Lp6Footer, Lp6GestureTrail, Lp6Faq, useLp6Reveal, ArrowIcon, ShieldIcon, hideOnError,
} from '../../components/landing/Lp6Chrome';
import '../landing-redesign.css';

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

const PARENT_VALUE = [
  { icon: '\u{1F9E0}', title: 'Real skill, real movement', text: 'Whole-arm letter formation and counting build the fine-motor control that touchscreens skip.' },
  { icon: '\u{1F512}', title: 'Private by design',         text: 'The camera frame never leaves the browser. Nothing is recorded, stored, or sent anywhere.' },
  { icon: '\u{26A1}',  title: 'Ready in a minute',         text: 'Open the page, allow the camera, wave to start. No app store, no setup.' },
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
      <video ref={vref} muted loop playsInline preload="none" poster={`/landing-videos/${slug}.jpg`}>
        <source src={`/landing-videos/${slug}.webm`} type="video/webm" />
        <source src={`/landing-videos/${slug}.mp4`} type="video/mp4" />
      </video>
      <span>{label}</span>
    </button>
  );
}

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
        <div className="wrap herogrid">
          <div>
            <span className="label">For parents · 7-day free trial</span>
            <h1 className="h1" style={{ margin: '16px 0 18px' }}>Learning they{'’'}ll <span className="mark">ask to do again.</span></h1>
            <p className="lead" style={{ marginBottom: 24 }}>Draw in the Air is the screen time you do not have to feel guilty about. Your child stands up, moves, and practises letters, numbers and creativity, using nothing but their hands.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('parents_hero', '/parent/signup')}>Start free trial <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('parents_hero_pricing', '/pricing')}>See pricing</button>
            </div>
            <div className="trust" style={{ marginTop: 20 }}>
              <span className="chip"><ShieldIcon /> Camera stays on device</span>
              <span className="chip">7 days free</span>
              <span className="chip">Ages 3 to 7</span>
            </div>
          </div>
          <div className="heroshot reveal">
            <div className="photo">
              <img src="/landing-assets/parent-child-screen.jpg" alt="A parent and child playing Draw in the Air together" onError={hideOnError} />
            </div>
            <div className="floatcard f1"><span className="fi" aria-hidden="true">{'⭐'}</span><div><div className="ft">980 points today</div><div className="fm">letter A mastered</div></div></div>
            <div className="floatcard f2"><span className="fi" aria-hidden="true">{'\u{1F525}'}</span><div><div className="ft">7-day streak</div><div className="fm">5 minutes a day</div></div></div>
          </div>
        </div>
      </section>

      {/* VALUE CARDS */}
      <section data-screen-label="Why parents">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Why parents choose it</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>Movement they feel. Skills they keep.</h2>
          <div className="grid4" style={{ marginTop: 40 }}>
            {PARENT_VALUE.map((v) => (
              <div className="vcard reveal" key={v.title}>
                <div className="vico" aria-hidden="true">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
            <div className="vcard reveal">
              <div className="vico" aria-hidden="true">{'\u{1F3A8}'}</div>
              <h3>Joyful, not loud</h3>
              <p>Calm visuals, gentle rewards, two sparkles, never the slot-machine energy of typical kids{'’'} apps.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVITIES + REAL-KID MOMENT */}
      <section data-screen-label="Parent activities">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Eight ways to play</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>One gesture. <span className="mark">Eight adventures.</span></h2>
          <p className="seclead">From bubble-popping warm-ups to spelling stars, your child learns the movement once, then explores it all.</p>
          <div className="tiles">
            {GAMES.map((g) => <Tile key={g.id} label={g.label} slug={g.slug} onOpen={go('parents_activities', '/play')} />)}
          </div>
          <div className="demostrip reveal">
            <div>
              <span className="label">A real session</span>
              <h3 className="h3" style={{ margin: '12px 0 10px' }}>Five minutes, one big smile.</h3>
              <p className="lead">A short clip from an actual living room. No script, no edit, just a kid playing.</p>
            </div>
            <div className="frame">
              <video autoPlay muted loop playsInline poster="/landing-videos/real-kid-1.jpg">
                <source src="/landing-videos/real-kid-1.webm" type="video/webm" />
                <source src="/landing-videos/real-kid-1.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section data-screen-label="Privacy">
        <div className="wrap feat">
          <div className="art reveal">
            <div className="shot">
              <img src="/landing-assets/privacy-camera.jpg" alt="A laptop webcam, used only for hand tracking" onError={hideOnError} />
            </div>
          </div>
          <div className="txt reveal d1">
            <span className="label">Safe by design</span>
            <h2 className="h2" style={{ margin: '14px 0 16px' }}>The camera sees hand position. <span className="mark">Nothing else.</span></h2>
            <p className="lead" style={{ marginBottom: 20 }}>No video, no audio, and no images are ever stored or sent anywhere. The frame is processed inside the browser tab and discarded, many times a second.</p>
            <div className="bullets">
              <div className="b">No images, video or biometrics stored</div>
              <div className="b">Processed on-device, then discarded</div>
              <div className="b">GDPR compliant, UK child-privacy ready</div>
              <div className="b">Works with no server connection once loaded</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="Parent FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>What parents want to know.</h2>
          <Lp6Faq items={PARENT_FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="Parent CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Give it five minutes today.</h2>
            <p>Open it on your laptop, wave to start, and watch your child draw their first letter in the air.</p>
            <div className="herocta" style={{ justifyContent: 'center' }}>
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
