import { SeoLayout, Breadcrumb, FAQItem, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { SITE } from '../../seo/seo-config';

type EducationSlug = 'for-homeschool' | 'for-preschool' | 'for-kindergarten';

interface EducationPageProps {
    slug: EducationSlug;
}

const EDUCATION_DATA: Record<EducationSlug, {
    meta: { title: string; description: string; keywords: string[]; canonical: string; };
    emoji: string;
    badge: string;
    heroTitle: string;
    heroSub: string;
    faq: { q: string; a: string }[];
}> = {
    'for-homeschool': {
        meta: {
            title: 'Homeschool Activities — Gesture Learning for Kids at Home | Draw in the Air',
            description: 'Perfect for homeschool families! Draw in the Air offers no-download gesture activities for letters, numbers, and creative drawing. Free, safe, and screen-smart for ages 3–8.',
            keywords: ['homeschool activities preschool', 'homeschool learning games free', 'home education activities kids', 'preschool homeschool curriculum', 'interactive homeschool app'],
            canonical: '/for-homeschool'
        },
        emoji: '🏠',
        badge: 'For Homeschool Families',
        heroTitle: 'Interactive Homeschool Learning directly in your Browser',
        heroSub: 'Elevate your home education curriculum with active, gesture-based learning. Replace passive screen time with bodily movement while mastering letters, numbers, and fine motor skills.',
        faq: [
            { q: 'Is this suitable as a core homeschool activity?', a: 'Draw in the Air is an excellent supplementary tool. It shouldn\'t replace pencil-and-paper writing, but it offers a highly engaging, kinesthetic alternative for practicing letter and number formation.' },
            { q: 'Are there any costs or subscriptions?', a: 'None at all. The platform is entirely free forever, making it a perfectly budget-friendly addition to your homeschool curriculum.' },
            { q: 'Is the platform safe and private?', a: '100% yes. We do not use accounts, and webcam footage is processed purely locally on your device in the browser. It is never uploaded or saved anywhere.' }
        ]
    },
    'for-preschool': {
        meta: {
            title: 'Preschool Activities — Learn Shapes and Letters | Draw in the Air',
            description: 'Free browser-based educational games specifically designed for preschoolers. Develop fine motor skills, trace letters, and learn shapes through active play.',
            keywords: ['preschool activities online free', 'pre-k learning games', 'toddler educational activities', 'preschool hand tracking game'],
            canonical: '/for-preschool'
        },
        emoji: '🖍️',
        badge: 'For Preschoolers',
        heroTitle: 'Playful Preschool Learning through Movement',
        heroSub: 'Preschoolers learn best through full-body motion. Draw in the Air connects big arm movements to essential early childhood milestones like shape tracing, color sorting, and letter basics.',
        faq: [
            { q: 'Is the app too complex for a 3-year-old?', a: 'Not at all! The gesture recognition is highly forgiving. While they may need 5 minutes of parent guidance initially to learn the "pinch to draw" motion, they quickly adapt to it.' },
            { q: 'What skills does this develop for a preschooler?', a: 'It heavily develops gross motor shoulder stability, fine motor pincer grasp (thumb and index finger), and basic spatial awareness—all crucial pre-writing skills.' },
            { q: 'Do you offer phonics support?', a: 'Yes. The letter tracing mode includes phonetic sounds and example words for every single letter of the alphabet.' }
        ]
    },
    'for-kindergarten': {
        meta: {
            title: 'Kindergarten Educational Games — Math and Reading | Draw in the Air',
            description: 'Engaging, gesture-controlled Kindergarten activities focusing on alphabet mastery, numerical tracking up to 10, and cognitive sorting.',
            keywords: ['kindergarten learning games free', 'kindergarten reading games', 'kindergarten math games free', 'gesture learning kindergarten'],
            canonical: '/for-kindergarten'
        },
        emoji: '🎒',
        badge: 'For Kindergarteners',
        heroTitle: 'Kindergarten Readiness through Active Tech',
        heroSub: 'Prepare for first-grade success using our suite of interactive, webcam-powered tools. Students build reading foundations (A-Z) and math confidence (0-10) using only their hands.',
        faq: [
            { q: 'How does it help with Kindergarten math?', a: 'We offer modes like Number Tracing (1-10) and Sort & Place activities where kids physically move items into categorized buckets, establishing foundational set logic and counting.' },
            { q: 'Can this be used for classroom stations?', a: 'Absolutely! Since no installation is required, you can set it up on a single classroom laptop or connected smartboard in seconds as an interactive tech station.' },
            { q: 'Is it distracting with ads?', a: 'No. The interface is completely ad-free and distraction-free, explicitly designed to keep the cognitive load focused on learning, not navigating banners.' }
        ]
    }
};

export default function EducationPage({ slug }: EducationPageProps) {
    const data = EDUCATION_DATA[slug];
    if (!data) return null;

    return (
        <SeoLayout>
            <SEOMeta
                title={data.meta.title}
                description={data.meta.description}
                keywords={data.meta.keywords}
                canonical={data.meta.canonical}
            />

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
                <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: data.badge }]} />
            </div>

            <PageHero
                badge={data.badge}
                emoji={data.emoji}
                title={data.heroTitle}
                subtitle={data.heroSub}
                cta={{ label: 'Start Learning — Free ✨', path: SITE.appPath }}
            />

            <Section light>
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>Why Use Gesture Learning?</h2>
                <div style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 30 }}>
                    <p style={{ marginBottom: 15 }}>Movement is the anchor to memory. When children physically swing their arm to draw a shape or grab a sorting block, they engage multiple areas of the motor cortex at once.</p>
                    <p>This kinesthetic learning accelerates reading and math readiness up to 3x faster than passive screen tapping.</p>
                </div>
            </Section>

            <Section>
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Common Questions</h2>
                {data.faq.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
            </Section>
        </SeoLayout>
    );
}
