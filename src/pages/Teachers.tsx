/**
 * /teachers — public marketing page for schools and teachers.
 *
 * Structure is the original marketing page (hero with live leaderboard, value
 * cards + ready-guides, classroom-mode band, use cases, EYFS mapping with the
 * #eyfs-mapping anchor + PDF, safeguarding, pilot steps, FAQ, CTA). Only the
 * visual design changes: Stanley `.lp6` style + shared chrome.
 */

import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEOMeta } from '../seo/SEOMeta';
import {
  PAGE_META,
  buildOrganizationSchema, buildSoftwareAppSchema, buildFAQSchema, buildBreadcrumbSchema,
} from '../seo/seo-config';
import { logEvent } from '../lib/analytics';
import {
  Lp6Nav, Lp6Footer, Lp6GestureTrail, Lp6Faq, useLp6Reveal, ArrowIcon,
} from '../components/landing/Lp6Chrome';
import '../pages/landing-redesign.css';

const LEADERBOARD = [
  { m: '\u{1F947}', name: 'Amara', s: 980 },
  { m: '\u{1F948}', name: 'Jacob', s: 940 },
  { m: '\u{1F949}', name: 'Priya', s: 870 },
  { m: '4',          name: 'Leah',  s: 820 },
];

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

const USE_CASES = [
  { icon: '\u{1F4FA}', title: 'Interactive whiteboard demo', desc: 'Project Draw in the Air on your IWB and demonstrate letter formation to the whole class before individual practice.' },
  { icon: '\u{1F4BB}', title: 'Computer lab activity', desc: 'Set every computer to the Letter or Number Tracing page for a structured 10-minute finger-gym warm-up.' },
  { icon: '\u{1F3C3}', title: 'Brain break', desc: 'Use Bubble Pop for 5-minute movement breaks, physical activity without leaving their seats.' },
  { icon: '\u{1F3E0}', title: 'Homework extension', desc: 'Share the link with parents for at-home practice. No setup, just send the URL and the activity name.' },
  { icon: '\u{1F4D0}', title: 'Maths warm-up', desc: 'Number Tracing 1 to 10 and Shape Tracing as a daily maths warm-up for numeral formation and geometry.' },
  { icon: '\u{1F310}', title: 'Remote / hybrid', desc: 'Share your screen in Zoom or Meet to demonstrate. Pupils follow along on their own devices from home.' },
];

const FRAMEWORKS = [
  { framework: 'EYFS (UK)', areas: ['Communication, Language and Literacy', 'Physical Development, Fine Motor Skills', 'Mathematics, Numbers and Shape', 'Understanding the World, Technology'] },
  { framework: 'General Pre-K', areas: ['Alphabet knowledge A to Z', 'Numeral formation 1 to 10', 'Basic shape recognition', 'Hand-eye coordination development'] },
] as const;

