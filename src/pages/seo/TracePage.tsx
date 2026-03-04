import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PHONICS, SHAPE_META, NUMBER_META, LETTERS, buildFAQSchema, buildBreadcrumbSchema, buildLearningResourceSchema, SITE } from '../../seo/seo-config';

interface TracePageProps {
  type: 'letter' | 'number' | 'shape';
  value: string;
}

function getPageData(type: 'letter' | 'number' | 'shape', value: string) {
  if (type === 'letter') {
    const L = value.toUpperCase();
    const phonics = PHONICS[L] || { sound: '', word: L, emoji: '✏️' };
    return {
      title: `Trace Letter ${L} in the Air — Free Interactive Activity | Draw in the Air`,
      description: `Help your child learn to write letter ${L} using gesture-based air drawing! Webcam-powered letter tracing for preschool and kindergarten. Teaches the ${phonics.sound} sound as in "${phonics.word}". No download required.`,
      canonical: `/trace-${L.toLowerCase()}`,
      keywords: [`trace letter ${L} for kids`, `learn letter ${L} online`, `alphabet tracing ${L}`, `air writing letter ${L}`, `interactive letter ${L} activity`, `letter ${L} tracing game`],
      emoji: phonics.emoji,
      badge: `Letter ${L} — Phonics & Tracing`,
      heroTitle: `Trace Letter ${L} in the Air`,
      heroSub: `Help your child master letter ${L} through gesture-based air tracing. Develops phonics knowledge, letter formation, and fine motor skills — all through play.`,
      teaches: `Letter ${L} recognition and formation, phonics sound ${phonics.sound}`,
      faq: [
        { q: `How do I trace letter ${L} in the air?`, a: `Open Draw in the Air, choose Letter Tracing, and select letter ${L}. Raise your index finger to the webcam, then pinch your thumb and index finger together to start drawing. Follow the on-screen guide to trace the shape of the letter.` },
        { q: `What age is letter ${L} tracing suitable for?`, a: `Letter tracing is designed for children aged 3–7, particularly preschool and kindergarten. The activity helps build letter recognition and the muscle memory needed for handwriting.` },
        { q: `Does tracing letter ${L} help with handwriting?`, a: `Yes! Air tracing reinforces the motor pattern for forming letter ${L}. Research in kinesthetic learning shows that physical letter formation practice — even in the air — improves handwriting retention significantly.` },
        { q: `What sound does letter ${L} make?`, a: `Letter ${L} makes the ${phonics.sound} sound, as in "${phonics.word}". This is an important phonics concept for early reading development.` },
      ],
    };
  }
  if (type === 'number') {
    const meta = NUMBER_META[value] || { emoji: '🔢', funFact: `Number ${value} is important in maths!`, word: value };
    return {
      title: `Trace Number ${value} in the Air — Free Interactive Activity | Draw in the Air`,
      description: `Help your child learn to write the number ${value} using gesture-based air drawing! Webcam-powered number tracing for preschool and kindergarten. Fun fact: ${meta.funFact} No download required.`,
      canonical: `/trace-number-${value}`,
      keywords: [`trace number ${value} for kids`, `learn number ${value} online`, `number tracing ${value}`, `air writing number ${value}`, `number ${value} activity preschool`],
      emoji: meta.emoji,
      badge: `Number ${value} — Counting & Tracing`,
      heroTitle: `Trace Number ${value} in the Air`,
      heroSub: `Help your child master the number ${value} (${meta.word}) through gesture-based air tracing. Builds number recognition, counting skills, and fine motor development through play.`,
      teaches: `Number ${value} recognition and formation, counting to ${value}`,
      faq: [
        { q: `How do I trace number ${value} in the air?`, a: `Open Draw in the Air, choose Tracing mode, and select number ${value}. Raise your index finger to the webcam, pinch to draw, and follow the on-screen guide to trace the numeral.` },
        { q: `What age is number ${value} tracing suitable for?`, a: `Number tracing is designed for children aged 3–6, covering preschool and early kindergarten. It helps build numeral recognition, counting, and the motor patterns needed for writing numbers.` },
        { q: `What fun facts are there about number ${value}?`, a: meta.funFact },
        { q: `Does air tracing help children learn to write numbers?`, a: `Yes! Kinesthetic (movement-based) learning is proven to improve number formation retention. Tracing in the air engages the same muscle memory pathways as pencil writing, reinforcing the correct stroke sequence.` },
      ],
    };
  }
  // shape
  const s = value.toLowerCase();
  const meta = SHAPE_META[s] || { emoji: '🔷', sides: '', description: `A geometric shape.` };
  return {
    title: `Trace a ${value.charAt(0).toUpperCase() + value.slice(1)} in the Air — Free Shape Activity | Draw in the Air`,
    description: `Help your child learn the ${value} shape using gesture-based air drawing! ${meta.description} Webcam-powered shape tracing for preschool and kindergarten. No download required.`,
    canonical: `/trace-${s}`,
    keywords: [`trace ${value} for kids`, `draw a ${value} online kids`, `shape tracing ${value}`, `${value} shape activity preschool`, `air drawing ${value} shape`],
    emoji: meta.emoji,
    badge: `${value.charAt(0).toUpperCase() + value.slice(1)} Shape — Tracing Activity`,
    heroTitle: `Trace a ${value.charAt(0).toUpperCase() + value.slice(1)} in the Air`,
    heroSub: `${meta.description} Help your child master this shape through fun gesture-based air tracing — developing spatial awareness, shape recognition, and fine motor skills.`,
    teaches: `${value.charAt(0).toUpperCase() + value.slice(1)} shape recognition and drawing`,
    faq: [
      { q: `What is a ${value}?`, a: meta.description },
      { q: `How do I trace a ${value} in the air?`, a: `Open Draw in the Air and choose Tracing mode. Select the ${value} shape, raise your index finger to the webcam, pinch to draw, and follow the on-screen guide around the shape.` },
      { q: `What age is shape tracing suitable for?`, a: `Shape tracing is ideal for children aged 2–6. Learning basic shapes is a key early childhood milestone that supports geometry understanding and pre-writing skills.` },
      { q: `Does drawing shapes in the air help with learning?`, a: `Yes! Gesture-based shape tracing builds spatial awareness, visual-motor integration, and shape discrimination — all foundational skills for mathematics and reading readiness.` },
    ],
  };
}

