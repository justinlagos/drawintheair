import { SeoLayout, PageHero, Section, FAQItem } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';

interface ArticleData {
    title: string;
    description: string;
    heroSubtitle: string;
    faq: { q: string; a: string }[];
    content: React.ReactNode;
}

const ARTICLES: Record<string, ArticleData> = {
    'hand-tracking-for-kids': {
        title: 'Hand Tracking Technology for Kids | Draw in the Air',
        description: 'Discover how webcam-based hand tracking helps children learn fine motor skills and spatial awareness through interactive play without expensive VR sets.',
        heroSubtitle: 'Learn how gesture-based technology is transforming early childhood learning right from your browser.',
        faq: [
            { q: 'Is hand tracking safe for kids?', a: 'Yes! Our hand tracking runs entirely on your device (in your browser). No video data is ever sent to a server, recorded, or saved. It is 100% private and safe.' },
            { q: 'What do I need for hand tracking?', a: 'Just a laptop, tablet, or desktop with a standard webcam. No special gloves, controllers, or VR headsets are required.' },
            { q: 'How does hand tracking help early learning?', a: 'It encourages gross and fine motor skill development, spatial reasoning, and hand-eye coordination—all essential pre-writing skills.' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>What is Hand Tracking Technology?</h2>
                <p>Hand tracking is an AI-powered technology that reads your physical hand movements via a camera and maps them into a digital space. For children, it means they can interact with learning games just by moving their hands, pointing, or pinching in the air—no mouse, keyboard, or touchscreen required.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Why it Matters for Child Development</h2>
                <p>Young children learn best through active, physical movement. Traditional screen time is passive, but hand-tracking transforms it into an active experience. It engages kinesthetic learning, allowing kids to build muscle memory, spatial awareness, and hand-eye coordination. These are the very foundation blocks for later writing, reading, and mathematics.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>How Draw in the Air Supports It</h2>
                <p>Draw in the Air uses state-of-the-art Google MediaPipe technology directly in your browser. Children can trace letters, sort shapes, and play educational games simply by waving and pinching. We prioritize broad arm movements (gross motor skills) combining them with precise finger pinches (fine motor skills).</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Activities Parents and Teachers Can Try</h2>
                <ul>
                    <li><strong>Air Tracing:</strong> Go to our <a href="/letter-tracing" style={{ color: '#22d3ee' }}>Letter Tracing</a> section and let your child draw giant letters in the air.</li>
                    <li><strong>Sorting Colors:</strong> Encourage left-to-right sorting motions using our Sort and Place games.</li>
                </ul>
            </>
        )
    },
    'gesture-learning': {
        title: 'Kinesthetic and Gesture-Based Learning | Draw in the Air',
        description: 'Why movement matters. Explore the science behind kinesthetic and gesture-based learning in early childhood education.',
        heroSubtitle: 'Movement is the key to memory. Discover why gesture-based learning helps children retain information up to 3x faster.',
        faq: [
            { q: 'What is gesture-based learning?', a: 'It is a learning method where physical movements (gestures) are tied to educational concepts, helping the brain encode information through muscle memory.' },
            { q: 'Who benefits from kinesthetic learning?', a: 'Almost all early learners benefit, but it is especially helpful for children who struggle to sit still or focus on traditional worksheets (kinesthetic or tactile learners).' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>What is Gesture-Based Learning?</h2>
                <p>Gesture-based learning is a pedagogical approach that connects physical movement to cognitive tasks. When a child moves their arm to form a giant "A" in the air, they aren't just seeing the letter—they are physically experiencing it.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Why it Matters for Child Development</h2>
                <p>Neuroscience shows that coupling movement with learning engages multiple regions of the brain simultaneously. This multi-sensory approach deepens memory retention. Kinesthetic learners thrive when they can "feel" the answer. It also significantly reduces the frustration often associated with early tracing worksheets.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>How Draw in the Air Supports It</h2>
                <p>Our platform was built from the ground up to support kinesthetic learning. Instead of small, constrained finger movements on a tablet, children use their entire arm to interact with shapes and numbers, perfectly scaling the physical gesture to the digital result.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Activities Parents and Teachers Can Try</h2>
                <ul>
                    <li><strong>Shape Tracing:</strong> Start with simple activities like <a href="/trace-circle" style={{ color: '#22d3ee' }}>tracing a circle</a> using big arm swings.</li>
                    <li><strong>Stand and Trace:</strong> Connect your laptop to a TV or smartboard and have the child stand up to play, engaging their core and full body.</li>
                </ul>
            </>
        )
    },
    'drawing-skills-for-children': {
        title: 'Developing Drawing Skills in Children | Draw in the Air',
        description: 'Learn the stages of drawing development in children and how interactive air-drawing can accelerate visual-motor skills.',
        heroSubtitle: 'From scribbles to shapes. How to nurture your child\'s visual-motor integration and drawing skills.',
        faq: [
            { q: 'At what age should a child trace shapes?', a: 'Generally, children can trace simple lines by age 3, circles by age 3-4, and squares/crosses by age 4-5.' },
            { q: 'How does air drawing improve pencil drawing?', a: 'Air drawing builds the necessary shoulder and arm stability (proximal control) needed before a child can master precise finger control (distal control) with a pencil.' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>The Stages of Drawing Development</h2>
                <p>Children progress through predictable stages of drawing: from random scribbling (around age 2), to controlled scribbling, to basic shapes like circles and crosses (ages 3-4), to forming recognizable letters and objects (ages 4-6). Every stage is a crucial stepping stone in brain and motor development.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Why it Matters for Child Development</h2>
                <p>Drawing is pre-writing. The ability to copy a shape requires "visual-motor integration"—the brain's ability to translate what the eyes see into coordinated hand movements. Without this, handwriting becomes incredibly difficult and frustrating.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>How Draw in the Air Supports It</h2>
                <p>Draw in the Air allows children to practice drawing without the physical friction or grip requirements of a pencil. This removes a barrier for children with lower muscle tone, allowing them to practice the cognitive and spatial parts of drawing (the "where to move") before mastering the physical tool grip.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Activities Parents and Teachers Can Try</h2>
                <ul>
                    <li><strong>Free Paint:</strong> Let them explore unguided drawing in our <a href="/app?mode=free" style={{ color: '#22d3ee' }}>Free Paint</a> mode.</li>
                    <li><strong>Shape Practice:</strong> Move to structured shape tracing, like <a href="/trace-square" style={{ color: '#22d3ee' }}>drawing a square</a>.</li>
                </ul>
            </>
        )
    },
    'early-childhood-motor-skills': {
        title: 'Early Childhood Motor Skills Development | Draw in the Air',
        description: 'A comprehensive guide to fine and gross motor skills in early childhood and how to support them through play.',
        heroSubtitle: 'Building the foundation for handwriting, coordination, and independence.',
        faq: [
            { q: 'What is the difference between fine and gross motor skills?', a: 'Gross motor involves large muscles (arms, legs, core—like running or waving). Fine motor involves small muscles (fingers, hands, wrists—like holding a pencil or pinching).' },
            { q: 'Why is the "pincer grasp" important?', a: 'The pincer grasp (using the thumb and index finger) is a critical developmental milestone essential for feeding, buttoning clothes, and eventually holding a pencil with a mature tripod grip.' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Understanding Motor Skills</h2>
                <p>Motor skills are divided into Gross Motor (large movements) and Fine Motor (small, precise movements). Children naturally develop gross motor skills first—they learn to wave their arm from the shoulder before they learn to control a crayon with their fingertips. Development flows from proximal (close to the body) to distal (fingertips).</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Why it Matters for Child Development</h2>
                <p>Rushing a child to hold a pencil before they have shoulder and wrist stability often leads to poor grip habits and fatigue. By strengthening the gross motor pathways first, fine motor control emerges much more naturally and successfully.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>How Draw in the Air Supports It</h2>
                <p>Our platform uniquely bridges the gap between gross and fine motor skills. To play, a child must hold their arm up (gross motor shoulder stability) and pinch their thumb and index finger together (fine motor pincer grasp) to trigger the "pen down" action. This simultaneous activation is incredible occupational therapy practice.</p>

                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Activities Parents and Teachers Can Try</h2>
                <ul>
                    <li><strong>Bubble Popping:</strong> Use big swiping motions to <a href="/app?mode=calibration" style={{ color: '#22d3ee' }}>pop bubbles</a>.</li>
                    <li><strong>Number Tracing:</strong> Practice controlled, sweeping gestures by <a href="/trace-number-8" style={{ color: '#22d3ee' }}>tracing big numbers</a>.</li>
                </ul>
            </>
        )
    }
};

export default function LearnArticlePage({ slug }: { slug: string }) {
    const article = ARTICLES[slug];

    if (!article) {
        return (
            <SeoLayout>
                <div style={{ textAlign: 'center', padding: '100px 20px', color: 'white' }}>
                    <h2>Article not found.</h2>
                    <a href="/" style={{ color: '#22d3ee' }}>Return home</a>
                </div>
            </SeoLayout>
        );
    }

    return (
        <SeoLayout>
            <SEOMeta
                title={article.title}
                description={article.description}
                canonical={`/learn/${slug}`}
                structuredData={[{
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": article.title,
                    "description": article.description,
                    "author": { "@type": "Organization", "name": "Draw in the Air" }
                }]}
            />

            <PageHero
                badge="Learn Hub Article"
                emoji="📚"
                title={article.title.split(' | ')[0]}
                subtitle={article.heroSubtitle}
            />

            <Section>
                <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'left', lineHeight: 1.7, fontSize: '1.1rem', color: '#cbd5e1' }}>
                    {article.content}
                </div>
            </Section>

            <Section light>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: 24 }}>Frequently Asked Questions</h2>
                    {article.faq.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
                </div>
            </Section>
        </SeoLayout>
    );
}
