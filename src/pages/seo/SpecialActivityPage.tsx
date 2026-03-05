import { SeoLayout, Breadcrumb, PageHero, Section } from './SeoLayout';
import { SEOMeta } from '../../seo/SEOMeta';
import { SITE } from '../../seo/seo-config';

type SpecialSlug =
    | 'christmas-drawing-for-kids'
    | 'halloween-drawing-kids'
    | 'back-to-school-activities'
    | 'valentines-drawing-kids'
    | 'easter-drawing-kids'
    | 'summer-activities-kids'
    | 'thanksgiving-kids-activities'
    | 'mothers-day-drawing-kids'
    | 'draw-number-in-air'
    | 'air-drawing-challenge'
    | 'draw-circle-in-air';

interface SpecialActivityPageProps {
    slug: SpecialSlug;
}

const SPECIAL_DATA: Record<SpecialSlug, {
    meta: { title: string; description: string; keywords: string[]; canonical: string; };
    emoji: string;
    badge: string;
    heroTitle: string;
    heroSub: string;
    tips: { icon: string; title: string; desc: string }[];
    isViral?: boolean;
}> = {
    // SEASONAL
    'christmas-drawing-for-kids': {
        meta: {
            title: 'Christmas Drawing for Kids — Free Festive Air Drawing | Draw in the Air',
            description: 'Celebrate Christmas with fun air drawing activities! Draw stars, Christmas trees, and festive shapes in the air using just your finger and a webcam. Free, no download.',
            keywords: ['christmas drawing for kids', 'festive kids activities online', 'christmas learning game free', 'draw christmas shapes kids'],
            canonical: '/activities/christmas-drawing-for-kids'
        },
        emoji: '🎄', badge: 'Festive Holiday Fun', heroTitle: 'Draw Christmas Magic in the Air!', heroSub: 'Grab your digital paintbrush! Celebrate the season by tracing Christmas trees, stars, and snowflakes using your webcam.',
        tips: [
            { icon: '⭐', title: 'Trace a Star', desc: 'Can you draw the perfect star to top the tree?' },
            { icon: '❄️', title: 'Snowflake Swirls', desc: 'Use Free Paint to create unique winter magic.' }
        ]
    },
    'halloween-drawing-kids': {
        meta: {
            title: 'Halloween Drawing for Kids — Free Spooky Air Activities | Draw in the Air',
            description: 'Get spooky with Halloween air drawing! Draw ghosts, pumpkins, and spooky shapes in the air using your finger and webcam. Free, no download, perfect for Halloween.',
            keywords: ['halloween drawing for kids', 'halloween kids activities online', 'spooky drawing game children', 'halloween learning games free'],
            canonical: '/activities/halloween-drawing-kids'
        },
        emoji: '🎃', badge: 'Spooky Seasonal Play', heroTitle: 'Spooky Hand-Tracking Magic!', heroSub: 'Trace perfect pumpkins, ghostly swoops, and spider webs by moving your fingers in front of the camera.',
        tips: [
            { icon: '👻', title: 'Ghost Mode', desc: 'Swoop your hand fast to draw spooky shapes!' },
            { icon: '🌙', title: 'Witch\'s Moon', desc: 'Can you trace a perfect round circle for the moon?' }
        ]
    },
    'back-to-school-activities': {
        meta: {
            title: 'Back to School Activities — Free Digital Learning for Kids | Draw in the Air',
            description: 'Start the school year right with free, browser-based learning activities! Practice letters, numbers, and shapes in the air. No download, no login needed. Perfect for ages 3–8.',
            keywords: ['back to school activities kids', 'back to school learning games', 'school readiness activities', 'kindergarten readiness games online'],
            canonical: '/activities/back-to-school-activities'
        },
        emoji: '🎒', badge: 'Back to School Ready', heroTitle: 'Get Ready for School with Air Writing!', heroSub: 'Kick off the school year! Practice A-Z letters and 1-10 counting in the air to build confidence before the first day.',
        tips: [
            { icon: '✏️', title: 'Pencil-Free Practice', desc: 'Build motor skills completely hands-free.' },
            { icon: '🔤', title: 'Alphabet Warmup', desc: 'Crush the ABCs before school even begins!' }
        ]
    },
    'valentines-drawing-kids': {
        meta: {
            title: 'Valentines Drawing for Kids — Shape Tracing & Art | Draw in the Air',
            description: 'Draw hearts in the air for Valentine\'s Day! A free, webcam-based interactive drawing game for kids. No login required.',
            keywords: ['valentines drawing kids', 'heart tracing game', 'kids valentine activity free'],
            canonical: '/activities/valentines-drawing-kids'
        },
        emoji: '💖', badge: 'Valentine\'s Day Fun', heroTitle: 'Trace Hearts in the Air!', heroSub: 'Show some love by using the webcam to trace giant geometric hearts and create lovely digital art in the air.',
        tips: [
            { icon: '💘', title: 'The Perfect Heart', desc: 'Can you match the heart outline exactly?' },
            { icon: '🎨', title: 'Paint it Red', desc: 'Use the color palette in Free Paint to draw a masterpiece.' }
        ]
    },
    'easter-drawing-kids': {
        meta: {
            title: 'Easter Drawing for Kids — Oval Shapes & Tracing | Draw in the Air',
            description: 'Draw Easter eggs in the air! A free, browser-based shape tracing game using just your webcam and index finger.',
            keywords: ['easter activities for kids online', 'draw easter egg game', 'kids spring shapes app'],
            canonical: '/activities/easter-drawing-kids'
        },
        emoji: '🐰', badge: 'Spring Activities', heroTitle: 'Draw the Perfect Easter Egg!', heroSub: 'Spring is here! Practice tracing perfect egg ovals and bunny shapes through interactive webcam tracking.',
        tips: [
            { icon: '🥚', title: 'Oval Mastery', desc: 'Hop into Shape Tracing to practice ovals.' },
            { icon: '🌸', title: 'Spring Colors', desc: 'Freestyle your own garden in our drawing suite.' }
        ]
    },
    'summer-activities-kids': {
        meta: {
            title: 'Summer Learning Activities for Kids | Draw in the Air',
            description: 'Beat the summer slide! Free interactive air drawing, spelling, and counting games to keep preschool and kindergarten minds sharp over the break.',
            keywords: ['summer learning games for kids free', 'prevent summer slide kindergarten', 'summer digital activities'],
            canonical: '/activities/summer-activities-kids'
        },
        emoji: '☀️', badge: 'Summer Break Learning', heroTitle: 'Beat the "Summer Slide"!', heroSub: 'Keep those young brains sharp all break long! 10 minutes of active air-tracing a day helps retain A-Z and 1-10 knowledge without boring worksheets.',
        tips: [
            { icon: '🏖️', title: 'Quick Daily Practice', desc: 'Trace 3 letters a day to stay fresh.' },
            { icon: '🫧', title: 'Pop some Bubbles', desc: 'Keep reflexes sharp in Bubble Pop mode.' }
        ]
    },
    'thanksgiving-kids-activities': {
        meta: {
            title: 'Thanksgiving Activities for Kids — Interactive Learning | Draw in the Air',
            description: 'Free Thanksgiving and autumn drawing activities for children. Practice fine motor skills while drawing hand-turkeys in the air!',
            keywords: ['thanksgiving activities online kids', 'draw turkey shape game', 'autumn learning kids'],
            canonical: '/activities/thanksgiving-kids-activities'
        },
        emoji: '🦃', badge: 'Autumn / Thanksgiving', heroTitle: 'Draw a Digital Hand Turkey!', heroSub: 'Use Free Paint mode to trace your own hand right on the screen. A classic Thanksgiving activity upgraded with AI hand-tracking!',
        tips: [
            { icon: '🍂', title: 'Fall Colors', desc: 'Explore reds, oranges, and yellows in Free Paint.' },
            { icon: '✋', title: 'Hand Turkey Magic', desc: 'Literally track your hand to draw a turkey.' }
        ]
    },
    'mothers-day-drawing-kids': {
        meta: {
            title: 'Mothers Day Drawing for Kids | Draw in the Air',
            description: 'Draw a digital bouquet of flowers for Mother\'s Day! Use AI webcam hand tracking to paint freely in the browser. Free, no download.',
            keywords: ['mothers day drawing for kids online', 'draw flowers kids game free', 'mothers day tech activity'],
            canonical: '/activities/mothers-day-drawing-kids'
        },
        emoji: '💐', badge: 'Mother\'s Day Activity', heroTitle: 'Draw Flowers in the Air!', heroSub: 'Paint a beautiful, custom digital bouquet for Mom using nothing but your finger and the webcam.',
        tips: [
            { icon: '🌹', title: 'Draw a Rose', desc: 'Use Free Paint to swirl circles and lines together.' },
            { icon: '📸', title: 'Take a Screenshot', desc: 'Save your digital artwork to show Mom later!' }
        ]
    },

    // VIRAL CHALLENGES
    'draw-number-in-air': {
        isViral: true,
        meta: {
            title: 'The Air Drawing Challenge — Draw a Number in the Air | Draw in the Air',
            description: 'Try the challenge! Can you trace numbers 1-10 in the air flawlessly using your webcam? Play instantly, free.',
            keywords: ['draw number in air challenge', 'air drawing game online', 'webcam number challenge'],
            canonical: '/draw-number-in-air'
        },
        emoji: '💯', badge: 'Viral Challenge', heroTitle: 'The 1-10 Number Challenge!', heroSub: 'Think it\'s easy? Try tracing from Number 1 to 10 back to back in the air with our AI gesture detection! Challenge friends and family.',
        tips: [
            { icon: '🥇', title: 'Go for a High Score', desc: 'Complete all 10 without making a mistake!' },
            { icon: '⏱️', title: 'Speed Run', desc: 'How fast can you trace the whole sequence?' }
        ]
    },
    'air-drawing-challenge': {
        isViral: true,
        meta: {
            title: 'The Ultimate Air Drawing Challenge | Draw in the Air',
            description: 'Step up to the webcam and test your coordination in the ultimate air drawing challenge. Trace, sort, and pop using just your index finger!',
            keywords: ['air drawing challenge', 'tiktok drawing game', 'webcam drawing challenge kids'],
            canonical: '/air-drawing-challenge'
        },
        emoji: '🔥', badge: 'Viral Challenge', heroTitle: 'The Ultimate Air Drawing Test!', heroSub: 'Test your spatial awareness and fine motor control. Jump into an empty Free Paint canvas and try to draw a house without lifting your finger.',
        tips: [
            { icon: '🏠', title: 'The House Challenge', desc: 'Can you draw a square base and triangle roof seamlessly?' },
            { icon: '🤳', title: 'Film it', desc: 'It\'s harder than it looks! Share your result.' }
        ]
    },
    'draw-circle-in-air': {
        isViral: true,
        meta: {
            title: 'Draw a Perfect Circle in the Air | Draw in the Air',
            description: 'Challenge your friends: Can you draw a perfect circle in the air? Our AI webcam tracking will judge your accuracy. Play free instantly.',
            keywords: ['draw circle in the air challenge', 'perfect circle game free', 'air circle drawing'],
            canonical: '/draw-circle-in-air'
        },
        emoji: '⭕', badge: 'Viral Challenge', heroTitle: 'Draw a Perfect Circle in the Air!', heroSub: 'It\'s incredibly tricky! Step back from your webcam, hold up your finger, and try to sketch a mathematically perfect circle in the air. How steady is your hand?',
        tips: [
            { icon: '📐', title: 'Perfect Accuracy', desc: 'Try matching our shape-tracing outlines.' },
            { icon: '💪', title: 'Whole Arm Motion', desc: 'Pro tip: Use your shoulder, not just your wrist!' }
        ]
    }
};

export default function SpecialActivityPage({ slug }: SpecialActivityPageProps) {
    const data = SPECIAL_DATA[slug];
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
                <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: data.isViral ? 'Challenges' : 'Activities' }]} />
            </div>

            <PageHero
                badge={data.badge}
                emoji={data.emoji}
                title={data.heroTitle}
                subtitle={data.heroSub}
                cta={{ label: data.isViral ? 'Accept Challenge! ✨' : 'Start Playing ✨', path: SITE.appPath }}
            />

            <Section light>
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>How It Works</h2>
                <div style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 30 }}>
                    <p style={{ marginBottom: 15 }}>Just open the app—no downloads required. When prompted, allow webcam access (processed 100% locally and privately).</p>
                    <p>Raise your index finger, pinch it with your thumb to grab your digital pen, and start drawing right in the air!</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 40 }}>
                    {data.tips.map(t => (
                        <div key={t.title} style={{ background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 12, padding: 20 }}>
                            <div style={{ fontSize: '2rem', marginBottom: 8 }}>{t.icon}</div>
                            <div style={{ color: 'white', fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.84rem' }}>{t.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>
        </SeoLayout>
    );
}