const SHAPE_LIST = ['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'diamond', 'oval'];

export default function TracePage({ type, value }: TracePageProps) {
  const data = getPageData(type, value);

  const structuredData = [
    buildLearningResourceSchema(data.heroTitle, data.description, data.canonical, data.teaches),
    buildFAQSchema(data.faq),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: type === 'letter' ? 'Letter Tracing' : type === 'number' ? 'Number Tracing' : 'Shape Tracing', path: type === 'letter' ? '/letter-tracing' : type === 'number' ? '/trace-number-1' : '/trace-circle' },
      { name: `Trace ${type === 'letter' ? value.toUpperCase() : value}`, path: data.canonical },
    ]),
  ];

  const card = (label: string, path: string, emoji: string) => (
    <button key={path} onClick={() => navigate(path)} style={{ background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.25)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
      <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
    </button>
  );

  return (
    <SeoLayout>
      <SEOMeta
        title={data.title}
        description={data.description}
        keywords={data.keywords}
        canonical={data.canonical}
        structuredData={structuredData}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[
          { label: 'Home', path: '/' },
          { label: type === 'letter' ? 'Letter Tracing' : type === 'number' ? 'Number Tracing' : 'Shape Tracing', path: type === 'letter' ? '/letter-tracing' : '/trace-number-1' },
          { label: `Trace ${type === 'letter' ? value.toUpperCase() : value}` },
        ]} />
      </div>

      <PageHero
        badge={data.badge}
        emoji={data.emoji}
        title={data.heroTitle}
        subtitle={data.heroSub}
        cta={{ label: 'Start Tracing — Free ✨', path: SITE.appPath }}
      />

      {/* Info section */}
      <Section light>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 16 }}>About This Activity</h2>
            {type === 'letter' && (() => {
              const L = value.toUpperCase();
              const ph = PHONICS[L] || { sound: '', word: L, emoji: '✏️' };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[['Letter', `${L} (uppercase) / ${L.toLowerCase()} (lowercase)`], ['Phonics Sound', ph.sound], ['Example Word', ph.word], ['Emoji', ph.emoji], ['Position in Alphabet', `#${LETTERS.indexOf(L) + 1} of 26`]].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: '#6c47ff', fontSize: '0.78rem', fontWeight: 700, minWidth: 120 }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>{v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            {type === 'number' && (() => {
              const m = NUMBER_META[value] || { emoji: '🔢', funFact: '', word: value };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[['Number', value], ['Word', m.word.charAt(0).toUpperCase() + m.word.slice(1)], ['Fun Fact', m.funFact]].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: '#6c47ff', fontSize: '0.78rem', fontWeight: 700, minWidth: 80 }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>{v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
            {type === 'shape' && (() => {
              const m = SHAPE_META[value.toLowerCase()] || { emoji: '🔷', sides: '', description: '' };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[['Shape', value.charAt(0).toUpperCase() + value.slice(1)], ['Properties', m.sides], ['Description', m.description]].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: '#6c47ff', fontSize: '0.78rem', fontWeight: 700, minWidth: 100 }}>{k}</span>
                      <span style={{ color: '#e2e8f0', fontSize: '0.88rem' }}>{v}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 16 }}>How to Trace</h2>
            {[['1. Open the app', 'Visit drawintheair.com and allow webcam access.'], ['2. Choose Tracing', 'Select the Tracing activity from the menu.'], ['3. Raise your finger', 'Hold your index finger up so the camera can see it.'], ['4. Pinch & draw', 'Pinch thumb + index finger to draw. Open hand to pause.'], ['5. Follow the guide', 'Trace the shape outline shown on screen — have fun!']].map(([step, desc]) => (
              <div key={String(step)} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ color: '#6c47ff', fontWeight: 800, fontSize: '0.85rem', minWidth: 120 }}>{step}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Related items */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>
          {type === 'letter' ? 'Other Letters to Trace' : type === 'number' ? 'Other Numbers to Trace' : 'Other Shapes to Trace'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {type === 'letter' && LETTERS.map(l => card(`Trace ${l}`, `/trace-${l.toLowerCase()}`, PHONICS[l]?.emoji || '✏️'))}
          {type === 'number' && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map(n => card(`Trace ${n}`, `/trace-number-${n}`, NUMBER_META[n]?.emoji || '🔢'))}
          {type === 'shape' && SHAPE_LIST.map(s => card(s.charAt(0).toUpperCase() + s.slice(1), `/trace-${s}`, SHAPE_META[s]?.emoji || '🔷'))}
        </div>
      </Section>

      {/* FAQ */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Frequently Asked Questions</h2>
        {data.faq.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>
    </SeoLayout>
  );
}
