import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildFAQSchema, buildBreadcrumbSchema, SITE } from '../../seo/seo-config';

type ActivitySlug = 'bubble-pop' | 'sort-and-place' | 'free-paint' | 'letter-tracing';

interface ActivityPageProps { slug: ActivitySlug }

const ACTIVITY_DATA: Record<ActivitySlug, {
  meta: typeof PAGE_META.bubblePop;
  emoji: string; badge: string;
  heroTitle: string; heroSub: string;
  skills: { icon: string; title: string; desc: string }[];
  howItWorks: string[];
  faq: { q: string; a: string }[];
}> = {
  'bubble-pop': {
    meta: PAGE_META.bubblePop,
    emoji: '🫧', badge: 'Game — Ages 3–8',
    heroTitle: 'Bubble Pop — Hand Tracking Game for Kids',
    heroSub: 'Pop bubbles by pointing in the air! A fun, gesture-controlled game that builds hand-eye coordination and reflexes. 30-second rounds, 20-pop milestones, and unlock rewards. Free, no download.',
    skills: [
      { icon: '🎯', title: 'Hand-Eye Coordination', desc: 'Tracking and hitting moving targets builds essential motor skills.' },
      { icon: '⚡', title: 'Reaction Speed', desc: 'The 30-second timer encourages quick, decisive movements.' },
      { icon: '🎮', title: 'Focus & Concentration', desc: 'Tracking multiple bubbles at once strengthens attention span.' },
      { icon: '🏆', title: 'Achievement System', desc: '20-pop milestone rewards keep children motivated and engaged.' },
    ],
    howItWorks: [
      'Open Draw in the Air at drawintheair.com — no download needed.',
      'Allow webcam access when prompted. Your video is never recorded.',
      'Select Bubble Pop from the activity menu.',
      'Raise your index finger and point it toward the bubbles on screen.',
      'Touch each bubble to pop it! You have 30 seconds — pop as many as you can.',
      'Hit the 20-pop milestone to unlock a special reward!',
    ],
    faq: [
      { q: 'What age is Bubble Pop suitable for?', a: 'Bubble Pop is designed for children aged 3–8. The gesture controls are simple enough for young children while still being engaging and fun for older kids.' },
      { q: 'Do I need to download anything to play Bubble Pop?', a: 'No download is required. Bubble Pop runs entirely in your browser using your webcam. Just visit the page, allow camera access, and start playing.' },
      { q: 'Is Bubble Pop safe for children?', a: 'Yes. Draw in the Air does not record or store any video. The webcam feed is processed locally in the browser and never leaves your device. No personal data is collected.' },
      { q: 'What skills does Bubble Pop develop?', a: 'Bubble Pop develops hand-eye coordination, visual tracking, reaction speed, and sustained attention — all through fun, active gameplay. Research shows gesture-based interaction improves fine motor skill development in early childhood.' },
      { q: 'Can Bubble Pop be used in the classroom?', a: 'Absolutely! Bubble Pop requires no accounts or downloads, making it ideal for classroom computer labs and interactive whiteboards. It can be used as a quick brain break or motor skills warm-up activity.' },
    ],
  },
  'sort-and-place': {
    meta: PAGE_META.sortAndPlace,
    emoji: '🗂️', badge: 'Game — Ages 3–7',
    heroTitle: 'Sort and Place — Gesture Sorting Game for Kids',
    heroSub: 'Sort and place objects by pointing in the air! A hands-free sorting and categorisation game that develops cognitive skills, logical thinking, and spatial reasoning. Three rounds of increasing difficulty. Free, no download.',
    skills: [
      { icon: '🧠', title: 'Logical Thinking', desc: 'Sorting by colour, size, or category builds categorisation and classification skills.' },
      { icon: '🎯', title: 'Hand-Eye Coordination', desc: 'Grabbing and placing objects with a pinch gesture builds precision motor control.' },
      { icon: '📚', title: 'Cognitive Development', desc: 'Identifying similarities and differences is a core early learning milestone.' },
      { icon: '🔄', title: 'Increasing Challenge', desc: 'Three rounds with increasing difficulty keeps learning progressive and age-appropriate.' },
    ],
    howItWorks: [
      'Open Draw in the Air at drawintheair.com — no download needed.',
      'Allow webcam access when prompted.',
      'Select Sort and Place from the activity menu.',
      'Raise your index finger so the camera can track your hand.',
      'Pinch your thumb and index finger to "grab" an object on screen.',
      'Move your hand to drag the object to the correct category, then open your hand to release it.',
      'Complete three rounds of increasing difficulty to finish the activity!',
    ],
    faq: [
      { q: 'What skills does Sort and Place develop?', a: 'Sort and Place develops categorisation skills, logical thinking, and hand-eye coordination. Children learn to identify similarities and differences between objects — a key early childhood cognitive milestone.' },
      { q: 'How does the drag-and-drop gesture work?', a: 'We use Google\'s MediaPipe library to detect your child\'s hand in real time through the webcam. Pinching the thumb and index finger together "grabs" an object; opening the hand "drops" it.' },
      { q: 'What age is Sort and Place suitable for?', a: 'Sort and Place is designed for children aged 3–7. The sorting categories are carefully chosen to match early childhood curriculum milestones for classification and categorisation.' },
      { q: 'Can Sort and Place be used in the classroom?', a: 'Yes! Sort and Place is ideal for teaching classification and sorting concepts in preschool, reception, and Year 1 classrooms. No accounts or downloads required.' },
    ],
  },
  'free-paint': {
    meta: PAGE_META.freePaint,
    emoji: '🎨', badge: 'Creative Mode — All Ages',
    heroTitle: 'Free Paint — Draw Anything in the Air',
    heroSub: 'Unlimited creative freedom! Draw anything your imagination conjures using just your finger and a webcam. Multiple colours, brush sizes, glow effects, and smooth stroke rendering. No canvas required — just air.',
    skills: [
      { icon: '🎨', title: 'Creative Expression', desc: 'Open-ended drawing develops imagination and artistic confidence.' },
      { icon: '✋', title: 'Fine Motor Control', desc: 'Controlling brush size and path builds precision and motor planning.' },
      { icon: '🌈', title: 'Colour Awareness', desc: 'Choosing and mixing colours builds colour recognition and aesthetic sense.' },
      { icon: '🖌️', title: 'Visual Thinking', desc: 'Planning what to draw before drawing it strengthens visual processing skills.' },
    ],
    howItWorks: [
      'Open Draw in the Air at drawintheair.com — no download needed.',
      'Allow webcam access when prompted.',
      'Select Free Paint from the activity menu.',
      'Choose your colour and brush size from the palette.',
      'Raise your index finger and pinch your thumb + index finger to start drawing.',
      'Move your hand through the air to paint — open your hand to lift the brush.',
      'Use the undo button to erase mistakes and the clear button to start fresh!',
    ],
    faq: [
      { q: 'Can children save their drawings?', a: 'Currently, drawings are session-based and are cleared when you leave the activity. We recommend taking a photo or screenshot of particularly great artwork to save it!' },
      { q: 'Is Free Paint suitable for toddlers?', a: 'Free Paint works well for children from about age 3 upwards. Younger children may need a parent nearby to help them position their hand correctly for the webcam.' },
      { q: 'Can I change colours while drawing?', a: 'Yes! A colour palette is available at the bottom of the screen. Tap or point to any colour to switch, and continue drawing with the new colour.' },
    ],
  },
  'letter-tracing': {
    meta: PAGE_META.letterTracing,
    emoji: '✏️', badge: 'Learning Mode — Ages 3–7',
    heroTitle: 'Letter Tracing A–Z — Air Writing for Kids',
    heroSub: 'Trace all 26 letters of the alphabet in the air using hand tracking! With guided outlines, visual feedback, and phonics information for every letter. The most fun way to practise handwriting — no pencil required.',
    skills: [
      { icon: '📝', title: 'Letter Formation', desc: 'Tracing correct letter shapes builds the muscle memory needed for handwriting.' },
      { icon: '🔤', title: 'Phonics Awareness', desc: 'Each letter page includes the phonics sound and a matching example word.' },
      { icon: '✋', title: 'Fine Motor Skills', desc: 'Controlled air drawing develops the finger precision needed for writing.' },
      { icon: '🏆', title: 'Progress Tracking', desc: 'Celebrations and feedback keep children motivated across all 26 letters.' },
    ],
    howItWorks: [
      'Open Draw in the Air at drawintheair.com.',
      'Select Letter Tracing from the activity menu.',
      'Choose a letter from the A–Z grid, or start with A and work through in order.',
      'Raise your index finger to the webcam and pinch to draw.',
      'Follow the guide path to trace the letter correctly.',
      'Celebrate when you complete each letter!',
    ],
    faq: [
      { q: 'Does the app cover all 26 letters?', a: 'Yes! Draw in the Air includes tracing activities for all 26 letters of the alphabet (A–Z), both uppercase and lowercase, each with phonics information and guided tracing paths.' },
      { q: 'Is letter tracing based on a particular handwriting scheme?', a: 'The letter formations in Draw in the Air follow standard print letter formation conventions used in most preschool and primary school curricula in the UK and US.' },
      { q: 'How does this compare to paper tracing worksheets?', a: 'Air tracing engages the same motor pathways as paper tracing but adds an interactive, visual dimension that children find more engaging. It\'s best used alongside — not instead of — paper practice.' },
    ],
  },
};

