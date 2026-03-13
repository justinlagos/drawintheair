'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ─────────────────────────────────────────────────────────────────
   Scroll-reveal hook
───────────────────────────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el) =>
      observer.observe(el)
    );
    return () => observer.disconnect();
  }, []);
}

/* ─────────────────────────────────────────────────────────────────
   SVG decoration elements
───────────────────────────────────────────────────────────────── */
function FloatingStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 2 L24 14 L38 14 L27 22 L31 34 L20 26 L9 34 L13 22 L2 14 L16 14 Z"
        fill="#fbbf24" opacity="0.85"/>
    </svg>
  );
}
function FloatingCircle({ className, color = '#fed7aa' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill={color} opacity="0.7"/>
    </svg>
  );
}
function FloatingTriangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden="true">
      <path d="M20 2 L38 34 L2 34 Z" fill="#c084fc" opacity="0.7"/>
    </svg>
  );
}
function FloatingHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden="true">
      <path d="M20 34 C10 26 2 20 2 12 A8 8 0 0 1 20 10 A8 8 0 0 1 38 12 C38 20 30 26 20 34 Z"
        fill="#f9a8d4" opacity="0.8"/>
    </svg>
  );
}
function FloatingDiamond({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 2 L38 20 L20 38 L2 20 Z" fill="#86efac" opacity="0.75"/>
    </svg>
  );
}
function DotPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {[0,1,2,3,4].flatMap(r => [0,1,2,3,4].map(c => (
        <circle key={`${r}-${c}`} cx={12 + c * 24} cy={12 + r * 24} r="3.5" fill="#e5e7eb"/>
      )))}
    </svg>
  );
}
function WavyLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 40" className={className} aria-hidden="true">
      <path d="M0 20 C30 5 50 35 80 20 S130 5 160 20 S190 35 200 20"
        fill="none" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
