import type { Metadata } from 'next'
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Activities — Draw in the Air',
  description: 'Explore 9 gesture-based learning activities: letter tracing, word search, balloon maths, rainbow bridge, colour builder, and more. Designed for children aged 3–7.',
  openGraph: {
    title: 'Activities — Draw in the Air',
    description: '9 gesture activities for early years: tracing, maths, word search, spelling, and more.',
    type: 'website',
  },
}

const gameUrl = process.env.NEXT_PUBLIC_GAME_URL ?? 'https://drawintheair.com'

export default function ActivitiesPage() {
  const activities = [
    {
      emoji: '🫧',
      name: 'Bubble Pop',
      description: 'Tap and pop bubbles as they float across the screen. Build hand-eye coordination and reaction time.',
      ageRange: '3-7 years',
      skills: ['Hand-eye coordination', 'Reaction time', 'Motor control'],
      mode: 'bubble-pop',
    },
    {
      emoji: '✏️',
      name: 'Tracing',
      description: 'Trace shapes and letters in the air. Develop pre-writing skills and letter recognition.',
      ageRange: '3-7 years',
      skills: ['Pre-writing skills', 'Letter recognition', 'Fine motor control'],
      mode: 'tracing',
    },
    {
      emoji: '🏠',
      name: 'Sort & Place',
      description: 'Sort objects by color, size, or shape. Learn categorization and spatial reasoning.',
      ageRange: '4-7 years',
      skills: ['Categorization', 'Spatial awareness', 'Problem-solving'],
      mode: 'sort-place',
    },
    {
      emoji: '📖',
      name: 'Word Search',
      description: 'Find hidden words and tap them to score points. Boost literacy and focus skills.',
      ageRange: '4-7 years',
      skills: ['Letter recognition', 'Focus', 'Early literacy'],
      mode: 'word-search',
    },
    {
      emoji: '🎨',
      name: 'Colour Builder',
      description: 'Mix colors and create patterns. Learn color recognition and artistic expression.',
      ageRange: '3-7 years',
      skills: ['Color recognition', 'Creativity', 'Fine motor skills'],
      mode: 'colour-builder',
    },
    {
      emoji: '🎲',
      name: 'Balloon Math',
      description: 'Pop balloons to solve simple addition and subtraction problems. Make numeracy playful.',
      ageRange: '4-7 years',
      skills: ['Numeracy', 'Addition/subtraction', 'Number recognition'],
      mode: 'balloon-math',
    },
    {
      emoji: '🌈',
      name: 'Rainbow Bridge',
      description: 'Match colors and complete patterns. Develop visual discrimination and pattern recognition.',
      ageRange: '3-7 years',
      skills: ['Pattern matching', 'Color recognition', 'Logic'],
      mode: 'rainbow-bridge',
    },
    {
      emoji: '✍️',
      name: 'Gesture Spelling',
      description: 'Spell words by forming letter shapes with your hands. Master letter formation playfully.',
      ageRange: '4-7 years',
      skills: ['Letter formation', 'Spelling', 'Phonics'],
      mode: 'gesture-spelling',
    },
    {
      emoji: '🎭',
      name: 'Free Paint',
      description: 'Paint freely using hand gestures. Express creativity without boundaries or scoring.',
      ageRange: '3-7 years',
      skills: ['Creativity', 'Gross motor control', 'Self-expression'],
      mode: 'free-paint',
    },
  ];

  return (
    <div className="bg-slate-50">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-sm font-medium mb-2">
            9 Activities
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900">
            Activities for Every Learner
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Each activity is designed to build foundational skills in literacy, numeracy, and motor development. All powered by gesture-based interaction.
          </p>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="group relative rounded-xl border border-slate-200 bg-white p-8 hover:border-orange-300 transition-all duration-300 hover:shadow-lg shadow-sm overflow-hidden"
            >
              {/* Hover tint */}
              <div className="absolute inset-0 bg-orange-50/0 group-hover:bg-orange-50/40 transition-all duration-300 rounded-xl" />

              <div className="relative space-y-5">
                {/* Emoji & Name */}
                <div>
                  <div className="text-5xl mb-3">{activity.emoji}</div>
                  <h3 className="text-xl font-bold text-slate-900">{activity.name}</h3>
                </div>

                {/* Description */}
                <p className="text-slate-600 leading-relaxed text-sm">
                  {activity.description}
                </p>

                {/* Age Range */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest">Age range</p>
                  <p className="text-slate-700 text-sm">{activity.ageRange}</p>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest">Skills developed</p>
                  <div className="flex flex-wrap gap-2">
                    {activity.skills.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="inline-block px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-3 border-t border-slate-100">
                  <Button
                    asChild
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-all duration-300"
                  >
                    <a href={`${gameUrl}/play`} target="_blank" rel="noopener noreferrer">
                      Try Now
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Learning Outcomes */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-12">What children develop</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="text-4xl">🧠</div>
            <h3 className="text-xl font-bold text-slate-900">Cognitive Skills</h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>• Problem-solving</li>
              <li>• Pattern recognition</li>
              <li>• Memory and focus</li>
              <li>• Decision-making</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="text-4xl">🤲</div>
            <h3 className="text-xl font-bold text-slate-900">Motor Skills</h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>• Hand-eye coordination</li>
              <li>• Fine motor control</li>
              <li>• Gross motor development</li>
              <li>• Balance and spatial awareness</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-8 space-y-4 shadow-sm">
            <div className="text-4xl">📚</div>
            <h3 className="text-xl font-bold text-slate-900">Academic Skills</h3>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li>• Early literacy foundations</li>
              <li>• Number recognition</li>
              <li>• Letter formation</li>
              <li>• Color and shape knowledge</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How to Use in Classroom */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">How to use in your classroom</h2>

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-10 space-y-8">
          {[
            { icon: '🎯', title: 'Whole Class', text: 'Run an activity for the entire class to focus on specific skills. Use leaderboards for engagement. Perfect for teaching moments and skill introduction.' },
            { icon: '👥', title: 'Small Groups', text: 'Create focused small-group sessions to differentiate learning. Build confidence and target specific skill gaps with personalized support.' },
            { icon: '🏠', title: 'Intervention', text: 'Use activities for targeted intervention. Our analytics show exactly which skills need extra practice, making your intervention evidence-based.' },
            { icon: '🎮', title: 'Free Play', text: 'Let children play freely during breaks or choice time. Learning happens through play, and children develop confidence and intrinsic motivation.' },
          ].map((item, i) => (
            <div key={i} className="space-y-2">
              <h3 className="text-base font-bold text-slate-900">{item.icon} {item.title}</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Activity Recommendations */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Find the right activity</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'For Early Literacy', items: [{ emoji: '📖', name: 'Word Search' }, { emoji: '✏️', name: 'Tracing' }, { emoji: '✍️', name: 'Gesture Spelling' }] },
            { title: 'For Numeracy', items: [{ emoji: '🎲', name: 'Balloon Math' }, { emoji: '🏠', name: 'Sort & Place' }, { emoji: '🫧', name: 'Bubble Pop' }] },
            { title: 'For Motor Development', items: [{ emoji: '🎨', name: 'Colour Builder' }, { emoji: '🌈', name: 'Rainbow Bridge' }, { emoji: '🎭', name: 'Free Paint' }] },
          ].map((group, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">{group.title}</h3>
              <ul className="space-y-2 text-slate-600 text-sm">
                {group.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    <span>{item.emoji}</span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Teacher Tips */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Teacher tips for success</h2>

        <div className="space-y-3">
          {[
            { title: 'Mix activities throughout the day', tip: 'Alternate between literacy, numeracy, and motor-focused activities to keep things fresh and address different learning needs.' },
            { title: 'Use analytics to guide intervention', tip: 'Check the end-of-session analytics. If a child struggles with pattern matching, focus on Rainbow Bridge next session.' },
            { title: 'Celebrate growth, not just scores', tip: 'Use leaderboards to celebrate improvement and effort, not just top scores. This builds confidence.' },
            { title: 'Encourage free play', tip: 'Let children play Free Paint without pressure. This builds intrinsic motivation and creative confidence.' },
            { title: 'Adapt difficulty on the fly', tip: "Pause during Classroom Mode and switch to an easier or harder activity based on what you're seeing." },
          ].map((tip, index) => (
            <details
              key={index}
              className="group rounded-xl border border-slate-200 bg-white p-6 hover:border-orange-200 transition-colors shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900">
                {tip.title}
                <span className="text-slate-400 group-open:rotate-45 transition-transform text-lg">+</span>
              </summary>
              <p className="mt-3 text-slate-600 text-sm leading-relaxed">{tip.tip}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-500 to-amber-500 p-12 text-center space-y-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-white">
              Ready to explore all 9 activities?
            </h2>
            <p className="text-lg text-white/90">
              Play free forever, or unlock Classroom Mode for group learning and analytics.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white hover:bg-slate-50 text-orange-600 font-semibold shadow-md">
              <a href={`${gameUrl}/play`} target="_blank" rel="noopener noreferrer">Play All Activities</a>
            </Button>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border border-white/40 font-semibold">
              <Link href="/for-teachers">Learn About Classroom Mode</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
