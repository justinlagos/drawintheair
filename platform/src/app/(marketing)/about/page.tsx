import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Draw in the Air',
  description: 'Draw in the Air was built to bring the magic of gesture-based interaction into every early years classroom — no special hardware required.',
  openGraph: {
    title: 'About — Draw in the Air',
    description: 'Gesture-based learning built for every classroom.',
    type: 'website',
  },
}

export default function AboutPage() {
  const values = [
    {
      icon: '🎯',
      title: 'Movement-Based Learning',
      description: 'We believe learning is most effective when it engages the whole body. Gesture-based interaction creates deeper cognitive connections and more joy in the classroom.',
    },
    {
      icon: '🔒',
      title: 'Child Privacy First',
      description: 'Student data privacy is non-negotiable. We collect minimal data, never store photos or video, and purge session data at year-end. COPPA and GDPR compliant.',
    },
    {
      icon: '✨',
      title: 'Classroom Joy',
      description: 'Education should be delightful. Every activity is designed with wonder and play in mind, creating moments of genuine connection between students and learning.',
    },
  ];

  const team = [
    { name: 'Alex Chen', role: 'Founder & CEO', bio: 'Former teacher with a passion for gesture-based interaction design.' },
    { name: 'Sam Patel', role: 'VP Engineering', bio: 'Built computer vision systems at leading AI companies.' },
    { name: 'Maya Williams', role: 'Head of Education', bio: 'Early childhood specialist with 10+ years in UK schools.' },
  ];

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900">
            About Draw in the Air
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            We're on a mission to transform early childhood education through gesture-based learning that's joyful, private, and effective.
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Our Mission</h2>
          <p className="text-lg text-slate-700 leading-relaxed">
            To empower teachers and delight children by bringing gesture-based learning into classrooms across the UK. We believe that when children use their whole bodies to learn, something magical happens — they become more engaged, more confident, and develop stronger foundational skills in literacy, numeracy, and motor development.
          </p>
        </div>
      </section>

      {/* Values Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Our Values</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div
              key={index}
              className="group relative rounded-lg border border-slate-200 bg-white p-8 hover:border-orange-300 transition-all duration-300 shadow-sm"
            >
              <div className="space-y-4">
                <div className="text-4xl">{value.icon}</div>
                <h3 className="text-xl font-bold text-slate-900">{value.title}</h3>
                <p className="text-slate-600">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Our Team</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-orange-500 flex items-center justify-center text-4xl font-bold text-white">
                {member.name.split(' ')[0][0]}{member.name.split(' ')[1][0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{member.name}</h3>
                <p className="text-sm font-semibold text-orange-600">{member.role}</p>
              </div>
              <p className="text-slate-600 text-sm">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story Section */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">How We Started</h2>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <p>
            Draw in the Air was born in a classroom. Alex, one of our founders, was teaching a group of 5-year-olds when he noticed something remarkable: when given the freedom to move and gesture, children's engagement and retention skyrocketed.
          </p>

          <p>
            He partnered with Sam to build computer vision technology that could track hand movements in real-time, and with Maya to design activities grounded in early childhood education research. The result is a platform that turns every gesture into a learning moment.
          </p>

          <p>
            Today, teachers across the UK are using Draw in the Air to create classrooms where movement, play, and learning are inseparable. And we're just getting started.
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Get in touch</h2>
          <p className="text-slate-600 mb-6">
            Have a question? Want to partner with us? We'd love to hear from you.
          </p>
          <a
            href="mailto:hello@drawintheair.co.uk"
            className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all duration-300"
          >
            Email us
          </a>
        </div>
      </section>
    </div>
  );
}
