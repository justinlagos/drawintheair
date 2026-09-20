/**
 * /teachers — public marketing page for schools and teachers (lp6 redesign).
 *
 * Conversion-first: the single ask is "start a free pilot" (/teacher/signup),
 * repeated at hero, after the pilot steps, and in the closing band. Carries the
 * #eyfs-mapping anchor the footer deep-links to.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEOMeta } from '../seo/SEOMeta';
import {
  PAGE_META,
  buildOrganizationSchema, buildSoftwareAppSchema, buildFAQSchema, buildBreadcrumbSchema,
} from '../seo/seo-config';
import { logEvent } from '../lib/analytics';
import {
  Lp6Nav, Lp6Footer, Lp6GestureTrail, Lp6Faq, useLp6Reveal, ArrowIcon, LaptopIcon,
} from '../components/landing/Lp6Chrome';
import '../pages/landing-redesign.css';

const TEACHER_VALUE = [
  { icon: '\u{1F5C2}\u{FE0F}', title: 'EYFS-mapped',             text: 'Activities tagged across communication, language, mathematics and expressive arts.' },
  { icon: '\u{1F5A5}\u{FE0F}', title: 'One device, whole class', text: 'A single laptop, webcam and projector. The class moves together, no logins for children.' },
  { icon: '\u{1F4CA}',          title: 'Quiet analytics',         text: 'Usage by week, sessions per child, average engagement. Plain English, no dashboards to babysit.' },
];

const PILOT_STEPS = [
  { num: '1', title: 'Book a 20-minute call', text: 'We learn your setup and year group, and answer your safeguarding questions.' },
  { num: '2', title: 'We set up session one', text: 'We join your first classroom session live and calibrate the room with you.' },
  { num: '3', title: 'You run it solo',        text: 'Most teachers are independent by week two. We stay one message away.' },
];

const TEACHER_FAQ = [
  { q: 'Do children need accounts?',         a: 'No. Children never log in. You open the activity on the class device, pupils join the movement, not a system. Teacher accounts exist only for analytics and classroom mode.' },
  { q: 'Does it work on school Chromebooks?', a: 'Yes. Draw in the Air is a browser-based web app and runs on Chrome on Chromebooks. It needs only camera access, which most school Chromebooks support. No installation or admin approval is needed on most school networks.' },
  { q: 'Can I use it on an interactive whiteboard?', a: 'Absolutely. Display it on your IWB through any connected laptop. The teacher can demonstrate a gesture to the whole class while pupils follow along, or the class can play together in classroom mode.' },
  { q: 'Is any student data collected?',     a: 'No faces, audio or video are ever collected, and the camera feed never leaves the device. A child joining a class session types a first name or nickname the teacher can see and delete. No child emails or contact details are collected. Usage analytics are pseudonymous, tied to a random browser id and never to a real child, aggregated for reporting, and auto-deleted after 365 days. The platform is designed around UK GDPR.' },
  { q: 'Which curriculum frameworks does it support?', a: 'Activities are mapped to the Early Years Foundation Stage (EYFS) in the UK and fit general pre-school and kindergarten readiness goals elsewhere. See the EYFS mapping section for the activity-by-activity breakdown.' },
  { q: 'What about our IT restrictions?',    a: 'It runs in the browser with no install. We provide a Chromebook setup guide and the exact domains to allow-list for your network team.' },
  { q: 'Can I embed it on our school website?', a: 'Yes. Visit drawintheair.com/embed for the free embed code and paste it into any school website or blog, great for homework pages or classroom portals.' },
  { q: 'Is there a cost to pilot?',          a: 'The pilot is free, and every activity is available in Class Mode sessions during the pilot. School licences are agreed with the school after the pilot.' },
];

const FRAMEWORKS = [
  {
    framework: 'EYFS (UK)',
    areas: [
      'Communication, Language and Literacy',
      'Physical Development, Fine Motor Skills',
      'Mathematics, Numbers and Shape',
      'Understanding the World, Technology',
    ],
  },
  {
    framework: 'General Pre-K',
    areas: [
      'Alphabet knowledge A to Z',
      'Numeral formation 1 to 10',
      'Basic shape recognition',
      'Hand-eye coordination development',
    ],
  },
] as const;

const EYFS_ACTIVITY_MAP = [
  { activity: 'Letter Tracing (A to Z)', area: 'Literacy, Physical Development', goal: 'Letter formation and pre-writing movement patterns' },
  { activity: 'Number Tracing (1 to 10)', area: 'Mathematics', goal: 'Numeral formation and number recognition' },
  { activity: 'Shape Tracing', area: 'Mathematics, Shape and Space', goal: 'Shape recognition and controlled mark-making' },
  { activity: 'Bubble Pop', area: 'Physical Development, Gross Motor', goal: 'Hand-eye coordination, crossing the midline' },
  { activity: 'Sort and Place', area: 'Understanding the World, Mathematics', goal: 'Categorising, matching and early reasoning' },
  { activity: 'Free Paint', area: 'Expressive Arts and Design', goal: 'Creative expression through movement' },
];

const TEACHERS_STRUCTURED_DATA = [
  buildOrganizationSchema(),
  buildSoftwareAppSchema(),
  buildFAQSchema(TEACHER_FAQ),
  buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'For Teachers', path: '/teachers' }]),
];

export const Teachers: React.FC = () => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useLp6Reveal(rootRef);

  useEffect(() => { logEvent('landing_view', { meta: { page: 'teachers' } }); }, []);

  // Honour deep links like /teachers#eyfs-mapping (footer link).
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, []);

  const go = (source: string, dest: string) => () => {
    logEvent('cta_click', { meta: { source, dest } });
    navigate(dest);
  };

  return (
    <div ref={rootRef} className="lp6">
      <SEOMeta
        title={PAGE_META.teachers.title}
        description={PAGE_META.teachers.description}
        keywords={PAGE_META.teachers.keywords}
        canonical="/teachers"
        structuredData={TEACHERS_STRUCTURED_DATA}
      />
      <Lp6GestureTrail />
      <Lp6Nav active="teachers" />

      {/* HERO */}
      <section className="hero sub" data-screen-label="Teachers hero">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center' }}>For schools and teachers</span>
          <h1 className="h1" style={{ marginTop: 16 }}>Whole-class movement, <span className="mark aqua">zero setup.</span></h1>
          <p className="lead" style={{ margin: '18px auto 26px' }}>One laptop, one webcam, one projector, and the whole class is moving. No child logins, no installs, and it runs on the Chromebooks you already have.</p>
          <div className="herocta">
            <button type="button" className="btn" onClick={go('teachers_hero', '/teacher/signup')}>Start a free pilot <ArrowIcon /></button>
            <button type="button" className="btn ghost" onClick={go('teachers_hero_eyfs', '/teachers#eyfs-mapping')}>See the EYFS mapping</button>
          </div>
          <div className="trust" style={{ marginTop: 20 }}>
            <span className="chip">No child logins</span>
            <span className="chip"><LaptopIcon /> Works on Chromebooks</span>
            <span className="chip">Free to pilot</span>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section data-screen-label="Teacher value">
        <div className="wrap">
          <h2 className="h2" style={{ textAlign: 'center', maxWidth: '18ch', margin: '0 auto 40px' }}>Built for a real classroom.</h2>
          <div className="grid3">
            {TEACHER_VALUE.map((v) => (
              <div className="vcard reveal" key={v.title}>
                <div className="vico" aria-hidden="true">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLASSROOM MODE */}
      <section data-screen-label="Classroom mode">
        <div className="wrap feat flip">
          <div className="txt reveal">
            <span className="label">Classroom mode</span>
            <h2 className="h2" style={{ margin: '14px 0 18px' }}>You lead. The room <span className="mark aqua">follows.</span></h2>
            <p className="lead" style={{ marginBottom: 20 }}>Start a class, share the code on the board, and every child joins from their own screen. Choose the activity, pause the room, and move everyone on together.</p>
            <div className="bullets">
              <div className="b">Children join with a code, never an account</div>
              <div className="b">Assign, pause and progress the whole class in a tap</div>
              <div className="b">Quiet, pseudonymous analytics, auto-deleted after a year</div>
            </div>
            <button type="button" className="btn" onClick={go('teachers_classmode', '/teacher/signup')}>Start a free pilot <ArrowIcon /></button>
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

      {/* PILOT STEPS */}
      <section data-screen-label="Pilot steps">
        <div className="wrap">
          <h2 className="h2" style={{ textAlign: 'center', maxWidth: '16ch', margin: '0 auto 12px' }}>The pilot is free, and we set it up with you.</h2>
          <p className="lead" style={{ textAlign: 'center', margin: '0 auto 40px' }}>Three steps from first call to running it on your own.</p>
          <div className="steps">
            {PILOT_STEPS.map((s) => (
              <div className="stp reveal" key={s.num}>
                <div className="n">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 34 }}>
            <button type="button" className="btn" onClick={go('teachers_steps', '/teacher/signup')}>Book your pilot <ArrowIcon /></button>
          </div>
        </div>
      </section>

      {/* EYFS MAPPING (anchor target) */}
      <section id="eyfs-mapping" data-screen-label="EYFS mapping">
        <div className="wrap">
          <h2 className="h2" style={{ textAlign: 'center', maxWidth: '18ch', margin: '0 auto 12px' }}>Mapped to the curriculum you already teach.</h2>
          <p className="lead" style={{ textAlign: 'center', margin: '0 auto 36px' }}>Every activity ties to a clear learning intention, so it earns its place in the timetable.</p>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, margin: '0 auto 34px' }}>
            {FRAMEWORKS.map((f) => (
              <div className="vcard reveal" key={f.framework}>
                <h3 style={{ marginBottom: 12 }}>{f.framework}</h3>
                <div className="bullets" style={{ margin: 0 }}>
                  {f.areas.map((a) => <div className="b" key={a}>{a}</div>)}
                </div>
              </div>
            ))}
          </div>
          <div className="maptable">
            {EYFS_ACTIVITY_MAP.map((m) => (
              <div className="maprow reveal" key={m.activity}>
                <b>{m.activity}</b>
                <span className="area">{m.area}</span>
                <span>{m.goal}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="Teacher FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>The questions teachers ask first.</h2>
          <Lp6Faq items={TEACHER_FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="Teachers CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Give your class ten minutes of movement that counts.</h2>
            <p>The pilot is free. We calibrate your first session with you and stay one message away.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('teachers_final', '/teacher/signup')}>Start a free pilot <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('teachers_final_pricing', '/pricing')}>View school plans</button>
            </div>
          </div>
        </div>
      </section>

      <Lp6Footer />
    </div>
  );
};

export default Teachers;
