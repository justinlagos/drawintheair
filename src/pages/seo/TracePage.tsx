import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import {
  PHONICS, SHAPE_META, NUMBER_META, LETTERS,
  buildFAQSchema, buildBreadcrumbSchema, buildLearningResourceSchema,
  LETTER_CONTENT, NUMBER_CONTENT, SHAPE_CONTENT,
} from '../../seo/seo-config';

interface TracePageProps {
  type: 'letter' | 'number' | 'shape';
  value: string;
}

const NUMBERS_LIST = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SHAPE_LIST = ['circle', 'triangle', 'square', 'star', 'heart', 'rectangle', 'diamond', 'oval'];

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function getLaunchUrl(type: 'letter' | 'number' | 'shape', value: string): string {
  if (type === 'letter') return `/play?screen=game&mode=pre-writing&trace=${value.toUpperCase()}`;
  if (type === 'number') return `/play?screen=game&mode=pre-writing&trace=${value}`;
  return `/play?screen=game&mode=pre-writing&trace=${value.toLowerCase()}`;
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
  const s = value.toLowerCase();
  const meta = SHAPE_META[s] || { emoji: '🔷', sides: '', description: `A geometric shape.` };
  return {
    title: `Trace a ${cap(value)} in the Air — Free Shape Activity | Draw in the Air`,
    description: `Help your child learn the ${value} shape using gesture-based air drawing! ${meta.description} Webcam-powered shape tracing for preschool and kindergarten. No download required.`,
    canonical: `/trace-${s}`,
    keywords: [`trace ${value} for kids`, `draw a ${value} online kids`, `shape tracing ${value}`, `${value} shape activity preschool`, `air drawing ${value} shape`],
    emoji: meta.emoji,
    badge: `${cap(value)} Shape — Tracing Activity`,
    heroTitle: `Trace a ${cap(value)} in the Air`,
    heroSub: `${meta.description} Help your child master this shape through fun gesture-based air tracing — developing spatial awareness, shape recognition, and fine motor skills.`,
    teaches: `${cap(value)} shape recognition and drawing`,
    faq: [
      { q: `What is a ${value}?`, a: meta.description },
      { q: `How do I trace a ${value} in the air?`, a: `Open Draw in the Air and choose Tracing mode. Select the ${value} shape, raise your index finger to the webcam, pinch to draw, and follow the on-screen guide around the shape.` },
      { q: `What age is shape tracing suitable for?`, a: `Shape tracing is ideal for children aged 2–6. Learning basic shapes is a key early childhood milestone that supports geometry understanding and pre-writing skills.` },
      { q: `Does drawing shapes in the air help with learning?`, a: `Yes! Gesture-based shape tracing builds spatial awareness, visual-motor integration, and shape discrimination — all foundational skills for mathematics and reading readiness.` },
    ],
  };
}

// ─── LaunchPanel ─────────────────────────────────────────────────────────────
function LaunchPanel({ type, value }: { type: 'letter' | 'number' | 'shape'; value: string }) {
  const url = getLaunchUrl(type, value);
  const label =
    type === 'letter' ? `Trace Letter ${value.toUpperCase()} Now` :
      type === 'number' ? `Trace Number ${value} Now` :
        `Trace a ${cap(value)} Now`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(108,71,255,0.25) 0%, rgba(0,245,212,0.15) 100%)',
      border: '1px solid rgba(108,71,255,0.4)',
      borderRadius: 20,
      padding: '36px 40px',
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
      margin: '32px 0',
      boxShadow: '0 8px 40px rgba(108,71,255,0.2)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🖐️</div>
      <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>
        Try It Right Now — Free
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', margin: '0 0 24px', lineHeight: 1.6 }}>
        No download. No login. Works on any laptop or desktop with a webcam.
      </p>
      <button
        onClick={() => navigate(url)}
        id={`launch-trace-${type}-${value}`}
        style={{
          background: 'linear-gradient(135deg, #6c47ff, #00f5d4)',
          border: 'none',
          borderRadius: 50,
          padding: '16px 40px',
          color: 'white',
          fontSize: '1.05rem',
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(108,71,255,0.5)',
          transition: 'all 0.2s ease',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        🎯 {label}
      </button>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', marginTop: 14, marginBottom: 0 }}>
        Allow camera access when prompted · Your video is never recorded or uploaded
      </p>
    </div>
  );
}