const EYFS_ACTIVITY_MAP = [
  { activity: 'Letter Tracing (A to Z)', area: 'Literacy, Physical Development', goal: 'Letter formation and pre-writing movement patterns' },
  { activity: 'Number Tracing (1 to 10)', area: 'Mathematics', goal: 'Numeral formation and number recognition' },
  { activity: 'Shape Tracing', area: 'Mathematics, Shape and Space', goal: 'Shape recognition and controlled mark-making' },
  { activity: 'Bubble Pop', area: 'Physical Development, Gross Motor', goal: 'Hand-eye coordination, crossing the midline' },
  { activity: 'Sort and Place', area: 'Understanding the World, Mathematics', goal: 'Categorising, matching and early reasoning' },
  { activity: 'Free Paint', area: 'Expressive Arts and Design', goal: 'Creative expression through movement' },
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

const SAFEGUARDING = [
  { icon: '\u{1F3A5}', title: 'Camera stays on-device', desc: 'Hand tracking runs in the browser. No video is ever recorded, transmitted, or stored.' },
  { icon: '\u{1FAAA}', title: 'No child accounts', desc: 'Children never log in. They join with a short class code and a first name the teacher controls and can delete.' },
  { icon: '\u{1F6E1}\u{FE0F}', title: 'UK GDPR by design', desc: 'Event analytics are pseudonymous, aggregated for reporting, and auto-deleted after 365 days.' },
  { icon: '\u{1F50D}', title: 'Publicly auditable', desc: 'Our live transparency page shows exactly what we measure and what we do not claim.' },
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
    }, 140);
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
        <div className="wrap herogrid">
          <div>
            <span className="label">For teachers and schools</span>
            <h1 className="h1" style={{ margin: '16px 0 18px' }}>Whole-class movement, <span className="mark aqua">zero setup.</span></h1>
            <p className="lead" style={{ marginBottom: 24 }}>Run an EYFS-aligned movement break or literacy starter from one laptop and a webcam. No installs, no child accounts, no IT ticket. Open the URL, the class plays.</p>
            <div className="herocta">
              <button type="button" className="btn" onClick={go('teachers_hero', '/teacher/signup')}>Start a pilot <ArrowIcon /></button>
              <button type="button" className="btn ghost" onClick={go('teachers_hero_pricing', '/pricing')}>View school plans</button>
            </div>
            <div className="trust" style={{ marginTop: 20 }}>
              <span className="chip">EYFS aligned</span>
              <span className="chip">GDPR compliant</span>
              <span className="chip">No installs</span>
            </div>
          </div>
          <div className="heroshot reveal">
            <div className="photo">
              <img src="/landing-assets/classroom.jpg" alt="A teacher running Draw in the Air with a class" />
            </div>
            <div className="floatcard f1" style={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 168 }}>
              <div className="fm" style={{ textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Live · 28 active</div>
              {LEADERBOARD.slice(0, 3).map((r) => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 13, padding: '2px 0' }}>
                  <span style={{ fontWeight: 700 }}>{r.m} {r.name}</span>
                  <span style={{ fontWeight: 800, color: 'var(--plum)' }}>{r.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VALUE */}
      <section data-screen-label="Teacher value">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Built for the classroom</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>Less admin. More movement.</h2>
          <div className="grid4" style={{ marginTop: 40 }}>
            {TEACHER_VALUE.map((v) => (
              <div className="vcard reveal" key={v.title}>
                <div className="vico" aria-hidden="true">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
            <div className="vcard reveal">
              <div className="vico" aria-hidden="true">{'\u{1F4DA}'}</div>
              <h3>Ten ready guides</h3>
              <p>Quick-start, five-day movement plan, SEND inclusion, Chromebook setup. All printable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CLASSROOM MODE */}
      <section data-screen-label="Classroom mode">
        <div className="wrap">
          <div className="ink reveal">
            <div className="feat">
              <div className="txt">
                <span className="label">Classroom mode</span>
                <h2 className="h2" style={{ margin: '14px 0 16px' }}>Run your whole class at once.</h2>
                <p className="lead" style={{ marginBottom: 20 }}>A live class view shows energy in the room in real time. Start an activity, watch engagement, and print a session summary when you are done.</p>
                <div className="bullets">
                  <div className="b">Live class energy view</div>
                  <div className="b">A single shared device, no child logins</div>
                  <div className="b">Session analytics after every class</div>
                  <div className="b">Plain-English insights and suggestions</div>
                </div>
              </div>
              <div className="art">
                <div className="lb">
                  <div className="lbh"><span>Reception · Letter A</span><span style={{ color: 'var(--green)' }}>{'●'} 28 active</span></div>
                  {LEADERBOARD.map((r) => (
                    <div className="lbr" key={r.name}><span>{r.m} {r.name}</span><span className="sc">{r.s}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="demostrip" style={{ marginTop: 40 }}>
              <div>
                <span className="label">See it run</span>
                <h3 className="h3" style={{ color: '#fff', margin: '12px 0 10px' }}>Real gameplay from a class device.</h3>
                <p className="lead">Tracing, live, on the shared screen the whole room follows.</p>
              </div>
              <div className="frame">
                <video autoPlay muted loop playsInline poster="/landing-videos/tracing.jpg">
                  <source src="/landing-videos/tracing.webm" type="video/webm" />
                  <source src="/landing-videos/tracing.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section data-screen-label="Use cases">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>In the classroom</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>How teachers already use it.</h2>
          <p className="seclead">Six ways Draw in the Air slots into the school day you already run.</p>
          <div className="cardgrid">
            {USE_CASES.map((u) => (
              <div className="mcard reveal" key={u.title}>
                <div className="mi" aria-hidden="true">{u.icon}</div>
                <h3>{u.title}</h3>
                <p>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EYFS MAPPING (anchor) */}
      <section id="eyfs-mapping" data-screen-label="EYFS mapping">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Curriculum alignment</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>EYFS mapping and curriculum links.</h2>
          <p className="seclead">Every activity is designed to support early childhood curriculum objectives across multiple frameworks.</p>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900, margin: '0 auto 20px' }}>
            {FRAMEWORKS.map((f) => (
              <div className="vcard reveal" key={f.framework}>
                <h3 style={{ marginBottom: 12 }}>{f.framework}</h3>
                <div className="bullets" style={{ margin: 0 }}>{f.areas.map((a) => <div className="b" key={a}>{a}</div>)}</div>
              </div>
            ))}
          </div>
          <div className="maptable">
            {EYFS_ACTIVITY_MAP.map((m) => (
              <div className="maprow reveal" key={m.activity}>
                <b>{m.activity}</b><span className="area">{m.area}</span><span>{m.goal}</span>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--ink-soft)', fontSize: 15 }}>
            Want the full Development Matters mapping with a ready-to-run session plan?{' '}
            <a href="/classroom-guides/08-eyfs-reception-activity-guide.pdf" download style={{ color: 'var(--plum)', fontWeight: 700 }}>Download the EYFS &amp; Reception Activity Guide (PDF)</a>, free, no email required.
          </p>
        </div>
      </section>

      {/* SAFEGUARDING */}
      <section data-screen-label="Safeguarding">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Safe by design</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>Privacy your safeguarding lead will sign off.</h2>
          <p className="seclead">Built for classrooms first, which means child safety is the foundation, not a feature.</p>
          <div className="cardgrid">
            {SAFEGUARDING.map((p) => (
              <div className="mcard reveal" key={p.title}>
                <div className="mi" aria-hidden="true">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/transparency" className="link">Read our transparency report &rarr;</Link>
          </p>
        </div>
      </section>

      {/* PILOT */}
      <section data-screen-label="Pilot programme">
        <div className="wrap">
          <span className="label" style={{ justifyContent: 'center', display: 'flex' }}>Pilot programme</span>
          <h2 className="h2 sechead" style={{ marginTop: 12 }}>We set up session one with you.</h2>
          <p className="seclead">No procurement maze. Three light steps from first call to a class that runs it themselves.</p>
          <div className="grid4">
            {PILOT_STEPS.map((s) => (
              <div className="stp reveal" key={s.num}>
                <div className="n">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
            <div className="mcard accent2 reveal" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3>Ready to start?</h3>
              <p style={{ marginBottom: 14 }}>Book your pilot call this week.</p>
              <button type="button" className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={go('teachers_pilot_card', '/teacher/signup')}>Start a pilot</button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-screen-label="Teacher FAQ">
        <div className="wrap">
          <span className="label">Frequently asked</span>
          <h2 className="h2" style={{ margin: '14px 0 34px' }}>What schools ask first.</h2>
          <Lp6Faq items={TEACHER_FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section data-screen-label="Teacher CTA">
        <div className="wrap">
          <div className="ctaband reveal">
            <h2 className="h2">Bring movement into your classroom.</h2>
            <p>Start a free pilot. We will run your first session with you and leave you a printable activity pack.</p>
            <div className="herocta" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn" onClick={go('teachers_final', '/teacher/signup')}>Start a pilot <ArrowIcon /></button>
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