function DrawTrail({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 80" className={className} aria-hidden="true">
      <path d="M10 60 Q60 10 120 40 T230 20 T290 50"
        fill="none" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="290" cy="50" r="6" fill="#f97316" opacity="0.7"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────────── */
const gameUrl = process.env.NEXT_PUBLIC_GAME_URL || 'https://drawintheair.com';

const activities = [
  {
    name: 'Letter Tracing',
    desc: 'Learn A–Z letter formation with hand gestures',
    age: 'Ages 3–7',
    emoji: '✏️',
    img: '/tracing-letter.jpg',
    theme: 'act-orange',
    accent: 'text-orange-600',
    tag: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-200',
  },
  {
    name: 'Free Paint',
    desc: 'Open-ended creativity — paint anything in mid-air',
    age: 'All ages',
    emoji: '🎨',
    img: '/free-paint-particles.jpg',
    theme: 'act-pink',
    accent: 'text-pink-600',
    tag: 'bg-pink-100 text-pink-700',
    ring: 'ring-pink-200',
  },
  {
    name: 'Bubble Pop',
    desc: 'Tap floating bubbles to practise numbers and counting',
    age: 'Ages 3–6',
    emoji: '🫧',
    img: '/bubble-pop.jpg',
    theme: 'act-blue',
    accent: 'text-blue-600',
    tag: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-200',
  },
  {
    name: 'Word Search',
    desc: 'Gesture-spell your way through word grids',
    age: 'Ages 5–8',
    emoji: '🔤',
    img: '/wordsearch.jpg',
    theme: 'act-purple',
    accent: 'text-purple-600',
    tag: 'bg-purple-100 text-purple-700',
    ring: 'ring-purple-200',
  },
  {
    name: 'Sort & Place',
    desc: 'Drag and sort shapes into the right categories',
    age: 'Ages 3–7',
    emoji: '🧩',
    img: '/sort-place.jpg',
    theme: 'act-green',
    accent: 'text-green-600',
    tag: 'bg-green-100 text-green-700',
    ring: 'ring-green-200',
  },
  {
    name: 'Hand Tracking',
    desc: 'Precision gesture control for fine motor skill development',
    age: 'Ages 4–8',
    emoji: '✋',
    img: '/hand-tracking.jpg',
    theme: 'act-yellow',
    accent: 'text-amber-600',
    tag: 'bg-amber-100 text-amber-700',
    ring: 'ring-amber-200',
  },
];

const steps = [
  {
    n: '01',
    title: 'Open in your browser',
    desc: 'No download, no account, no app store. Just open drawintheair.com on any laptop or tablet.',
    img: '/child-at-laptop.jpg',
    color: 'bg-orange-500',
    softBg: 'bg-orange-50',
  },
  {
    n: '02',
    title: 'Allow the camera',
    desc: 'Your webcam tracks hand position only. Nothing is recorded, stored or sent anywhere.',
    img: '/privacy-camera.jpg',
    color: 'bg-purple-500',
    softBg: 'bg-purple-50',
  },
  {
    n: '03',
    title: 'Children start learning',
    desc: 'Pupils use one finger to trace letters, pop shapes, spell words — all in mid-air.',
    img: '/child-drawing-light.jpg',
    color: 'bg-amber-500',
    softBg: 'bg-amber-50',
  },
];

const testimonials = [
  {
    quote: 'The children absolutely love it. It gets them up and moving while actually learning their letters.',
    name: 'Sophie R.',
    role: 'Reception Teacher',
    school: 'Primary School, London',
    avatar: '👩‍🏫',
    stars: 5,
  },
  {
    quote: 'Even our most reluctant learners joined in. The engagement we saw was remarkable — proper active learning.',
    name: 'David M.',
    role: 'Foundation Stage Lead',
    school: 'Academy Trust, Yorkshire',
    avatar: '👨‍🏫',
    stars: 5,
  },
  {
    quote: "Finally a tool that doesn't just mean sitting passively in front of a screen. Genuinely different.",
    name: 'Priya K.',
    role: 'EdTech Coordinator',
    school: 'Primary School, Bristol',
    avatar: '👩‍💼',
    stars: 5,
  },
];

const stats = [
  { value: '5,000+', label: 'Students reached' },
  { value: '200+',   label: 'UK classrooms' },
  { value: '8',      label: 'Learning activities' },
  { value: 'EYFS',   label: 'Curriculum aligned' },
];

/* ─────────────────────────────────────────────────────────────────
   Page component
───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  useScrollReveal();

  return (
    <div className="bg-slate-50 overflow-x-hidden">

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-purple-50 pt-10 pb-20 sm:pt-16 sm:pb-28">
        {/* Background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-100 opacity-60 blur-3xl"/>
          <div className="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-purple-100 opacity-50 blur-3xl"/>
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-amber-100 opacity-50 blur-3xl"/>
        </div>

        {/* Floating decorations */}
        <FloatingStar     className="float      absolute top-16 left-[6%]  h-10 w-10 hidden lg:block" />
        <FloatingTriangle className="float-slow absolute top-28 right-[8%] h-9  w-9  hidden lg:block" />
        <FloatingCircle   className="float-fast absolute bottom-24 left-[12%] h-8 w-8 hidden lg:block" color="#c084fc" />
        <FloatingHeart    className="float      absolute bottom-32 right-[14%] h-7 w-7 hidden lg:block" />
        <FloatingDiamond  className="float-rot  absolute top-40 left-[30%] h-7 w-7 hidden xl:block" />
        <DotPattern       className="absolute top-4 left-0 h-28 w-28 opacity-50 hidden lg:block" />
        <DotPattern       className="absolute bottom-4 right-0 h-28 w-28 opacity-50 hidden lg:block" />
        <WavyLine         className="absolute top-20 left-1/4 w-52 opacity-60 hidden xl:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

            {/* LEFT: copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 mb-6">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm font-semibold text-orange-700">Used by classrooms across the UK 🇬🇧</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl leading-[1.1]">
                Learning that{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-orange-500">moves</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 10" aria-hidden="true">
                    <path d="M5 7 Q50 2 100 7 T195 7" stroke="#fbbf24" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </span>{' '}
                with children
              </h1>

              <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-lg">
                Children trace letters, numbers and shapes <strong>in the air</strong> using just their hands.
                No apps. No downloads. Just a webcam and imagination.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={`${gameUrl}/play`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 hover:shadow-orange-300 transition-all duration-200 active:scale-95">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                  </svg>
                  Try Free Activity
                </a>
                <Link href="/auth/login"
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-700 hover:border-orange-300 hover:text-orange-600 transition-all duration-200">
                  Teacher Login →
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {['✏️ Trace Letters', '🎨 Free Paint', '🫧 Bubble Pop', '🔤 Word Search', '🧩 Sort & Place'].map((chip) => (
                  <span key={chip}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT: hero photo */}
            <div className="relative flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-200 to-purple-200 blur-2xl opacity-50 scale-105" aria-hidden="true"/>
                <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white">
                  <Image src="/child-drawing-light.jpg" alt="Child drawing in the air"
                    width={600} height={420} className="w-full object-cover" priority/>
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 shadow-md">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                    <span className="text-xs font-bold text-gray-800">LIVE Session</span>
                  </div>
                </div>
                {/* Floating stat cards */}
                <div className="float absolute -left-6 top-1/4 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✏️</span>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Activity</p>
                      <p className="text-sm font-bold text-gray-900">Letter A</p>
                    </div>
                  </div>
                </div>
                <div className="float-slow absolute -right-4 bottom-16 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Score</p>
                      <p className="text-sm font-bold text-orange-600">980 pts</p>
                    </div>
                  </div>
                </div>
                <div className="float-fast absolute -right-2 top-8 rounded-2xl bg-orange-500 p-3 shadow-xl">
                  <p className="text-[10px] font-semibold text-orange-100 uppercase tracking-wide">Students</p>
                  <p className="text-lg font-black text-white">28 🎉</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div className="-mt-1 overflow-hidden leading-none">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="h-10 w-full fill-slate-50">
          <path d="M0 0 C200 60 400 0 600 30 S1000 0 1200 40 L1200 60 L0 60 Z"/>
        </svg>
      </div>

      {/* ════════════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map(({ value, label }, i) => (
              <div key={label} className={`reveal delay-${i * 100} text-center`}>
                <p className="text-3xl font-black text-orange-500">{value}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center mb-16">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-600 mb-3">Simple to start</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Up and running in{' '}
              <span className="text-purple-600">30 seconds</span>
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">No IT setup. No app installs. Just open, allow camera, and go.</p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {steps.map(({ n, title, desc, img, color, softBg }, i) => (
              <div key={n} className="grid items-center gap-10 lg:grid-cols-2">
                <div className={i % 2 === 1 ? 'reveal-right lg:order-2' : 'reveal-left'}>
                  <div className="relative overflow-hidden rounded-3xl shadow-xl ring-4 ring-white">
                    <Image src={img} alt={title} width={560} height={380} className="w-full object-cover"/>
                    <div className={`absolute inset-0 ${softBg} opacity-20`}/>
                  </div>
                </div>
                <div className={i % 2 === 1 ? 'reveal-left lg:order-1' : 'reveal-right'}>
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${color} shadow-lg mb-5`}>
                    <span className="text-2xl font-black text-white">{n}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h3>
                  <p className="mt-3 text-lg text-slate-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave into activities */}
      <div className="overflow-hidden leading-none">
        <svg viewBox="0 0 1200 50" preserveAspectRatio="none" className="h-8 w-full fill-slate-50">
          <path d="M0 50 C300 0 700 50 1200 10 L1200 50 Z"/>
        </svg>
      </div>

      {/* ════════════════════════════════════════════════
          ACTIVITY CARDS
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center mb-14">
            <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700 mb-3">8 activities</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Explore the learning activities</h2>
            <p className="mt-3 text-slate-600">Every activity is EYFS-aligned and designed for ages 3–8.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((act, i) => (
              <a key={act.name} href={`${gameUrl}/play`}
                className={`edu-card reveal delay-${Math.min(i * 100, 500)} group overflow-hidden border ${act.ring} ring-0 hover:ring-2 transition-all`}>
                <div className="relative h-44 overflow-hidden">
                  <Image src={act.img} alt={act.name} fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"/>
                  <div className={`absolute inset-0 ${act.theme} opacity-30`}/>
                  <div className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${act.tag}`}>
                    {act.age}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{act.emoji}</span>
                    <h3 className="font-bold text-slate-900">{act.name}</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{act.desc}</p>
                  <div className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${act.accent}`}>Try activity →</div>
                </div>
              </a>
            ))}
          </div>

          <div className="reveal mt-10 text-center">
            <a href={`${gameUrl}/play`}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-orange-600 transition-colors">
              Start playing free — no sign-up needed
            </a>
          </div>
        </div>
      </section>

      {/* Wave */}
      <div className="overflow-hidden leading-none">
        <svg viewBox="0 0 1200 50" preserveAspectRatio="none" className="h-8 w-full fill-slate-50">
          <path d="M0 0 C400 50 800 0 1200 30 L1200 50 L0 50 Z"/>
        </svg>
      </div>

      {/* ════════════════════════════════════════════════
          CLASSROOM MODE
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 shadow-2xl">
            <div className="grid lg:grid-cols-2">
              <div className="reveal-left p-10 lg:p-16">
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white mb-5">🏫 Classroom Mode</span>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl leading-tight">Run your whole class at once</h2>
                <p className="mt-4 text-lg text-purple-200 leading-relaxed">
                  Students join by 4-digit code on any device. You see a live leaderboard, track engagement in real time, and download session reports.
                </p>
                <ul className="mt-6 space-y-3">
                  {['Live leaderboard for class energy', 'Students join on any camera device', 'Session analytics after every class', 'AI-generated insights and suggestions'].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-purple-100">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-400/40">
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/auth/login"
                    className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors shadow-md">
                    Start Free Teacher Trial
                  </Link>
                  <Link href="/pricing"
                    className="rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                    View pricing →
                  </Link>
                </div>
              </div>

              <div className="reveal-right relative hidden lg:block min-h-[380px]">
                <Image src="/classroom.jpg" alt="Teacher using Draw in the Air with a class"
                  fill className="object-cover opacity-80"/>
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-purple-700/40"/>
                <div className="absolute bottom-8 right-8 rounded-2xl bg-white/90 backdrop-blur p-4 shadow-xl w-48">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live</p>
                  {[{ n: '🥇', name: 'Amara', s: 980 }, { n: '🥈', name: 'Jacob', s: 940 }, { n: '🥉', name: 'Priya', s: 870 }].map(({ n, name, s }) => (
                    <div key={name} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-800 font-medium">{n} {name}</span>
                      <span className="font-bold text-purple-600">{s}</span>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"/>
                    <span className="text-[10px] text-gray-500">28 students active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PARENT PHOTO SECTION
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="reveal-left">
              <div className="overflow-hidden rounded-3xl shadow-xl">
                <Image src="/parent-child-screen.jpg" alt="Parent and child using Draw in the Air"
                  width={560} height={400} className="w-full object-cover"/>
              </div>
            </div>
            <div className="reveal-right">
              <span className="inline-block rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-700 mb-4">🏠 For Home</span>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Screen time that actually means something</h2>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Draw in the Air turns any webcam session into an active, physical learning moment. Children get up, move, and practise real skills — parents get peace of mind.
              </p>
              <ul className="mt-5 space-y-2.5">
                {['EYFS and early literacy aligned', 'No registration needed for free activities', 'Works on any laptop or tablet with a camera', 'Children stay safe — no data collected'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-slate-700">
                    <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <a href={`${gameUrl}/play`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-md">
                  Try with your child — free
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center mb-12">
            <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-600 mb-3">Teacher voices</span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">What educators say</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map(({ quote, name, role, school, avatar, stars }, i) => (
              <blockquote key={name} className={`edu-card reveal delay-${i * 200} p-7`}>
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: stars }).map((_, s) => (
                    <svg key={s} className="h-4 w-4 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed text-sm">"{quote}"</p>
                <footer className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xl">{avatar}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-600">{role} · {school}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SCHOOL / TEACHER PLANS
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Flexible plans for every setting</h2>
            <p className="mt-3 text-slate-600">From individual teachers to whole schools.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="reveal-left edu-card p-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl shadow-sm">👩‍🏫</div>
              <h3 className="text-xl font-extrabold text-slate-900">Teacher Pro</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">For individual teachers who want classroom mode, session analytics, and the full feature set.</p>
              <ul className="mt-5 space-y-2">
                {['Live classroom mode', 'Session history & analytics', 'Student progress tracking', 'AI insights after sessions', 'Playlist builder'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-3">
                <Link href="/auth/login" className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-sm">Start Free Trial</Link>
                <Link href="/pricing" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-orange-400 hover:text-orange-600 transition-colors">See pricing</Link>
              </div>
            </div>

            <div className="reveal-right edu-card p-8 border-2 border-slate-300">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-3xl shadow-sm">🏫</div>
              <h3 className="text-xl font-extrabold text-slate-900">School Licence</h3>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">One licence for your whole school. Every teacher gets Pro access plus a school admin dashboard.</p>
              <ul className="mt-5 space-y-2">
                {['All teachers included', 'School-wide analytics', 'Admin dashboard & reporting', 'Bulk student management', 'Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link href="/for-schools" className="inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-sm">View School Plans →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          PRIVACY / SAFETY
      ════════════════════════════════════════════════ */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="reveal overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="grid items-center gap-6 p-8 sm:grid-cols-3">
              <div className="relative overflow-hidden rounded-2xl sm:col-span-1 h-40">
                <Image src="/privacy-camera.jpg" alt="Privacy and safety" fill className="object-cover opacity-80"/>
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔒</span>
                  <h3 className="text-xl font-extrabold text-slate-900">Safe by design</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Your camera sees hand position only. No images, video, or biometric data are ever stored, transmitted, or shared.
                  Fully compliant with UK child privacy standards and school data protection requirements.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['No data stored', 'No images sent', 'GDPR compliant', 'UK schools ready'].map((b) => (
                    <span key={b} className="rounded-full bg-orange-100 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">✓ {b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <FloatingStar    className="float absolute top-8 left-12 h-12 w-12 opacity-30"/>
          <FloatingCircle  className="float-slow absolute top-16 right-16 h-10 w-10 opacity-20" color="#fff"/>
          <FloatingHeart   className="float absolute bottom-12 left-24 h-9 w-9 opacity-25"/>
          <FloatingDiamond className="float-rot absolute bottom-8 right-20 h-10 w-10 opacity-20"/>
          <DrawTrail       className="absolute top-1/2 -translate-y-1/2 w-full opacity-20"/>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-white sm:text-5xl leading-tight">
            Ready to bring the magic<br/>into your classroom?
          </h2>
          <p className="mt-5 text-lg text-orange-100 leading-relaxed">
            Try it free in 30 seconds. No account, no download, no credit card. Works on any laptop with a webcam.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a href={`${gameUrl}/play`}
              className="rounded-2xl bg-white px-9 py-4 text-base font-black text-orange-600 shadow-xl hover:bg-orange-50 transition-all active:scale-95">
              Try Free Activity Now 🎉
            </a>
            <Link href="/for-schools" className="text-sm font-semibold text-white/90 hover:text-white transition-colors underline underline-offset-4">
              Book a school demo →
            </Link>
          </div>
          <p className="mt-5 text-xs text-orange-200">Chrome or Edge · Any webcam · Ages 3–8 · EYFS aligned</p>
        </div>
      </section>

    </div>
  );
}
