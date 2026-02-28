import React, { useState, useEffect, useCallback } from 'react';
import { TryFreeModal } from '../components/TryFreeModal';
import '../components/landing/new-landing.css';

const SHEETS_ENDPOINT = import.meta.env.VITE_SHEETS_ENDPOINT || '';

async function sendToSheets(data: Record<string, unknown>) {
  const encoded = encodeURIComponent(JSON.stringify(data));
  const url = SHEETS_ENDPOINT + '?data=' + encoded;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } catch (err: any) {
    throw new Error(err.message || 'Submission failed');
  }
}

export const Landing: React.FC = () => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const [pilotOpen, setPilotOpen] = useState(false);
  const [pilotName, setPilotName] = useState('');
  const [pilotEmail, setPilotEmail] = useState('');
  const [pilotSchool, setPilotSchool] = useState('');
  const [pilotRole, setPilotRole] = useState('');
  const [pilotYear, setPilotYear] = useState('');
  const [pilotDevice, setPilotDevice] = useState('');
  const [pilotNotes, setPilotNotes] = useState('');
  const [pilotSending, setPilotSending] = useState(false);
  const [pilotSent, setPilotSent] = useState(false);
  const [pilotErrors, setPilotErrors] = useState<Record<string, boolean>>({});
  const [pilotSubmitError, setPilotSubmitError] = useState('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tryFreeOpen, setTryFreeOpen] = useState(false);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('nl-visible');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.nl-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Escape key closes modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFeedbackOpen(false);
        closePilotModal();
        setTryFreeOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Feedback
  const toggleFeedback = useCallback(() => {
    setFeedbackOpen((prev) => {
      if (!prev) { setFeedbackSent(false); }
      return !prev;
    });
  }, []);

  const submitFeedback = useCallback(() => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    sendToSheets({
      type: 'feedback',
      payload: {
        feedback: feedbackText.trim(),
        email: feedbackEmail.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    }).then(() => {
      setFeedbackSent(true);
      setFeedbackText('');
      setFeedbackEmail('');
      setFeedbackSending(false);
      setTimeout(() => setFeedbackOpen(false), 2500);
    }).catch(() => setFeedbackSending(false));
  }, [feedbackText, feedbackEmail]);

  // School Pilot
  const openPilotModal = useCallback(() => {
    setPilotOpen(true);
    setPilotSent(false);
    setPilotErrors({});
    setPilotSubmitError('');
    document.body.style.overflow = 'hidden';
  }, []);

  const closePilotModal = useCallback(() => {
    setPilotOpen(false);
    document.body.style.overflow = '';
  }, []);

  const submitPilot = useCallback(() => {
    const errors: Record<string, boolean> = {};
    if (!pilotName.trim()) errors.name = true;
    if (!pilotEmail.trim()) errors.email = true;
    if (!pilotSchool.trim()) errors.school = true;
    if (Object.keys(errors).length > 0) {
      setPilotErrors(errors);
      return;
    }
    setPilotSubmitError('');
    setPilotSending(true);
    sendToSheets({
      type: 'school_pack',
      payload: {
        contact_name: pilotName.trim(),
        email: pilotEmail.trim(),
        school_name: pilotSchool.trim(),
        role: pilotRole,
        year_group: pilotYear,
        device_type: pilotDevice,
        send_notes: pilotNotes.trim(),
      },
    }).then(() => {
      setPilotSent(true);
      setPilotSending(false);
      setPilotName(''); setPilotEmail(''); setPilotSchool('');
      setPilotRole(''); setPilotYear(''); setPilotDevice(''); setPilotNotes('');
    }).catch((err) => {
      setPilotSubmitError(err.message);
      setPilotSending(false);
    });
  }, [pilotName, pilotEmail, pilotSchool, pilotRole, pilotYear, pilotDevice, pilotNotes]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    closeMobileMenu();
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      // Make it fun: add a playful pop when we land on the section
      setTimeout(() => {
        section.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        section.style.transform = 'scale(1.02)';
        setTimeout(() => { section.style.transform = 'scale(1)'; }, 400);
      }, 600);
    }
  };

  return (
    <div className="nl-page">

      {/* ═══════ NAV ═══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 nl-nav-blur" style={{ background: 'rgba(10,14,26,.7)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-3 no-underline text-white group cursor-pointer flex-shrink-0">
            <img src="/logo.png" alt="Draw in the Air" className="h-8 md:h-9 w-auto object-contain flex-shrink-0 transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6 group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ maxHeight: '36px', height: '36px' }} />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">How It Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">Activities</a>
            <a href="#parents" onClick={(e) => scrollToSection(e, 'parents')} className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">For Parents</a>
            <a href="#schools" onClick={(e) => scrollToSection(e, 'schools')} className="hover:text-cyan-400 hover:scale-110 transition-all no-underline cursor-pointer">For Schools</a>
            <a href="/faq" className="hover:text-cyan-400 hover:scale-110 transition-all no-underline">FAQ</a>
            <button onClick={() => setTryFreeOpen(true)} className="nl-btn-primary text-white font-semibold px-5 py-2 rounded-lg text-sm border-none cursor-pointer">Try Free</button>
            <button onClick={openPilotModal} className="nl-btn-secondary font-semibold px-5 py-2 rounded-lg text-sm border-none cursor-pointer">School Pilot</button>
          </div>
          <button className="md:hidden text-gray-400" style={{ background: 'none', border: 'none', boxShadow: 'none' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3 text-sm text-gray-400">
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="block py-2 no-underline text-gray-400 hover:text-cyan-400">How It Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="block py-2 no-underline text-gray-400 hover:text-cyan-400">Activities</a>
            <a href="#parents" onClick={(e) => scrollToSection(e, 'parents')} className="block py-2 no-underline text-gray-400 hover:text-cyan-400">For Parents</a>
            <a href="#schools" onClick={(e) => scrollToSection(e, 'schools')} className="block py-2 no-underline text-gray-400 hover:text-cyan-400">For Schools</a>
            <a href="/faq" className="block py-2 no-underline text-gray-400 hover:text-cyan-400">FAQ</a>
            <button onClick={() => { closeMobileMenu(); setTryFreeOpen(true); }} className="block w-full nl-btn-primary text-white font-semibold px-5 py-2.5 rounded-lg text-center mt-2 border-none cursor-pointer">Try Free</button>
            <button onClick={() => { closeMobileMenu(); openPilotModal(); }} className="block w-full nl-btn-secondary font-semibold px-5 py-2.5 rounded-lg text-center border-none cursor-pointer">School Pilot</button>
          </div>
        )}
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="relative min-h-screen flex items-center nl-hero-gradient pt-16">
        <svg className="absolute inset-0 w-full h-full pointer-events-none nl-line-glow" viewBox="0 0 1200 800" fill="none" preserveAspectRatio="xMidYMid slice">
          <path d="M100 650 Q300 400 500 500 T900 300" stroke="rgba(34,211,238,.15)" strokeWidth="2" strokeDasharray="8 12" className="nl-glow-pulse" />
          <path d="M200 700 Q450 350 700 450 T1100 250" stroke="rgba(251,146,60,.1)" strokeWidth="1.5" strokeDasharray="6 10" className="nl-glow-pulse" style={{ animationDelay: '1.5s' }} />
          <circle cx="850" cy="200" r="3" fill="rgba(34,211,238,.3)" className="nl-glow-pulse" />
          <circle cx="350" cy="300" r="2" fill="rgba(251,146,60,.25)" className="nl-glow-pulse" style={{ animationDelay: '1s' }} />
          <circle cx="1050" cy="500" r="2.5" fill="rgba(34,211,238,.2)" className="nl-glow-pulse" style={{ animationDelay: '2s' }} />
        </svg>

        <div className="relative max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="nl-fade-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
              Learning<br />That <span className="text-cyan-400 nl-glow-text">Moves</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-lg mb-8">
              Draw in the Air turns your child's hands into the controller. No touch screens. No downloads. Just motion, creativity, and real engagement.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setTryFreeOpen(true)} className="nl-btn-primary text-white font-bold px-8 py-3.5 rounded-xl text-base border-none cursor-pointer">Try It Now</button>
              <a href="#how-it-works" className="nl-btn-secondary font-semibold px-8 py-3.5 rounded-xl text-base no-underline">See How It Works</a>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
              Runs in your browser. No installs. No data stored.
            </p>
          </div>

          <div className="relative nl-fade-up" style={{ animationDelay: '.2s' }}>
            <div className="nl-hero-photo-wrap" style={{ aspectRatio: '4/3' }}>
              <img src="/landing-images/hero-neon-waves.jpg" alt="Child interacting with flowing neon light waves" />
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 480 360" fill="none" style={{ borderRadius: '1rem' }}>
              <path d="M60 280 Q180 200 280 240 T440 180" stroke="rgba(34,211,238,.35)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200" strokeDashoffset="200" style={{ animation: 'nl-draw-line 3s ease forwards infinite' }} />
              <path d="M40 300 Q200 180 320 260 T460 200" stroke="rgba(251,146,60,.25)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="180" strokeDashoffset="180" style={{ animation: 'nl-draw-line 3s ease .8s forwards infinite' }} />
              <rect x="16" y="16" width="80" height="22" rx="4" fill="rgba(10,14,26,.6)" stroke="rgba(34,211,238,.3)" strokeWidth="1" />
              <text x="30" y="31" fill="rgba(34,211,238,.7)" fontSize="9" fontFamily="monospace">TRACKING</text>
              <rect x="16" y="320" width="110" height="22" rx="4" fill="rgba(10,14,26,.6)" stroke="rgba(251,146,60,.25)" strokeWidth="1" />
              <text x="26" y="335" fill="rgba(251,146,60,.6)" fontSize="8" fontFamily="monospace">60fps • PINCH ON</text>
            </svg>
            <div className="absolute -bottom-4 -left-4 rounded-xl px-4 py-2.5 flex items-center gap-2 nl-float z-10" style={{ background: '#111629', border: '1px solid rgba(34,211,238,.2)', animationDelay: '.5s' }}>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-300 font-semibold">Camera Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROBLEM ═══════ */}
      <section className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="nl-reveal">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-8 leading-tight">
              Screens That Drain.<br />Or Screens That <span className="text-orange-400 nl-glow-orange">Build.</span>
            </h2>
            <div className="text-gray-400 text-lg leading-relaxed max-w-2xl space-y-4">
              <p>Most kids' screen time is passive. Tap. Swipe. Scroll. Repeat. Draw in the Air flips that model.</p>
              <p>Here, screen time requires movement. It trains coordination. It builds focus. It rewards precision.</p>
            </div>
            <div className="mt-10 inline-block">
              <span className="text-cyan-400 font-bold text-xl tracking-wide">This is active digital play.</span>
            </div>
          </div>
          <div className="nl-reveal" style={{ transitionDelay: '.15s' }}>
            <div className="nl-img-frame nl-img-overlay-cyan rounded-2xl" style={{ aspectRatio: '4/3' }}>
              <img src="/landing-images/child-drawing-light.jpg" alt="Child drawing a glowing light trail" loading="lazy" className="nl-ken-burns" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="text-center mb-8 nl-reveal">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Your Hands Become the <span className="text-cyan-400 nl-glow-text">Tool</span>
            </h2>
          </div>
          <div className="max-w-2xl mx-auto mb-16 nl-reveal">
            <div className="nl-img-frame nl-img-overlay-dark rounded-2xl" style={{ aspectRatio: '16/9' }}>
              <img src="/landing-images/child-at-laptop.jpg" alt="Child gesturing at a laptop with webcam" loading="lazy" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <><path d="M18 11V6a2 2 0 00-2-2 2 2 0 00-2 2v0M14 10V4a2 2 0 00-2-2 2 2 0 00-2 2v2M10 10.5V6a2 2 0 00-2-2 2 2 0 00-2 2v8" /><path d="M18 8a2 2 0 012 2v7.1a2 2 0 01-.6 1.4l-3 2.9a2 2 0 01-1.4.6H9.5a2 2 0 01-1.4-.6l-5-5a2 2 0 010-2.8l.6-.6a2 2 0 012.8 0L10 16V6" /></>, color: '#22d3ee', step: '1', title: 'Raise Your Hand', desc: 'The camera detects movement in real time.' },
              { icon: <><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></>, color: '#fb923c', step: '2', title: 'Pinch to Draw', desc: "Thumb and index finger together. That's your pen." },
              { icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h.01M15 15h.01" /></>, color: '#22d3ee', step: '3', title: 'Release to Pause', desc: 'Open hand stops the action. No accidental marks.' },
              { icon: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />, color: '#fb923c', step: '4', title: 'Instant Response', desc: 'Smooth strokes. No lag. Natural left-to-right movement.' },
            ].map((s, i) => (
              <div key={i} className="nl-reveal nl-card-feature rounded-2xl p-8 text-center" style={{ transitionDelay: `${(i + 1) * .1}s` }}>
                <div className="w-14 h-14 mx-auto mb-5 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}33` }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round">{s.icon}</svg>
                </div>
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: `${s.color}99` }}>STEP {s.step}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 mt-10 tracking-wide nl-reveal">Unmirrored camera &middot; Natural motion &middot; No confusion</p>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="text-center mb-20 nl-reveal">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
              Five Ways to Learn Through <span className="text-cyan-400 nl-glow-text">Motion</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Paint */}
            <div className="nl-reveal nl-card-feature rounded-2xl overflow-hidden">
              <div className="nl-feature-img-wrap" style={{ aspectRatio: '16/9' }}>
                <img src="/landing-images/free-paint-particles.jpg" alt="Child painting in the air with light particles" loading="lazy" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(34,211,238,.7)' }}>01</span>
                  <h3 className="text-xl font-bold">Free Paint</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">Big glowing strokes. Multiple brush sizes. Kids create without limits.</p>
              </div>
            </div>
            {/* Tracing Mode */}
            <div className="nl-reveal nl-card-feature rounded-2xl overflow-hidden" style={{ transitionDelay: '.15s' }}>
              <div className="nl-feature-img-wrap" style={{ aspectRatio: '16/9' }}>
                <img src="/landing-images/tracing-letter.jpg" alt="Boy tracing the letter B with a glowing light trail" loading="lazy" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(251,146,60,.7)' }}>02</span>
                  <h3 className="text-xl font-bold">Tracing Mode</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">Letters A–Z. Shapes. Guided paths. On-path feedback. Instant celebration when completed.</p>
              </div>
            </div>
            {/* Bubble Pop */}
            <div className="nl-reveal nl-card-feature rounded-2xl overflow-hidden" style={{ transitionDelay: '.1s' }}>
              <div className="nl-feature-img-wrap" style={{ aspectRatio: '16/9' }}>
                <img src="/landing-images/bubble-pop.jpg" alt="Child reaching up to pop colorful floating bubbles" loading="lazy" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(34,211,238,.7)' }}>03</span>
                  <h3 className="text-xl font-bold">Bubble Pop</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">Timed challenge. 30 seconds. Reach 20 pops and unlock rewards.</p>
              </div>
            </div>
            {/* Sort & Place */}
            <div className="nl-reveal nl-card-feature rounded-2xl overflow-hidden" style={{ transitionDelay: '.25s' }}>
              <div className="nl-feature-img-wrap" style={{ aspectRatio: '16/9' }}>
                <img src="/landing-images/sort-place.jpg" alt="Child pinching a holographic cube with floating shapes" loading="lazy" />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(251,146,60,.7)' }}>04</span>
                  <h3 className="text-xl font-bold">Sort &amp; Place</h3>
                </div>
                <p className="text-gray-400 leading-relaxed">Grab by pinching. Sort by color, size, or category. Three levels. Increasing complexity.</p>
              </div>
            </div>
            {/* Word Search — NOW WITH wordsearch.jpg */}
            <div className="nl-reveal nl-card-feature rounded-2xl overflow-hidden md:col-span-2" style={{ transitionDelay: '.3s' }}>
              <div className="grid md:grid-cols-2">
                <div className="nl-wordsearch-img-wrap" style={{ aspectRatio: '16/9' }}>
                  <img src="/landing-images/wordsearch.jpg" alt="Word search game interface with letter grid and gesture-based highlighting" loading="lazy" />
                </div>
                <div className="p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(34,211,238,.7)' }}>05</span>
                    <h3 className="text-xl font-bold">Word Search</h3>
                  </div>
                  <p className="text-gray-400 leading-relaxed mb-4">Pinch to select. Drag to highlight. Find hidden words in a letter grid using gesture controls.</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Combines letter recognition with spatial scanning. Themed word sets keep it fresh. Difficulty scales with grid size and word count.</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-500 mt-12 text-base nl-reveal">
            Every mode is built around the same interaction logic. <span className="text-gray-300 font-semibold">One gesture. Total control.</span>
          </p>
        </div>
      </section>

      {/* ═══════ WHY THIS MATTERS ═══════ */}
      <section className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="nl-reveal">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-8 leading-tight">
              Movement Strengthens <span className="text-cyan-400 nl-glow-text">Learning</span>
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-10">
              When kids move, their brains engage differently. Draw in the Air supports development across multiple dimensions:
            </p>
            <div className="space-y-4">
              {[
                { icon: <><path d="M14 4h6v6M10 14l10-10M3 12a9 9 0 1018 0 9 9 0 00-18 0z" /></>, color: '#22d3ee', title: 'Fine motor development', desc: 'Precise pinch-and-release trains small muscle control' },
                { icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></>, color: '#fb923c', title: 'Hand-eye coordination', desc: 'Real-time tracking connects movement to visual feedback' },
                { icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 3v18" /></>, color: '#22d3ee', title: 'Spatial awareness', desc: 'Drawing in 3D space builds understanding of position and distance' },
                { icon: <path d="M4 7V4h16v3M9 20h6M12 4v16" />, color: '#fb923c', title: 'Early literacy', desc: 'Letter tracing through physical motion cements letter formation' },
                { icon: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />, color: '#22d3ee', title: 'Focus under timed interaction', desc: 'Bubble Pop builds sustained attention and quick decision-making' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center mt-0.5" style={{ background: `${item.color}15`, border: `1px solid ${item.color}33` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2">{item.icon}</svg>
                  </div>
                  <div><span className="font-bold text-gray-200">{item.title}</span><br /><span className="text-sm text-gray-500">{item.desc}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div className="nl-reveal" style={{ transitionDelay: '.2s' }}>
            <div className="nl-img-frame nl-img-overlay-cyan rounded-2xl max-w-md mx-auto" style={{ aspectRatio: '3/4', borderColor: 'rgba(34,211,238,.2)' }}>
              <img src="/landing-images/free-paint-particles.jpg" alt="Child surrounded by glowing light particles" loading="lazy" style={{ objectPosition: 'center top' }} />
            </div>
            <p className="text-center text-gray-600 text-sm mt-6 italic">This isn't entertainment disguised as education. It's interaction engineered for growth.</p>
          </div>
        </div>
      </section>

      {/* ═══════ FOR PARENTS ═══════ */}
      <section id="parents" className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20 grid lg:grid-cols-2 gap-16 items-center">
          <div className="nl-reveal order-2 lg:order-1">
            <div className="nl-img-frame nl-img-overlay-heavy rounded-2xl" style={{ aspectRatio: '4/3' }}>
              <img src="/landing-images/parent-child-screen.jpg" alt="Mother and child at a learning screen" loading="lazy" />
            </div>
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: 'No Downloads', color: '#22d3ee', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
                { label: 'No Ads', color: '#fb923c', icon: <><path d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10" /></> },
                { label: 'No Links Out', color: '#fb923c', icon: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></> },
                { label: 'No Storage', color: '#22d3ee', icon: <><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
              ].map((b, i) => (
                <div key={i} className="rounded-lg py-3 text-center" style={{ background: 'rgba(17,22,41,.8)', border: `1px solid ${b.color}18` }}>
                  <svg className="mx-auto mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={b.color} strokeWidth="1.5" opacity=".7">{b.icon}</svg>
                  <span className="text-gray-500 font-semibold block" style={{ fontSize: '10px' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="nl-reveal order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-tight">
              Screen Time You Don't Have to <span className="text-orange-400 nl-glow-orange">Feel Guilty</span> About
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed mb-8">
              Everything runs locally in the browser. Your child's camera feed never leaves the device. No accounts. No tracking. No surprises.
            </p>
            <button onClick={() => setTryFreeOpen(true)} className="nl-btn-primary inline-block text-white font-bold px-8 py-3.5 rounded-xl text-base border-none cursor-pointer">Start in 10 Seconds</button>
          </div>
        </div>
      </section>

      {/* ═══════ FOR SCHOOLS ═══════ */}
      <section id="schools" className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="nl-reveal">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-6">
                Built for <span className="text-cyan-400 nl-glow-text">Classrooms</span>
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-4">
                Runs on laptops. Works on interactive boards. No installs required. No student accounts needed.
              </p>
              <p className="text-base text-gray-500 mb-10">EYFS alignment support available. Designed for early years engagement.</p>
              <div className="flex flex-wrap gap-4">
                <button onClick={openPilotModal} className="nl-btn-primary text-white font-bold px-8 py-3.5 rounded-xl text-base">Request School Pilot Pack</button>
                <a href="/schools" className="nl-btn-secondary font-semibold px-8 py-3.5 rounded-xl text-base no-underline">Learn More</a>
              </div>
            </div>
            <div className="nl-reveal" style={{ transitionDelay: '.15s' }}>
              <div className="nl-school-photo-wrap" style={{ aspectRatio: '4/3' }}>
                <img src="/landing-images/classroom.jpg" alt="Children in a classroom with learning technology" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TECH CREDIBILITY ═══════ */}
      <section className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="nl-reveal">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4">
                Built Like a <span className="text-cyan-400 nl-glow-text">Serious</span> Product
              </h2>
              <p className="text-gray-500 text-base mt-4 mb-8">Performance matters. Kids notice lag instantly. We built this to feel immediate.</p>
              <div className="flex flex-wrap gap-3">
                {['60fps render loop', '30fps hand tracking', 'MediaPipe hand detection', 'One Euro Filter smoothing', 'Zero frame storage', 'No per-frame React rerenders'].map((t) => (
                  <span key={t} className="nl-tech-badge text-sm px-4 py-2 rounded-lg" style={{ color: 'rgba(34,211,238,.8)' }}>{t}</span>
                ))}
              </div>
            </div>
            <div className="nl-reveal" style={{ transitionDelay: '.15s' }}>
              <div className="nl-img-frame nl-img-overlay-dark rounded-2xl" style={{ aspectRatio: '4/3', borderColor: 'rgba(34,211,238,.25)' }}>
                <img src="/landing-images/hand-tracking.jpg" alt="Hand with MediaPipe landmark tracking" loading="lazy" />
              </div>
              <p className="text-center text-gray-600 text-xs mt-4 tracking-wider" style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}>REAL-TIME HAND LANDMARK DETECTION</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SOCIAL PROOF ═══════ */}
      <section className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-14 text-center nl-reveal">
            Loved by Families and <span className="text-orange-400 nl-glow-orange">Educators</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6 nl-reveal">
            {[
              { quote: 'My son struggled to trace letters on paper. This made it click.', author: 'Parent, Age 4', color: 'rgba(34,211,238,.3)' },
              { quote: "Best movement-based learning tool I've used in class.", author: 'Reception Teacher, London', color: 'rgba(251,146,60,.3)' },
              { quote: 'No downloads saved us IT time. Kids were using it in minutes.', author: 'IT Coordinator, Primary School', color: 'rgba(34,211,238,.3)' },
            ].map((t, i) => (
              <div key={i} className="nl-testimonial-card rounded-2xl p-8">
                <svg className="mb-4" width="28" height="28" viewBox="0 0 24 24" fill={t.color}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
                <p className="text-gray-300 leading-relaxed mb-4">{t.quote}</p>
                <p className="text-sm text-gray-600 font-semibold">{t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ PRIVACY ═══════ */}
      <section className="relative py-28">
        <div className="nl-section-divider" />
        <div className="max-w-6xl mx-auto px-6 pt-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="nl-reveal">
              <div className="nl-img-frame nl-img-overlay-dark rounded-2xl" style={{ aspectRatio: '4/3' }}>
                <img src="/landing-images/privacy-camera.jpg" alt="Privacy shield on laptop camera" loading="lazy" />
              </div>
            </div>
            <div className="nl-reveal text-center lg:text-left" style={{ transitionDelay: '.15s' }}>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-10">
                Privacy by <span className="text-cyan-400 nl-glow-text">Design</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {['Camera processed locally', 'No recordings', 'No child analytics', 'Adult gate for settings'].map((label) => (
                  <div key={label} className="rounded-xl p-5 text-center" style={{ background: 'rgba(17,22,41,.5)', border: '1px solid rgba(255,255,255,.05)' }}>
                    <div className="w-10 h-10 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,.1)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
                    </div>
                    <p className="text-sm text-gray-300 font-semibold">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-sm">
                Transparency builds trust.
                <a href="/privacy" className="ml-1 transition-colors no-underline" style={{ color: 'rgba(34,211,238,.6)' }}>Read our Privacy Policy →</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section id="launch" className="relative py-32">
        <div className="nl-section-divider" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full" style={{ width: 600, height: 400, background: 'rgba(34,211,238,.05)', filter: 'blur(100px)' }} />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 pt-12 text-center nl-reveal">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight">
            Let Them Draw.<br />Let Them Move.<br />Let Them <span className="text-cyan-400 nl-glow-text">Learn.</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-4 mt-10 mb-6">
            <button onClick={() => setTryFreeOpen(true)} className="nl-btn-primary text-white font-bold px-10 py-4 rounded-xl text-lg border-none cursor-pointer">Launch Draw in the Air</button>
            <a href="#how-it-works" className="nl-btn-secondary font-semibold px-10 py-4 rounded-xl text-lg no-underline">See It in Action</a>
          </div>
          <p className="text-sm text-gray-600">Works on modern browsers with camera access.</p>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)' }} className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Draw in the Air" className="h-8 w-auto" />
                <span className="font-bold">Draw in the Air</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Gesture-based learning platform for children aged 3–7. Built with care.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Product</h4>
              <div className="space-y-2.5">
                <button onClick={() => setTryFreeOpen(true)} className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors text-left" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Try Free</button>
                <a href="/demo" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Demo</a>
                <a href="/schools" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">School Pilot Pack</a>
                <a href="/faq" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">FAQ</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Legal</h4>
              <div className="space-y-2.5">
                <a href="/privacy" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Privacy Policy</a>
                <a href="/terms" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Terms of Use</a>
                <a href="/safeguarding" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Safeguarding</a>
                <a href="/accessibility" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Accessibility</a>
                <a href="/cookies" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">Cookie Policy</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Contact</h4>
              <div className="space-y-2.5">
                <a href="mailto:partnership@drawintheair.com" className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors no-underline">partnership@drawintheair.com</a>
                <button onClick={openPilotModal} className="block text-sm text-gray-500 hover:text-cyan-400 transition-colors text-left" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Request a Demo</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)' }} className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">© 2026 Draw in the Air. All rights reserved.</p>
            <p className="text-xs text-gray-700">Made with care for young learners.</p>
          </div>
        </div>
      </footer>

      {/* ═══════ FEEDBACK WIDGET ═══════ */}
      <button className="nl-feedback-btn" onClick={toggleFeedback} aria-label="Send Feedback">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
      </button>
      <div className={`nl-feedback-panel ${feedbackOpen ? 'nl-open' : ''}`}>
        {!feedbackSent ? (
          <div>
            <h3 className="font-bold text-base mb-1">Send Feedback</h3>
            <p className="text-xs text-gray-500 mb-4">We'd love to hear from you.</p>
            <textarea className="nl-form-input mb-3" rows={4} placeholder="What's on your mind?" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
            <input type="email" className="nl-form-input mb-4" placeholder="Email (optional)" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} />
            <div className="flex items-center justify-between">
              <button onClick={submitFeedback} disabled={feedbackSending} className="nl-btn-primary text-white font-semibold px-6 py-2 rounded-lg text-sm">
                {feedbackSending ? 'Sending...' : 'Send'}
              </button>
              <button onClick={toggleFeedback} className="text-xs text-gray-600 hover:text-gray-400 transition-colors" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,.1)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
            </div>
            <p className="text-sm font-semibold text-gray-300">Thank you!</p>
            <p className="text-xs text-gray-500 mt-1">Your feedback has been sent.</p>
          </div>
        )}
      </div>

      {/* ═══════ SCHOOL PILOT MODAL ═══════ */}
      <div className={`nl-modal-backdrop ${pilotOpen ? 'nl-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closePilotModal(); }}>
        <div className="nl-modal-content">
          {!pilotSent ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Request School Pilot Pack</h2>
                <button onClick={closePilotModal} className="text-gray-500 hover:text-white transition-colors" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-6">Fill in the details below and we'll send you everything you need to run a pilot in your school.</p>
              {pilotSubmitError && (
                <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.9rem' }}>
                  <strong>Error:</strong> {pilotSubmitError}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="nl-form-label">Your Name *</label>
                  <input type="text" className="nl-form-input" placeholder="Jane Smith" value={pilotName} onChange={(e) => { setPilotName(e.target.value); setPilotErrors((p) => ({ ...p, name: false })); }} style={pilotErrors.name ? { borderColor: 'rgba(239,68,68,.5)' } : {}} />
                </div>
                <div>
                  <label className="nl-form-label">Email *</label>
                  <input type="email" className="nl-form-input" placeholder="jane@school.edu" value={pilotEmail} onChange={(e) => { setPilotEmail(e.target.value); setPilotErrors((p) => ({ ...p, email: false })); }} style={pilotErrors.email ? { borderColor: 'rgba(239,68,68,.5)' } : {}} />
                </div>
                <div>
                  <label className="nl-form-label">School Name *</label>
                  <input type="text" className="nl-form-input" placeholder="Elm Park Primary" value={pilotSchool} onChange={(e) => { setPilotSchool(e.target.value); setPilotErrors((p) => ({ ...p, school: false })); }} style={pilotErrors.school ? { borderColor: 'rgba(239,68,68,.5)' } : {}} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="nl-form-label">Your Role</label>
                    <select className="nl-form-input" value={pilotRole} onChange={(e) => setPilotRole(e.target.value)}>
                      <option value="">Select...</option>
                      <option>Teacher</option>
                      <option>Teaching Assistant</option>
                      <option>SENCO</option>
                      <option>Head Teacher</option>
                      <option>IT Coordinator</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="nl-form-label">Year Group</label>
                    <select className="nl-form-input" value={pilotYear} onChange={(e) => setPilotYear(e.target.value)}>
                      <option value="">Select...</option>
                      <option>Nursery (3-4)</option>
                      <option>Reception (4-5)</option>
                      <option>Year 1 (5-6)</option>
                      <option>Year 2 (6-7)</option>
                      <option>Mixed / SEN</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="nl-form-label">Primary Device Type</label>
                  <select className="nl-form-input" value={pilotDevice} onChange={(e) => setPilotDevice(e.target.value)}>
                    <option value="">Select...</option>
                    <option>Laptops</option>
                    <option>Chromebooks</option>
                    <option>iPads / Tablets</option>
                    <option>Interactive Whiteboard</option>
                    <option>Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="nl-form-label">Additional Notes</label>
                  <textarea className="nl-form-input" rows={3} placeholder="Anything else we should know?" value={pilotNotes} onChange={(e) => setPilotNotes(e.target.value)} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button onClick={submitPilot} disabled={pilotSending} className="nl-btn-primary text-white font-bold px-8 py-3 rounded-xl text-base">
                  {pilotSending ? 'Sending...' : 'Send Request'}
                </button>
                <button onClick={closePilotModal} className="text-sm text-gray-600 hover:text-gray-400 transition-colors" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,.1)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-200 mb-2">Request Sent!</h3>
              <p className="text-sm text-gray-500">We'll be in touch within 24 hours with your pilot pack.</p>
              <button onClick={closePilotModal} className="nl-btn-secondary font-semibold px-6 py-2 rounded-lg text-sm mt-6">Close</button>
            </div>
          )}
        </div>
      </div>

      <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
    </div>
  );
};
