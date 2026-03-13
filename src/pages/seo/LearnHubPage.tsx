import { SeoLayout, Breadcrumb, PageHero, Section, navigate } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { PAGE_META, buildBreadcrumbSchema } from '../../seo/seo-config';

const ARTICLES = [
  { slug: 'hand-tracking-for-kids', emoji: '🖐️', title: 'What is Hand Tracking for Kids?', desc: 'A plain-English guide to how AI hand tracking works and why it\'s a powerful learning tool for young children.', readTime: '5 min read', category: 'Technology' },
  { slug: 'gesture-learning', emoji: '✋', title: 'Gesture-Based Learning — The Future of Interactive Education', desc: 'How movement-based learning engages children\'s bodies and minds simultaneously, improving retention and motor skills.', readTime: '6 min read', category: 'Research' },
  { slug: 'drawing-skills-for-children', emoji: '🎨', title: 'How Drawing Develops Children\'s Skills', desc: 'Drawing is more than art — it builds fine motor skills, visual processing, and early literacy. Air drawing does the same, differently.', readTime: '5 min read', category: 'Development' },
  { slug: 'early-childhood-motor-skills', emoji: '🧠', title: 'Early Childhood Motor Skills — How Technology Can Help', desc: 'Gross and fine motor skill development is critical in ages 3-7. How interactive gesture games support development.', readTime: '7 min read', category: 'Development' },
  { slug: 'ai-for-kids', emoji: '🤖', title: 'AI for Kids — How Hand Tracking Works', desc: 'A simple, age-appropriate guide to AI hand tracking technology — for curious kids and the adults who teach them.', readTime: '4 min read', category: 'Technology' },
  { slug: 'screen-time-alternatives', emoji: '📵', title: 'Screen-Time Alternatives for Kids', desc: 'Not all screen time is equal. How active, gesture-based learning differs from passive watching — and what that means for development.', readTime: '5 min read', category: 'Research' },
];

export default function LearnHubPage() {
  return (
    <SeoLayout>
      <SEOMeta {...PAGE_META.learnHub} structuredData={buildBreadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Learning Hub', path: '/learn' }])} />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Learning Hub' }]} />
      </div>

      <PageHero badge="Learning Hub" emoji="📚" title="Guides for Parents & Teachers" subtitle="Evidence-based articles on gesture learning, motor skills development, alphabet education, and early childhood technology — written for families and educators." />

      {/* Introduction */}
      <Section>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 16 }}>
            Draw in the Air is built on research in embodied cognition, kinesthetic learning, and early childhood motor development. These articles explain the educational thinking behind the platform — not marketing copy, but genuine information for parents wondering whether gesture learning is worthwhile and teachers considering how it fits into their classroom practice.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: 0 }}>
            Every article is written with references to developmental research and practical advice for use at home or in the classroom. Whether you teach Reception, homeschool a 4-year-old, or want to understand how AI hand tracking actually works, there is something here for you.
          </p>
        </div>
      </Section>

      {/* Featured article */}
      <Section light>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Featured</h2>
        <button
          onClick={() => navigate('/learn/gesture-learning')}
          style={{
            display: 'block',
            width: '100%',
            background: 'linear-gradient(135deg, rgba(108,71,255,0.15), rgba(34,211,238,0.1))',
            border: '1px solid rgba(108,71,255,0.3)',
            borderRadius: 16,
            padding: 28,
            cursor: 'pointer',
            textAlign: 'left',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: '1.8rem' }}>✋</span>
            <span style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Research</span>
          </div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.4, marginBottom: 8 }}>
            Gesture-Based Learning — The Future of Interactive Education
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.65, marginBottom: 12 }}>
            Movement-based learning activates multiple cognitive pathways simultaneously. When a child physically traces the letter A in the air while seeing the letter form on screen, they engage proprioceptive memory, visual processing, and motor planning in a single action. This article explores what the research says and how it applies to young learners.
          </div>
          <span style={{ color: '#6c47ff', fontSize: '0.82rem', fontWeight: 700 }}>Read article — 6 min</span>
        </button>

        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>All Articles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {ARTICLES.map(a => (
            <button
              key={a.slug}
              onClick={() => navigate(`/learn/${a.slug}`)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: 22,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(108,71,255,0.4)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.6rem' }}>{a.emoji}</span>
                <span style={{ color: '#6c47ff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{a.category}</span>
              </div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{a.title}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6 }}>{a.desc}</span>
              <span style={{ color: '#6c47ff', fontSize: '0.75rem', fontWeight: 600, marginTop: 'auto' }}>{a.readTime} →</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Topics navigation */}
      <Section>
        <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>Browse by Topic</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20 }}>Jump to specific areas of the platform or explore related educational content.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { label: '🧒 For Parents', path: '/for-parents' },
            { label: '👩‍🏫 For Teachers', path: '/for-teachers' },
            { label: '🏠 For Homeschool', path: '/for-homeschool' },
            { label: '🤖 AI Learning Tools', path: '/ai-learning-tools-for-kids' },
            { label: '📥 Free Worksheets', path: '/free-resources' },
            { label: '🔤 Letter Tracing', path: '/letter-tracing' },
            { label: '🔢 Number Tracing', path: '/trace-number-1' },
            { label: '⭕ Shape Tracing', path: '/trace-circle' },
            { label: '✋ Gesture Learning', path: '/gesture-learning' },
            { label: '💻 Chromebook Tools', path: '/chromebook-learning-tools' },
            { label: '🏫 For Schools', path: '/schools' },
            { label: '🎯 Coordination Activities', path: '/hand-eye-coordination-activities' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: 'rgba(108,71,255,0.08)',
                border: '1px solid rgba(108,71,255,0.2)',
                borderRadius: 10,
                padding: '12px 16px',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.85rem',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(108,71,255,0.08)'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Section>
    </SeoLayout>
  );
}
