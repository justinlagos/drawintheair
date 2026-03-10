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
    <div className="bg-slate-950">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-100">
            9 Activities for Every Learner
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-400">
            Each activity is designed to build foundational skills in literacy, numeracy, and motor development. All powered by gesture-based interaction.
          </p>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="group relative rounded-lg border border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-8 hover:border-slate-700 transition-all duration-300 overflow-hidden"
            >
              {/* Hover gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-600/0 to-cyan-600/0 group-hover:from-cyan-600/5 group-hover:to-cyan-600/10 transition-all duration-300" />

              <div className="relative space-y-6">
                {/* Emoji & Name */}
                <div>
                  <div className="text-6xl mb-3">{activity.emoji}</div>
                  <h3 className="text-2xl font-bold text-slate-100">{activity.name}</h3>
                </div>

                {/* Description */}
                <p className="text-slate-400 leading-relaxed">
                  {activity.description}
                </p>

                {/* Age Range */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Age range</p>
                  <p className="text-slate-300">{activity.ageRange}</p>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Skills developed</p>
                  <div className="flex flex-wrap gap-2">
                    {activity.skills.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="inline-block px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-slate-700">
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-cyan-500/80 to-purple-600/80 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold transition-all duration-300"
                  >
                    <Link href={`/play/${activity.mode}`}>
                      Try Now
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Learning Outcomes */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-100 mb-16">What children develop</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-lg border border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-8 space-y-4">
            <div className="text-4xl">🧠</div>
            <h3 className="text-xl font-bold text-slate-100">Cognitive Skills</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>• Problem-solving</li>
              <li>• Pattern recognition</li>
              <li>• Memory and focus</li>
              <li>• Decision-making</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-8 space-y-4">
            <div className="text-4xl">🤲</div>
            <h3 className="text-xl font-bold text-slate-100">Motor Skills</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>• Hand-eye coordination</li>
              <li>• Fine motor control</li>
              <li>• Gross motor development</li>
              <li>• Balance and spatial awareness</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-8 space-y-4">
            <div className="text-4xl">📚</div>
            <h3 className="text-xl font-bold text-slate-100">Academic Skills</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
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
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-12">How to use in your classroom</h2>

        <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-b from-cyan-900/20 to-purple-900/20 p-12 space-y-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">🎯 Whole Class</h3>
            <p className="text-slate-300">
              Run an activity for the entire class to focus on specific skills. Use leaderboards for engagement. Perfect for teaching moments and skill introduction.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">👥 Small Groups</h3>
            <p className="text-slate-300">
              Create focused small-group sessions to differentiate learning. Build confidence and target specific skill gaps with personalized support.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">🏠 Intervention</h3>
            <p className="text-slate-300">
              Use activities for targeted intervention. Our analytics show exactly which skills need extra practice, making your intervention evidence-based.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">🎮 Free Play</h3>
            <p className="text-slate-300">
              Let children play freely during breaks or choice time. Learning happens through play, and children develop confidence and intrinsic motivation.
            </p>
          </div>
        </div>
      </section>

      {/* Activity Recommendations */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-16">Find the right activity</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">For Early Literacy</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex gap-2">
                <span>📖</span>
                <span>Word Search</span>
              </li>
              <li className="flex gap-2">
                <span>✏️</span>
                <span>Tracing</span>
              </li>
              <li className="flex gap-2">
                <span>✍️</span>
                <span>Gesture Spelling</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">For Numeracy</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex gap-2">
                <span>🎲</span>
                <span>Balloon Math</span>
              </li>
              <li className="flex gap-2">
                <span>🏠</span>
                <span>Sort & Place</span>
              </li>
              <li className="flex gap-2">
                <span>🫧</span>
                <span>Bubble Pop</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">For Motor Development</h3>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex gap-2">
                <span>🎨</span>
                <span>Colour Builder</span>
              </li>
              <li className="flex gap-2">
                <span>🌈</span>
                <span>Rainbow Bridge</span>
              </li>
              <li className="flex gap-2">
                <span>🎭</span>
                <span>Free Paint</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Teacher Tips */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-slate-100 mb-12">Teacher tips for success</h2>

        <div className="space-y-4">
          {[
            {
              title: 'Mix activities throughout the day',
              tip: 'Alternate between literacy, numeracy, and motor-focused activities to keep things fresh and address different learning needs.',
            },
            {
              title: 'Use analytics to guide intervention',
              tip: 'Check the end-of-session analytics. If a child struggles with pattern matching, focus on Rainbow Bridge next session.',
            },
            {
              title: 'Celebrate growth, not just scores',
              tip: 'Use leaderboards to celebrate improvement and effort, not just top scores. This builds confidence.',
            },
            {
              title: 'Encourage free play',
              tip: 'Let children play Free Paint without pressure. This builds intrinsic motivation and creative confidence.',
            },
            {
              title: 'Adapt difficulty on the fly',
              tip: 'Pause during Classroom Mode and switch to an easier or harder activity based on what you\'re seeing.',
            },
          ].map((tip, index) => (
            <details
              key={index}
              className="group rounded-lg border border-slate-800 bg-slate-800/30 p-6 hover:border-slate-700 transition-colors"
            >
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-100">
                {tip.title}
                <span className="text-slate-400 group-open:rotate-180 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-slate-400">{tip.tip}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative rounded-lg border border-cyan-500/30 bg-gradient-to-b from-cyan-900/20 to-purple-900/20 p-12 text-center space-y-6">
          <div className="relative space-y-4">
            <h2 className="text-3xl font-bold text-slate-100">
              Ready to explore all 9 activities?
            </h2>
            <p className="text-lg text-slate-400">
              Play free forever, or unlock Classroom Mode for group learning and analytics.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold">
                <Link href="/play">Play All Activities</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800">
                <Link href="/for-teachers">Learn About Classroom Mode</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