// ─── Educational deep-dive section ───────────────────────────────────────────
function EducationalContent({ type, value }: { type: 'letter' | 'number' | 'shape'; value: string }) {
  const para = (text: string) => (
    <p style={{ color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, marginBottom: 16, fontSize: '0.95rem' }}>{text}</p>
  );
  const h3 = (text: string) => (
    <h3 style={{ color: '#00f5d4', fontSize: '1rem', fontWeight: 700, marginBottom: 8, marginTop: 20 }}>{text}</h3>
  );
  const tip = (text: string) => (
    <div style={{
      background: 'rgba(108,71,255,0.12)',
      border: '1px solid rgba(108,71,255,0.3)',
      borderRadius: 12,
      padding: '14px 18px',
      marginTop: 16,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>💡</span>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>{text}</p>
    </div>
  );

  if (type === 'letter') {
    const L = value.toUpperCase();
    const ph = PHONICS[L] || { sound: '', word: L, emoji: '✏️' };
    const lc = LETTER_CONTENT[L];
    if (!lc) return null;
    return (
      <div>
        <h2 style={{ color: 'white', fontSize: '1.35rem', fontWeight: 800, marginBottom: 20 }}>
          Learning Letter {L} — A Complete Guide
        </h2>
        {h3('How to Form Letter ' + L)}
        {para(lc.formation)}
        {h3('The ' + L + ' Sound in Phonics')}
        {para(`Letter ${L} makes the ${ph.sound} sound — as in "${ph.word}" ${ph.emoji}. ${lc.exampleSentence} Phonics awareness at the letter level is one of the strongest predictors of early reading success. Children who can associate a letter's shape with its sound gain a critical literacy foundation.`)}
        {h3('Looks Like...')}
        {para(lc.similarLetters + ' Tracing letters regularly — especially by moving the whole arm through the air — reinforces the unique shape of each letter and reduces common reversal errors.')}
        {h3('Did You Know?')}
        {para(lc.funFact)}
        {tip('Parent & Teacher Tip: ' + lc.parentTip)}
      </div>
    );
  }

  if (type === 'number') {
    const nc = NUMBER_CONTENT[value];
    const meta = NUMBER_META[value] || { emoji: '🔢', funFact: '', word: value };
    if (!nc) return null;
    return (
      <div>
        <h2 style={{ color: 'white', fontSize: '1.35rem', fontWeight: 800, marginBottom: 20 }}>
          Learning Number {value} — A Complete Guide
        </h2>
        {h3('How to Form the Numeral ' + value)}
        {para(nc.formation)}
        {h3('Number ' + value + ' in the Real World')}
        {para(nc.realWorld + ' Fun fact: ' + meta.funFact)}
        {h3('Maths Connection')}
        {para(nc.mathConnection)}
        {tip('Parent & Teacher Tip: ' + nc.parentTip)}
      </div>
    );
  }

  // shape
  const s = value.toLowerCase();
  const sc = SHAPE_CONTENT[s];
  const sm = SHAPE_META[s] || { emoji: '🔷', sides: '', description: '' };
  if (!sc) return null;
  return (
    <div>
      <h2 style={{ color: 'white', fontSize: '1.35rem', fontWeight: 800, marginBottom: 20 }}>
        Learning the {cap(value)} Shape — A Complete Guide
      </h2>
      {h3('Geometry Facts')}
      {para(sm.description + ' ' + sc.geometryFact)}
      {h3('Where You See ' + cap(value) + 's in Real Life')}
      {para(sc.realWorldExamples)}
      {h3('How to Trace a ' + cap(value))}
      {para(sc.drawingTip)}
      {h3('Comparing to Similar Shapes')}
      {para(sc.comparison)}
      {tip('Parent & Teacher Tip: ' + sc.parentTip)}
    </div>
  );
}

// ─── Cross-category links ─────────────────────────────────────────────────────
function CrossCategoryLinks({ currentType }: { currentType: 'letter' | 'number' | 'shape' }) {
  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 50,
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 16 }}>
        Explore all tracing activities:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {currentType !== 'letter' && (
          <button style={btnStyle} onClick={() => navigate('/trace-a')}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6c47ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
            🔤 Trace the Alphabet A–Z
          </button>
        )}
        {currentType !== 'number' && (
          <button style={btnStyle} onClick={() => navigate('/trace-number-1')}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6c47ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
            🔢 Trace Numbers 1–10
          </button>
        )}
        {currentType !== 'shape' && (
          <button style={btnStyle} onClick={() => navigate('/trace-circle')}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6c47ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
            🔷 Trace Shapes
          </button>
        )}
        <button style={btnStyle} onClick={() => navigate('/activities/bubble-pop')}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00f5d4'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
          🫧 Bubble Pop Game
        </button>
        <button style={btnStyle} onClick={() => navigate('/activities/sort-and-place')}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#00f5d4'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}>
          🎯 Sort & Place Game
        </button>
      </div>
    </div>
  );
}

