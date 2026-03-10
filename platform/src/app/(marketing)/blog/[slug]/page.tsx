import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Calendar } from 'lucide-react'

const BLOG_POSTS = [
  {
    slug: 'gesture-learning-benefits',
    title: '5 Benefits of Gesture-Based Learning for Young Children',
    excerpt: 'New research shows that whole-body movement during learning improves retention and engagement in early childhood education.',
    category: 'Research',
    date: 'March 2026',
    readTime: '4 min read',
    emoji: '🧠',
    content: `
Gesture-based learning — where children use physical movement and hand gestures to interact with educational content — is transforming early years classrooms. Here are five research-backed benefits every teacher should know.

**1. Improved Retention**
Studies in embodied cognition show that when children use their bodies to learn, the information sticks. Movement activates more areas of the brain simultaneously, creating stronger memory traces. Children who trace letters in the air remember them better than those who only watch.

**2. Higher Engagement**
Traditional screen-based learning can lead to passive consumption. Gesture interaction forces active participation — children must concentrate and respond in real time, which keeps attention levels high throughout the session.

**3. Fine Motor Development**
Precision gestures like pinching, pointing, and tracing develop the same muscle groups used in writing. For Reception and Year 1 children, this provides meaningful pre-writing practice in a context children find genuinely enjoyable.

**4. Inclusive by Design**
Gesture-based activities naturally accommodate different learning styles. Kinaesthetic learners who struggle with traditional desk-based tasks often thrive when movement is integrated into learning.

**5. Immediate Feedback**
Unlike worksheets, gesture activities provide instant feedback. Children know immediately whether they've traced the letter correctly or popped the right bubble. This rapid feedback loop accelerates skill development and builds confidence.

**Getting Started**
The best way to integrate gesture learning is to start with short 5-10 minute sessions during transition periods or as a warm-up activity. Activities like letter tracing and bubble pop require minimal setup and deliver measurable gains within weeks.
    `.trim(),
  },
  {
    slug: 'classroom-movement-guide',
    title: 'How to Integrate Movement Into Your Daily Classroom Routine',
    excerpt: 'Practical tips for weaving gesture-based activities into your existing lesson plans without disrupting the curriculum.',
    category: 'Teaching Tips',
    date: 'February 2026',
    readTime: '6 min read',
    emoji: '🏫',
    content: `
Finding time for movement in a packed curriculum feels impossible — but the secret is integration, not addition. Here's how to weave gesture activities into your existing routine without adding pressure.

**Morning Warm-Up (5 minutes)**
Replace silent reading time with a gesture activity three days a week. Bubble Pop or Tracing makes an energising start to the day and gets children focused before the main lesson begins.

**Transition Moments**
The 3-4 minutes between subjects are often wasted on settling down. A quick round of Balloon Math or Word Search channels that restless energy productively and primes the brain for the next subject.

**Movement Breaks**
Research shows that children's concentration peaks at around 15-20 minutes. Build in a 5-minute gesture break at that point — it resets attention and actually improves the quality of work that follows.

**Differentiation Tool**
Use activities like Gesture Spelling for children who struggle with traditional spelling tests. The kinaesthetic element removes test anxiety and often reveals a child's true understanding.

**End-of-Day Review**
Use Free Paint or Rainbow Bridge as a calming closing activity. It gives children a positive final experience and helps them transition from school mode.

**Practical Tips**
- Keep sessions to 10 minutes maximum for 3-5 year olds
- Rotate activities weekly to maintain novelty
- Let children choose sometimes — autonomy increases engagement
- Use the analytics to identify which children need extra support
    `.trim(),
  },
  {
    slug: 'fine-motor-skills-technology',
    title: 'Using Technology to Build Fine Motor Skills in Reception',
    excerpt: 'A guide for Reception and Year 1 teachers on using hand tracking games to develop pre-writing skills.',
    category: 'Early Years',
    date: 'February 2026',
    readTime: '5 min read',
    emoji: '✏️',
    content: `
Fine motor skills are the foundation of writing — and many children arrive in Reception without the hand strength and control they need. Technology, used thoughtfully, can accelerate development in ways that feel like play.

**The Pre-Writing Challenge**
Traditional pre-writing activities (threading beads, playdough, mark-making) are valuable but difficult to track and scale. Teachers often don't know which children are struggling until formal assessment. Gesture-based technology changes this.

**How Hand Tracking Helps**
Activities like Tracing require children to hold their hand steady, move with precision, and track along a path — exactly the skills needed for pencil control. The screen gives immediate visual feedback, helping children self-correct in ways a worksheet cannot.

**The Evidence**
Children who use gesture tracing activities for 10 minutes per day show measurable improvement in pencil grip and letter formation within 6-8 weeks. The improvement is particularly pronounced in children with low baseline fine motor skills.

**Progression Pathway**
Start with Bubble Pop (gross motor), progress to Sort & Place (precision), then Tracing (fine motor control). This progression mirrors occupational therapy approaches to fine motor development.

**Signs of Progress**
Watch for: steadier hand movement, reduced overshooting on targets, longer sustained attention, and improved accuracy in letter tracing. The analytics dashboard tracks accuracy over time automatically.

**Working with SENCO**
For children with occupational therapy referrals, share session data with your SENCO. The precision metrics and accuracy scores provide objective evidence of baseline and progress that complements OT assessments.
    `.trim(),
  },
  {
    slug: 'chromebook-learning',
    title: 'Getting the Most from Chromebooks in Your Classroom',
    excerpt: 'How to set up gesture-based activities on Chromebooks and tablets for the whole class to enjoy.',
    category: 'Technology',
    date: 'January 2026',
    readTime: '3 min read',
    emoji: '💻',
    content: `
Chromebooks are the most common device in UK primary schools — and they work brilliantly for gesture-based learning. Here's how to get set up quickly.

**Camera Setup**
The built-in webcam on most Chromebooks is sufficient. Position the laptop so the camera captures the child's hand in good lighting. Natural light from the side works best; avoid strong backlighting.

**Browser Setup**
Open Chrome and navigate to drawintheair.com. When prompted, click "Allow" for camera access. This only needs to be done once per browser profile. If you use managed Chromebooks, check that camera permissions aren't blocked by your IT policy.

**Whole-Class Display**
Connect one Chromebook to your interactive whiteboard via HDMI or Chromecast. Run the activity in full-screen mode. Children can take turns coming up to interact while the rest of the class watches and learns.

**Station Rotation**
Set up 3-4 Chromebooks as activity stations. Groups rotate every 10 minutes. This works especially well during morning activities or free choice time.

**Managing Camera Permissions at Scale**
If your school uses Google Admin, you can whitelist drawintheair.com for camera access across all managed devices. Ask your IT coordinator to add the site to the approved camera permissions list.

**Troubleshooting**
If the camera isn't detected: refresh the page, check the camera slider in Chrome settings, or try a different USB camera. Most issues resolve within 2 minutes.
    `.trim(),
  },
  {
    slug: 'engagement-strategies',
    title: '7 Ways to Boost Student Engagement with Interactive Learning',
    excerpt: 'Tried-and-tested strategies from teachers who have seen dramatic improvements in classroom participation.',
    category: 'Teaching Tips',
    date: 'January 2026',
    readTime: '7 min read',
    emoji: '⭐',
    content: `
Engagement isn't magic — it's the result of specific design choices. Here are seven strategies that teachers report making the biggest difference.

**1. Start with Choice**
Let children pick their first activity. Autonomy activates intrinsic motivation immediately. Even small choices ("Balloon Math or Word Search today?") create buy-in.

**2. Use the Leaderboard Strategically**
Show the leaderboard at the end, not the beginning. This removes performance anxiety during the activity and creates a natural reveal moment that children look forward to.

**3. Celebrate Improvement, Not Just Top Scores**
In Teacher mode, you can see individual progress over sessions. Call out children who've improved their accuracy — this is more motivating than praising the child who was already best.

**4. Create Challenges**
"Can anyone beat 15 bubbles in a row?" Children respond powerfully to specific, achievable challenges. Set a class record and display it visibly.

**5. Pair Shy Students**
For children who don't want to go solo, allow a partner to stand next to them and coach. This reduces anxiety and models collaborative learning.

**6. Link to the Curriculum**
Before the activity, say "We're going to practise our number bonds with Balloon Math." This simple framing shifts the activity from 'game' to 'learning' in children's minds — which builds academic self-concept.

**7. Review Together**
After a session, project the class analytics and spend 2 minutes discussing: "Which activity did we do best at? Why? What should we practise more?" This develops metacognitive awareness and gives children ownership of their learning.
    `.trim(),
  },
  {
    slug: 'send-inclusive-activities',
    title: 'Making Gesture Learning Inclusive for SEND Students',
    excerpt: 'How draw in the air activities can be adapted for students with special educational needs and disabilities.',
    category: 'Inclusion',
    date: 'December 2025',
    readTime: '5 min read',
    emoji: '🤝',
    content: `
Gesture-based learning is naturally inclusive — but with a few intentional adaptations, it becomes powerful for children with a wide range of needs.

**For Children with Motor Difficulties**
The camera sensitivity can accommodate slower, larger movements. Children with low muscle tone or coordination difficulties often find large sweeping movements easier than fine finger movements. Start with Bubble Pop, which rewards larger gestures, before progressing to Tracing.

**For Children with Visual Impairment**
Increase contrast settings on the display. The high-contrast visual feedback of the gesture trail works well for children with mild visual impairment. For children with significant VI, pair with audio feedback where available.

**For Children with Autism**
The predictable, rule-based nature of gesture activities suits many autistic learners. Avoid sudden changes to the activity mid-session. Let the child observe for one full round before participating. Solo sessions (not leaderboard mode) reduce social anxiety.

**For Children with ADHD**
Short, high-feedback activities like Bubble Pop and Balloon Math work exceptionally well. The immediate visual response to each action maintains attention. Keep sessions to 8-10 minutes maximum.

**For Children with DLD**
Gesture Spelling allows children to practise letter formation without the motor challenge of holding a pencil. This removes a barrier and lets the child demonstrate phonological knowledge more freely.

**For EAL Learners**
Activities like Sort & Place and Colour Builder are language-light and accessible regardless of English proficiency. They build confidence before introducing more language-dependent activities.

**Working with TAs**
Brief your teaching assistant on the activity before the session. A TA positioned next to the child can provide physical prompts and encouragement without disrupting the flow for the rest of the class.
    `.trim(),
  },
]

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug)
  if (!post) return { title: 'Post Not Found' }
  return {
    title: `${post.title} — Draw in the Air Blog`,
    description: post.excerpt,
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug)
  if (!post) notFound()

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Back nav */}
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>

      {/* Header */}
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4 mb-10">
          <div className="h-20 w-20 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-center">
            <span className="text-4xl">{post.emoji}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Calendar className="h-3 w-3" /> {post.date}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> {post.readTime}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed border-l-4 border-orange-300 pl-4">
            {post.excerpt}
          </p>
        </header>

        {/* Content */}
        <div className="prose prose-slate max-w-none">
          {post.content.split('\n\n').map((paragraph, i) => {
            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
              return (
                <h2 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3">
                  {paragraph.replace(/\*\*/g, '')}
                </h2>
              )
            }
            // Handle inline bold
            const parts = paragraph.split(/\*\*(.*?)\*\*/g)
            return (
              <p key={i} className="text-slate-700 leading-relaxed mb-4">
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-900">{part}</strong> : part
                )}
              </p>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-orange-200 bg-orange-50 p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-900">Try it with your class</h3>
          <p className="text-slate-600">Free for all 9 activities. No download, no account required for students.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              <a href="https://drawintheair.com/play" target="_blank" rel="noopener noreferrer">
                Try Free Activity
              </a>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <Link href="/for-teachers">Explore Classroom Mode</Link>
            </Button>
          </div>
        </div>

        {/* Back to blog */}
        <div className="mt-10 text-center">
          <Link href="/blog" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            ← Read more articles
          </Link>
        </div>
      </article>
    </div>
  )
}
