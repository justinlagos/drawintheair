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
    'ai-for-kids': {
        title: 'AI for Kids — How Hand Tracking Works | Draw in the Air',
        description: 'A simple, age-appropriate guide to AI hand tracking technology for curious children and the adults who teach them. Includes classroom activity ideas.',
        heroSubtitle: 'Demystifying AI for young learners — and the grown-ups who guide them.',
        faq: [
            { q: 'Is AI dangerous for children to use?', a: 'Not in this context. Draw in the Air uses AI only to detect hand position — no facial recognition, no identity tracking, and no data ever leaves the device. The "AI" is simply a pattern-detection system running inside the browser.' },
            { q: 'What age can children start learning about AI?', a: 'Children as young as 4 can begin to understand that computers can "see" and "learn" in a simple sense. The key is using concrete, physical examples — like seeing their own hand tracked on screen in real time.' },
            { q: 'How do I explain hand tracking AI to a 5-year-old?', a: 'Try this: "The computer can see your hand through the camera, and it has learned what a finger looks like by looking at thousands of photos. It uses that to guess where your finger is." That\'s the honest, age-appropriate truth.' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>What is AI, Really?</h2>
                <p>AI stands for Artificial Intelligence — but don't let the name intimidate you or your students. At its core, AI is just a computer program that has been trained to recognise patterns. It's not magic, and it's not a robot brain. It's pattern-matching at very high speed.</p>
                <p>The AI in Draw in the Air was trained on thousands of images of hands. It learned to spot hands in new images — and specifically, to identify 21 key landmarks (joints and fingertips). That's it. It doesn't know who you are, it doesn't learn from your child's sessions, and it runs entirely inside the browser.</p>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>How Hand Tracking Works — Step by Step</h2>
                <p>When a child holds their hand up to the webcam, here's what happens in about 30 milliseconds:</p>
                <ul>
                    <li>The webcam captures a frame of video (just an image, like a photo)</li>
                    <li>Google's MediaPipe AI model runs inside the browser and scans the image</li>
                    <li>It identifies 21 "landmarks" on the hand — each knuckle, each fingertip, the wrist</li>
                    <li>It calculates the 3D position of each point</li>
                    <li>The app uses those coordinates to move the cursor and detect pinch gestures</li>
                    <li>This happens 30 times per second — creating smooth, real-time tracking</li>
                </ul>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Teaching the Concept in Class</h2>
                <p>Draw in the Air is a perfect, concrete introduction to AI in the classroom. Instead of abstract explanations, children can <em>see the AI working on their own body in real time</em>. Try these discussion starters:</p>
                <ul>
                    <li>"What do you think the computer can see right now?" (show the webcam feed)</li>
                    <li>"What if you wore a glove — would it still track?" (It struggles — great critical thinking!)</li>
                    <li>"What else do you think computers have learned to recognise?" (faces, speech, objects)</li>
                    <li>Try our <a href="/trace-a" style={{ color: '#22d3ee' }}>letter tracing activity</a> while discussing how the AI follows the finger</li>
                </ul>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Privacy: What the AI Does NOT Do</h2>
                <p>It's worth being explicit with parents and children: the hand tracking AI does not recognise faces, does not store any video, and does not identify individuals. It only outputs a set of numbers (the hand landmark coordinates). The moment the browser tab is closed, nothing is retained. Draw in the Air's privacy commitments are absolute.</p>
            </>
        )
    },
    'screen-time-alternatives': {
        title: 'Screen-Time Alternatives for Kids | Draw in the Air',
        description: 'Not all screen time is equal. How active, gesture-based learning differs from passive watching — and what that means for development.',
        heroSubtitle: 'Rethinking screen time: why how children use screens matters more than how long.',
        faq: [
            { q: 'How much screen time is too much for a 4-year-old?', a: 'The American Academy of Pediatrics recommends limiting passive entertainment screen time to 1 hour per day for ages 2-5. However, interactive, educational screen use (like gesture-based learning) is treated differently because the child is actively engaged — not passively watching.' },
            { q: 'Is interactive screen time better than passive screen time?', a: 'Research consistently shows that interactive, goal-directed screen use produces better developmental outcomes than passive consumption. Co-viewing with a parent and discussing content further improves outcomes for all screen types.' },
            { q: 'Does Draw in the Air count as screen time?', a: 'Technically yes, but it\'s in a different category than watching videos. Children are physically moving, problem-solving, and being challenged. It\'s closer to interactive play than entertainment — similar to how educational board games differ from television.' }
        ],
        content: (
            <>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Not All Screens Are Equal</h2>
                <p>The phrase "screen time" has become a catch-all that groups together watching cartoons, playing gesture games, video calling a grandparent, and building in Scratch. These experiences produce profoundly different outcomes in child development. The key distinction isn't duration — it's the nature of the engagement.</p>
                <p>Researchers now talk about "passive" vs "interactive" vs "communicative" screen time, each with a different developmental profile. Draw in the Air sits firmly in the interactive category — and leans heavily toward physical engagement.</p>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>What Makes Gesture Learning Different</h2>
                <p>When a child uses Draw in the Air, they are:</p>
                <ul>
                    <li><strong>Moving their body</strong> — raising their arm, controlling their fingers, tracking objects visually</li>
                    <li><strong>Problem-solving</strong> — figuring out how to hit a target, complete a trace, or sort a category</li>
                    <li><strong>Getting immediate feedback</strong> — every movement has a visible, instant consequence on screen</li>
                    <li><strong>Building towards a goal</strong> — tracing a letter, completing a set, reaching a score</li>
                </ul>
                <p>Contrast this with passive video consumption: the child's body is still, the outcome is predetermined regardless of their attention, and there is no feedback loop.</p>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>Practical Alternatives to Passive Screen Time</h2>
                <p>Rather than simply reducing screen time, consider redirecting it toward active digital tools. Some ideas:</p>
                <ul>
                    <li>Replace 10 minutes of video with <a href="/activities/bubble-pop" style={{ color: '#22d3ee' }}>Bubble Pop</a> — physical, reflexive, and energising</li>
                    <li>Swap tablet games with <a href="/letter-tracing" style={{ color: '#22d3ee' }}>Letter Tracing</a> — builds the same muscle memory as pencil practice</li>
                    <li>Use <a href="/activities/sort-and-place" style={{ color: '#22d3ee' }}>Sort & Place</a> as a cognitive transition activity between passive and active time</li>
                    <li>Try <a href="/free-paint" style={{ color: '#22d3ee' }}>Free Paint</a> mode for creative, open-ended digital art that replaces scrolling</li>
                </ul>
                <h2 style={{ color: 'white', fontSize: '1.6rem', marginTop: '2rem' }}>The Parent's Role</h2>
                <p>Whatever screen activity your child is doing, co-engagement makes it significantly more beneficial. Sitting alongside a child using Draw in the Air and narrating what you see — "Oh, you're drawing an A! What sound does A make?" — transforms a solo digital activity into a rich language and learning experience.</p>
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