// ─── Related item cards ───────────────────────────────────────────────────────
function RelatedCard({ label, path, emoji }: { label: string; path: string; emoji: string }) {
  return (
    <button onClick={() => navigate(path)} style={{
      background: 'rgba(108,71,255,0.1)',
      border: '1px solid rgba(108,71,255,0.25)',
      borderRadius: 12,
      padding: '14px 18px',
      cursor: 'pointer',
      color: 'white',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 80,
      transition: 'all 0.2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6c47ff'; (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,71,255,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.1)'; }}
    >
      <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
    </button>
  );
}

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
          { label: `Trace ${type === 'letter' ? value.toUpperCase() : cap(value)}` },
        ]} />
      </div>

      {/* Hero (without CTA — LaunchPanel replaces it below) */}
      <PageHero
        badge={data.badge}
        emoji={data.emoji}
        title={data.heroTitle}
        subtitle={data.heroSub}
      />

      {/* ── LAUNCH PANEL + EDUCATIONAL CONTENT (main value section) ── */}
      <Section light>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Premium Launch Panel */}
          <LaunchPanel type={type} value={value} />

          {/* Educational deep-dive */}
          <EducationalContent type={type} value={value} />
        </div>
      </Section>

      {/* ── QUICK INFO GRID ── */}
      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
          <div>
            <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>Quick Facts</h2>
            {type === 'letter' && (() => {
              const L = value.toUpperCase();
              const ph = PHONICS[L] || { sound: '', word: L, emoji: '✏️' };
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[['Letter', `${L} / ${L.toLowerCase()}`], ['Phonics Sound', ph.sound], ['Example Word', `${ph.word} ${ph.emoji}`], ['Position', `#${LETTERS.indexOf(L) + 1} of 26`]].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: '#6c47ff', fontSize: '0.78rem', fontWeight: 700, minWidth: 110 }}>{k}</span>
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
                  {[['Number', `${value} (${cap(m.word)})`], ['Emoji', m.emoji], ['Fun Fact', m.funFact]].map(([k, v]) => (
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
                  {[['Shape', cap(value)], ['Properties', m.sides], ['Description', m.description]].map(([k, v]) => (
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
            <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, marginBottom: 16 }}>How to Trace</h2>
            {[
              ['1. Open the app', 'Click the Launch button above or visit drawintheair.com.'],
              ['2. Allow webcam', 'Click Allow when your browser requests camera access.'],
              ['3. Raise your finger', 'Hold your index finger up so the camera can detect it.'],
              ['4. Pinch & draw', 'Pinch thumb + index finger to draw. Open hand to pause.'],
              ['5. Follow the guide', 'Trace the outlined shape shown on screen — follow the green dot!'],
            ].map(([step, desc]) => (
              <div key={String(step)} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span style={{ color: '#6c47ff', fontWeight: 800, fontSize: '0.8rem', minWidth: 110 }}>{step}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── RELATED ITEMS ── */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>
          {type === 'letter' ? 'Trace Every Letter A–Z' : type === 'number' ? 'Trace Every Number 1–10' : 'Trace Every Shape'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
          {type === 'letter' && LETTERS.map(l => (
            <RelatedCard key={l} label={`Trace ${l}`} path={`/trace-${l.toLowerCase()}`} emoji={PHONICS[l]?.emoji || '✏️'} />
          ))}
          {type === 'number' && NUMBERS_LIST.map(n => (
            <RelatedCard key={n} label={`Trace ${n}`} path={`/trace-number-${n}`} emoji={NUMBER_META[n]?.emoji || '🔢'} />
          ))}
          {type === 'shape' && SHAPE_LIST.map(s => (
            <RelatedCard key={s} label={cap(s)} path={`/trace-${s}`} emoji={SHAPE_META[s]?.emoji || '🔷'} />
          ))}
        </div>

        {/* Cross-category links */}
        <CrossCategoryLinks currentType={type} />
      </Section>

      {/* ── FAQ ── */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800, marginBottom: 24 }}>Frequently Asked Questions</h2>
        {data.faq.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>
    </SeoLayout>
  );
}
