import { SeoLayout, Breadcrumb, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildBreadcrumbSchema } from '../../seo/seo-config';

const ARTICLES = [
  { slug: 'hand-tracking-for-kids', emoji: '🖐️', title: 'What is Hand Tracking for Kids?', desc: 'A plain-English guide to how AI hand tracking works and why it\'s a powerful learning tool for young children.', readTime: '5 min read' },
  { slug: 'gesture-learning', emoji: '✋', title: 'Gesture-Based Learning — The Future of Interactive Education', desc: 'How movement-based learning engages children\'s bodies and minds simultaneously, improving retention and motor skills.', readTime: '6 min read' },
  { slug: 'drawing-skills-for-children', emoji: '🎨', title: 'How Drawing Develops Children\'s Skills', desc: 'Drawing is more than art — it builds fine motor skills, visual processing, and early literacy. Air drawing does the same, differently.', readTime: '5 min read' },
  { slug: 'early-childhood-motor-skills', emoji: '🧠', title: 'Early Childhood Motor Skills — How Technology Can Help', desc: 'Gross and fine motor skill development is critical in ages 3–7. How interactive gesture games support development.', readTime: '7 min read' },
  { slug: 'ai-for-kids', emoji: '🤖', title: 'AI for Kids — How Hand Tracking Works', desc: 'A simple, age-appropriate guide to AI hand tracking technology — for curious kids and the adults who teach them.', readTime: '4 min read' },
  { slug: 'screen-time-alternatives', emoji: '📵', title: 'Screen-Time Alternatives for Kids', desc: 'Not all screen time is equal. How active, gesture-based learning differs from passive watching — and what that means for development.', readTime: '5 min read' },
];

export default function LearnHubPage() {
  return (
    <SeoLayout>
      <SEOMeta {...PAGE_META.learnHub} structuredData={buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learning Hub', path: '/learn' }])} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Learning Hub' }]} />
      </div>

      <PageHero badge="Learning Hub" emoji="📚" title="Guides for Parents & Teachers" subtitle="Evidence-based articles on gesture learning, motor skills development, alphabet education, and early childhood technology — written for families and educators." />

      <Section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {ARTICLES.map(a => (
            <button key={a.slug} onClick={() => navigate(`/learn/${a.slug}`)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: '2rem' }}>{a.emoji}</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.4 }}>{a.title}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.83rem', lineHeight: 1.6 }}>{a.desc}</span>
              <span style={{ color: '#6c47ff', fontSize: '0.75rem', fontWeight: 600, marginTop: 'auto' }}>{a.readTime} →</span>
            </button>
          ))}
        </div>
      </Section>

      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Browse by Topic</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: '🧒 For Parents', path: '/for-parents' },
            { label: '👩‍🏫 For Teachers', path: '/for-teachers' },
            { label: '🏠 For Homeschool', path: '/for-homeschool' },
            { label: '🤖 STEM Learning', path: '/stem-learning' },
            { label: '📥 Free Worksheets', path: '/free-resources' },
            { label: '🔤 Letter Tracing', path: '/letter-tracing' },
            { label: '🔢 Number Tracing', path: '/trace-number-1' },
            { label: '⭕ Shape Tracing', path: '/trace-circle' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{ background: 'rgba(108,71,255,0.08)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.85rem', textAlign: 'left' }}>
              {item.label}
            </button>
          ))}
        </div>
      </Section>
    </SeoLayout>
  );
}