export default function ActivityPage({ slug }: ActivityPageProps) {
  const data = ACTIVITY_DATA[slug];
  if (!data) return null;
  const { meta, emoji, badge, heroTitle, heroSub, skills, howItWorks, faq } = data;

  const structuredData = [
    buildFAQSchema(faq),
    buildBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Activities', path: '/activities/bubble-pop' },
      { name: heroTitle, path: meta.canonical },
    ]),
  ];

  return (
    <SeoLayout>
      <SEOMeta
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        canonical={meta.canonical}
        structuredData={structuredData}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Activities', path: '/activities/bubble-pop' }, { label: heroTitle }]} />
      </div>

      <PageHero badge={badge} emoji={emoji} title={heroTitle} subtitle={heroSub} cta={{ label: 'Play Now — Free ✨', path: SITE.appPath }} />

      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Skills This Activity Develops</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {skills.map(s => (
            <div key={s.title} style={{ background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{s.icon}</div>
              <div style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>How to Play</h2>
        {howItWorks.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6c47ff', color: 'white', fontWeight: 800, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <p style={{ color: '#e2e8f0', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{step}</p>
          </div>
        ))}
      </Section>

      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Frequently Asked Questions</h2>
        {faq.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
      </Section>

      <Section>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Try Other Activities</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: '🔤 Letter Tracing', path: '/letter-tracing' },
            { label: '🔢 Number Tracing', path: '/trace-number-1' },
            { label: '⭕ Shape Tracing', path: '/trace-circle' },
            { label: '🫧 Bubble Pop', path: '/activities/bubble-pop' },
            { label: '🗂️ Sort & Place', path: '/activities/sort-and-place' },
            { label: '🎨 Free Paint', path: '/free-paint' },
          ].filter(a => !a.path.includes(slug)).map(a => (
            <button key={a.path} onClick={() => navigate(a.path)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 12px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>
              {a.label}
            </button>
          ))}
        </div>
      </Section>
    </SeoLayout>
  );
}
