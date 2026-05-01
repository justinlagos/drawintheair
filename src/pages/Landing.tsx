/**
 * Landing - Draw in the Air (Kid-UI bright sky redesign)
 *
 * Marketing landing rewritten to match the in-app Kid-UI design system:
 *   • Bright sky+meadow scene (sun, clouds, sparkles, rainbow trail)
 *   • Fredoka display headlines, Nunito body
 *   • KidButton primary/secondary CTAs everywhere
 *   • KidPanel + KidGameCard tiles for activities, parents, schools
 *   • Tactile 2.5D illustrations for each game mode (no emoji)
 *   • Soft, warm, kid-friendly. Never dark.
 *
 * Preserves the existing modals (TryFreeModal, School Pilot pack request,
 * Feedback widget) and the submitFormData wiring.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TryFreeModal } from '../components/TryFreeModal';
import { submitFormData } from '../lib/formSubmission';
import { KidButton } from '../components/kid-ui';
import { tokens } from '../styles/tokens';
import { LANDING_INLINE_CSS } from '../components/landing/landingInlineStyles';
// External CSS kept as a fallback (dev fast-refresh, browser cache benefits).
// LANDING_INLINE_CSS is the resilient source of truth — it ships in the JS
// bundle and renders via <style> below, so the page is never broken even if
// the external chunk fails to load on Vercel.
import '../components/landing/landing-kid.css';

// ─── Mode showcase data ────────────────────────────────────────────────
// Bespoke Kid-UI mascot tiles. No emoji, no stock photos.
interface ModeTile {
  id: string;
  step: string;
  title: string;
  description: string;
  detail: string;
  accent: string;
  illustration: React.ReactNode;
}

// Reusable hand+sparkle illustration core
const SparkleHand = ({ accent }: { accent: string }) => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`hand-skin-${accent}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE7C9" />
        <stop offset="1" stopColor="#F4C58E" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill={accent} opacity="0.18" />
    <circle cx="60" cy="60" r="44" fill="#FFFFFF" opacity="0.6" />
    {/* Pinch hand (thumb + index) */}
    <path d="M40 78 C40 60 50 50 56 50 L60 50 C66 50 72 56 72 60 L72 70 C76 70 80 74 80 78 L80 84 C80 92 74 98 66 98 L52 98 C44 98 40 92 40 84 Z"
      fill={`url(#hand-skin-${accent})`} stroke="#3F4052" strokeWidth="2" />
    {/* Pinch dot */}
    <circle cx="60" cy="48" r="6" fill="#FFFFFF" stroke={accent} strokeWidth="3" />
    <circle cx="60" cy="48" r="2.5" fill={accent} />
    {/* Sparkles */}
    <path d="M86 32 l3 0 l1 -8 l1 8 l3 0 l-3 1 l-1 8 l-1 -8 z" fill="#FFD84D" />
    <path d="M28 28 l2 0 l0 -6 l1 6 l2 0 l-2 1 l0 6 l-1 -6 z" fill="#FF6B6B" />
    <circle cx="92" cy="62" r="3" fill="#7ED957" />
    <circle cx="22" cy="64" r="2.5" fill="#55DDE0" />
  </svg>
);

const FreePaintIllustration = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FF6B6B" opacity="0.18" />
    <path d="M16 78 Q40 50 60 70 T104 56" stroke="#FF6B6B" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M22 92 Q42 70 62 84 T100 76" stroke="#FFD84D" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M28 60 Q50 40 70 50" stroke="#55DDE0" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="104" cy="56" r="9" fill="#FFFFFF" stroke="#FF6B6B" strokeWidth="3" />
    <circle cx="104" cy="56" r="3.5" fill="#FF6B6B" />
    {/* Brush tip */}
    <rect x="86" y="82" width="22" height="8" rx="4" fill="#6C3FA4" transform="rotate(-25 86 82)" />
    <path d="M82 90 l8 -4" stroke="#FFD84D" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const TracingIllustration = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#55DDE0" opacity="0.18" />
    {/* Letter B trace */}
    <path d="M44 28 L44 92" stroke="#E8DEFB" strokeWidth="14" strokeLinecap="round" />
    <path d="M44 28 Q70 28 70 44 Q70 56 50 60 Q74 60 74 76 Q74 92 44 92" stroke="#E8DEFB" strokeWidth="14" strokeLinecap="round" fill="none" />
    <path d="M44 28 Q70 28 70 44 Q70 56 50 60 Q74 60 74 76 Q74 92 44 92" stroke="#6C3FA4" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" fill="none" />
    {/* Glowing trace dot */}
    <circle cx="74" cy="76" r="9" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="3" />
    <circle cx="74" cy="76" r="4" fill="#55DDE0" />
    {/* Stars */}
    <path d="M92 30 l2 0 l1 -7 l1 7 l2 0 l-2 1 l-1 6 l-1 -6 z" fill="#FFD84D" />
    <circle cx="22" cy="30" r="3" fill="#FF6B6B" />
  </svg>
);

const BubblePopIllustration = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bub-1" cx="0.35" cy="0.35">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.5" stopColor="#A8D8FF" />
        <stop offset="1" stopColor="#55DDE0" />
      </radialGradient>
      <radialGradient id="bub-2" cx="0.35" cy="0.35">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.5" stopColor="#FFD2E0" />
        <stop offset="1" stopColor="#FF6B6B" />
      </radialGradient>
      <radialGradient id="bub-3" cx="0.35" cy="0.35">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.5" stopColor="#FFF1B5" />
        <stop offset="1" stopColor="#FFD84D" />
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="#A8D8FF" opacity="0.18" />
    <circle cx="38" cy="48" r="20" fill="url(#bub-1)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="33" cy="42" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.7" />
    <circle cx="76" cy="40" r="14" fill="url(#bub-3)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="73" cy="36" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.7" />
    <circle cx="68" cy="80" r="22" fill="url(#bub-2)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="62" cy="74" rx="7" ry="4" fill="#FFFFFF" opacity="0.7" />
    {/* Pop sparkle */}
    <path d="M30 80 l4 4 M26 84 l8 0 M30 88 l4 -4" stroke="#FFD84D" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SortPlaceIllustration = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#7ED957" opacity="0.18" />
    {/* Two boxes */}
    <rect x="14" y="64" width="38" height="36" rx="8" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="2.5" />
    <rect x="68" y="64" width="38" height="36" rx="8" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="2.5" />
    {/* Box labels */}
    <circle cx="33" cy="82" r="6" fill="#FF6B6B" />
    <rect x="83" y="76" width="10" height="10" rx="2" fill="#55DDE0" />
    {/* Floating items */}
    <circle cx="36" cy="40" r="11" fill="#FF6B6B" />
    <ellipse cx="32" cy="36" rx="3" ry="2" fill="#FFFFFF" opacity="0.7" />
    <rect x="68" y="28" width="22" height="22" rx="4" fill="#55DDE0" />
    <rect x="71" y="32" width="6" height="3" rx="1" fill="#FFFFFF" opacity="0.7" />
    {/* Arrows */}
    <path d="M44 50 L40 60" stroke="#7ED957" strokeWidth="3" strokeLinecap="round" markerEnd="url(#arr)" />
    <path d="M76 50 L80 60" stroke="#7ED957" strokeWidth="3" strokeLinecap="round" />
    <defs>
      <marker id="arr" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="#7ED957" />
      </marker>
    </defs>
  </svg>
);

const WordSearchIllustration = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFD84D" opacity="0.20" />
    <rect x="20" y="20" width="80" height="80" rx="14" fill="#FFFFFF" stroke="#6C3FA4" strokeOpacity="0.18" strokeWidth="2" />
    {/* 4x4 letter grid */}
    {['C', 'A', 'T', 'B', 'D', 'O', 'G', 'R', 'S', 'U', 'N', 'Q', 'M', 'A', 'P', 'X'].map((ch, i) => {
      const col = i % 4; const row = Math.floor(i / 4);
      return (
        <text
          key={i}
          x={32 + col * 18}
          y={42 + row * 18}
          textAnchor="middle"
          fontFamily="Fredoka, sans-serif"
          fontSize="14"
          fontWeight="700"
          fill="#3F4052"
        >{ch}</text>
      );
    })}
    {/* Highlight line through CAT */}
    <rect x="26" y="32" width="46" height="14" rx="7" fill="#FFD84D" opacity="0.5" />
  </svg>
);

const MODE_TILES: ModeTile[] = [
  {
    id: 'free-paint',
    step: '01',
    title: 'Free Paint',
    description: 'Big glowing strokes. Choose colours and brush sizes.',
    detail: 'Kids create freely while building fine-motor confidence: pinch, paint, release.',
    accent: tokens.colors.coral,
    illustration: <FreePaintIllustration />,
  },
  {
    id: 'tracing',
    step: '02',
    title: 'Tracing',
    description: 'Letters A to Z, numbers and shapes. Guided, kid-friendly paths.',
    detail: 'On-path feedback in real time, with a celebration on every finish.',
    accent: tokens.colors.aqua,
    illustration: <TracingIllustration />,
  },
  {
    id: 'bubble-pop',
    step: '03',
    title: 'Bubble Pop',
    description: 'Reach, pinch, pop. A timed challenge of focus and reaction.',
    detail: 'Builds sustained attention, quick decisions and gross-motor reach.',
    accent: tokens.colors.bubbleBlue,
    illustration: <BubblePopIllustration />,
  },
  {
    id: 'sort-place',
    step: '04',
    title: 'Sort & Place',
    description: 'Pick up shapes, animals, food, vehicles. Place them in the right home.',
    detail: 'Seven themed worlds: beach, jungle, kitchen, recycling, classroom and more.',
    accent: tokens.colors.meadowGreen,
    illustration: <SortPlaceIllustration />,
  },
  {
    id: 'word-search',
    step: '05',
    title: 'Word Search',
    description: 'Find hidden words by drawing through the grid with a pinch.',
    detail: 'Six chapters of difficulty. Letter recognition meets spatial scanning.',
    accent: tokens.colors.sunshine,
    illustration: <WordSearchIllustration />,
  },
];

// ─── Skill data (Why this matters) ─────────────────────────────────────
interface Skill {
  title: string;
  description: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const SKILLS: Skill[] = [
  {
    title: 'Fine motor control',
    description: 'Precise pinch-and-release trains small muscle coordination.',
    color: tokens.colors.coral,
    bg: '#FFE2E2',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11V6a2 2 0 014 0v5" /><path d="M5 13V8a2 2 0 014 0" /><path d="M13 11v-1a2 2 0 014 0v6" /><path d="M17 13a2 2 0 014 0v3a8 8 0 01-16 0v-1" />
      </svg>
    ),
  },
  {
    title: 'Hand–eye coordination',
    description: 'Real-time feedback links body movement to visual outcome.',
    color: tokens.colors.aqua,
    bg: '#D9F7F7',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Spatial awareness',
    description: 'Drawing in 3D space teaches position, scale and distance.',
    color: tokens.colors.deepPlum,
    bg: '#EAE0FB',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 3v18" />
      </svg>
    ),
  },
  {
    title: 'Early literacy',
    description: 'Tracing letters with motion cements letter-formation memory.',
    color: tokens.colors.warmOrange,
    bg: '#FFE9CF',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" /><path d="M9 20h6M12 4v16" />
      </svg>
    ),
  },
  {
    title: 'Sustained focus',
    description: 'Fast feedback and clear goals build attention and confidence.',
    color: tokens.colors.sunshine,
    bg: '#FFF3B5',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: 'Active screen time',
    description: 'Replaces passive scroll with movement-based engagement.',
    color: tokens.colors.meadowGreen,
    bg: '#DCF5C9',
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /><circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

// ─── Steps ─────────────────────────────────────────────────────────────
interface Step {
  step: string;
  title: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    step: '1',
    title: 'Raise Your Hand',
    desc: 'The webcam spots your hand in real time.',
    color: tokens.colors.deepPlum,
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11V6a2 2 0 014 0v5" /><path d="M5 13V8a2 2 0 014 0" /><path d="M13 11v-1a2 2 0 014 0v6" /><path d="M17 13a2 2 0 014 0v3a8 8 0 01-16 0v-1" />
      </svg>
    ),
  },
  {
    step: '2',
    title: 'Pinch to Draw',
    desc: 'Touch your thumb and finger together. That\'s the pen.',
    color: tokens.colors.coral,
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    step: '3',
    title: 'Open Hand to Pause',
    desc: 'Lift away. No accidental marks. Total control.',
    color: tokens.colors.aqua,
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h.01M15 15h.01" />
      </svg>
    ),
  },
  {
    step: '4',
    title: 'Instant Magic',
    desc: 'Smooth, lag-free strokes that feel like real drawing.',
    color: tokens.colors.sunshine,
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

// ─── Component ─────────────────────────────────────────────────────────
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

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('dl-visible');
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.dl-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Esc closes things
  const closePilotModal = useCallback(() => {
    setPilotOpen(false);
    document.body.style.overflow = '';
  }, []);

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
  }, [closePilotModal]);

  const toggleFeedback = useCallback(() => {
    setFeedbackOpen((prev) => {
      if (!prev) setFeedbackSent(false);
      return !prev;
    });
  }, []);

  const submitFeedback = useCallback(() => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    submitFormData({
      type: 'feedback',
      email: feedbackEmail.trim() || undefined,
      message: feedbackText.trim(),
    }).then(() => {
      setFeedbackSent(true);
      setFeedbackText('');
      setFeedbackEmail('');
      setFeedbackSending(false);
      setTimeout(() => setFeedbackOpen(false), 2500);
    }).catch(() => setFeedbackSending(false));
  }, [feedbackText, feedbackEmail]);

  const openPilotModal = useCallback(() => {
    setPilotOpen(true);
    setPilotSent(false);
    setPilotErrors({});
    setPilotSubmitError('');
    document.body.style.overflow = 'hidden';
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
    submitFormData({
      type: 'school_pack_request',
      name: pilotName.trim(),
      email: pilotEmail.trim(),
      school: pilotSchool.trim(),
      role: pilotRole,
      yearGroup: pilotYear,
      deviceType: pilotDevice,
      sendNotes: pilotNotes.trim(),
    }).then(() => {
      setPilotSent(true);
      setPilotSending(false);
      setPilotName(''); setPilotEmail(''); setPilotSchool('');
      setPilotRole(''); setPilotYear(''); setPilotDevice(''); setPilotNotes('');
    }).catch((err: { message?: string }) => {
      setPilotSubmitError(err.message ?? 'Something went wrong. Please try again.');
      setPilotSending(false);
    });
  }, [pilotName, pilotEmail, pilotSchool, pilotRole, pilotYear, pilotDevice, pilotNotes]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    closeMobileMenu();
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="dl-page">
      {/* Inline CSS — guarantees layout works even if the external CSS chunk
          fails to load in production (Vite/Vercel CSS code-splitting can
          silently drop chunks; this <style> ships with the JS bundle). */}
      <style dangerouslySetInnerHTML={{ __html: LANDING_INLINE_CSS }} />

      {/* ═══════ STATIC SKY BACKGROUND ═══════ */}
      <div className="dl-sky-scene" aria-hidden>
        <div className="dl-sun" />
        <div className="dl-cloud dl-cloud-1" />
        <div className="dl-cloud dl-cloud-2" />
        <div className="dl-cloud dl-cloud-3" />
        <div className="dl-cloud dl-cloud-4" />
        {/* Sparkles */}
        <div className="dl-spark" style={{ top: '18%', left: '12%', width: 80, height: 80, color: 'rgba(255,216,77,.55)' }} />
        <div className="dl-spark" style={{ top: '32%', right: '6%', width: 110, height: 110, color: 'rgba(255,107,107,.40)', animationDelay: '-2s' }} />
        <div className="dl-spark" style={{ top: '55%', left: '4%', width: 90, height: 90, color: 'rgba(85,221,224,.45)', animationDelay: '-4s' }} />
        <div className="dl-spark" style={{ top: '70%', right: '14%', width: 70, height: 70, color: 'rgba(126,217,87,.45)', animationDelay: '-1s' }} />
      </div>

      {/* ═══════ NAV ═══════ */}
      <nav
        className="dl-nav-fixed dl-nav-blur"
        style={{
          background: 'rgba(255, 255, 255, 0.78)',
          borderBottom: '1.5px solid rgba(108, 63, 164, 0.10)',
        }}
      >
        <div className="dl-container dl-flex dl-items-center dl-justify-between" style={{ height: 64 }}>
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="dl-flex dl-items-center dl-gap-3 group cursor-pointer"
            style={{ textDecoration: 'none', flexShrink: 0 }}
            style={{ color: tokens.colors.charcoal }}
          >
            <img src="/logo.png" alt="Draw in the Air" style={{ height: '36px', width: 'auto', objectFit: 'contain', transition: 'transform 0.3s ease-out' }} />
            <span style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: '1.1rem',
              color: tokens.colors.deepPlum,
              letterSpacing: '-0.01em',
            }} className="dl-brand-name">Draw in the Air</span>
          </a>
          <div className="dl-desktop-only dl-items-center" style={{ gap: 28, fontFamily: tokens.fontFamily.body, fontWeight: 600, color: tokens.colors.charcoal }}>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="dl-nav-link">How it Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="dl-nav-link">Activities</a>
            <a href="#parents" onClick={(e) => scrollToSection(e, 'parents')} className="dl-nav-link">For Parents</a>
            <a href="#schools" onClick={(e) => scrollToSection(e, 'schools')} className="dl-nav-link">For Schools</a>
            <a href="/faq" className="dl-nav-link">FAQ</a>
            <KidButton variant="primary" size="md" onClick={() => setTryFreeOpen(true)} style={{ minHeight: '44px', padding: '8px 22px', fontSize: '0.95rem' }}>
              Try Free
            </KidButton>
            <KidButton variant="secondary" size="md" onClick={openPilotModal} style={{ minHeight: '44px', padding: '8px 20px', fontSize: '0.95rem' }}>
              School Pilot
            </KidButton>
          </div>
          <button
            className="dl-mobile-only"
            style={{ background: 'none', border: 'none', boxShadow: 'none', color: tokens.colors.deepPlum }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="dl-mobile-drawer dl-mobile-only-block" style={{ padding: '8px 24px 16px', fontFamily: tokens.fontFamily.body, color: tokens.colors.charcoal }}>
            <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>How it Works</a>
            <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>Activities</a>
            <a href="#parents" onClick={(e) => scrollToSection(e, 'parents')} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>For Parents</a>
            <a href="#schools" onClick={(e) => scrollToSection(e, 'schools')} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>For Schools</a>
            <a href="/faq" className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>FAQ</a>
            <div className="dl-flex-col dl-gap-3" style={{ marginTop: 12 }}>
              <KidButton variant="primary" size="md" onClick={() => { closeMobileMenu(); setTryFreeOpen(true); }} fullWidth>Try Free</KidButton>
              <KidButton variant="secondary" size="md" onClick={() => { closeMobileMenu(); openPilotModal(); }} fullWidth>School Pilot</KidButton>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section style={{ position: 'relative', minHeight: '100vh', paddingTop: '90px', paddingBottom: '40px', zIndex: 1 }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-fade-up" style={{ position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.85)',
              border: '2px solid rgba(108, 63, 164, 0.15)',
              borderRadius: 9999,
              padding: '6px 14px',
              fontFamily: tokens.fontFamily.body,
              fontWeight: 700,
              fontSize: '0.85rem',
              color: tokens.colors.deepPlum,
              boxShadow: tokens.shadow.float,
              marginBottom: tokens.spacing.lg,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: tokens.colors.meadowGreen }} />
              Hands-free play for ages 3 to 7
            </div>
            <h1 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.xl,
            }}>
              Learning that{' '}
              <span style={{
                color: tokens.colors.deepPlum,
                position: 'relative',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}>
                moves
                <svg
                  viewBox="0 0 220 22"
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    bottom: '-12px',
                    width: '100%',
                    height: '20px',
                  }}
                >
                  <path
                    d="M4 14 Q60 2 110 11 T216 9"
                    stroke={tokens.colors.sunshine}
                    strokeWidth="8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            </h1>
            <p style={{
              fontFamily: tokens.fontFamily.body,
              fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)',
              lineHeight: 1.55,
              color: tokens.colors.charcoal,
              opacity: 0.85,
              maxWidth: 540,
              marginBottom: tokens.spacing.xxl,
            }}>
              Draw in the Air turns your child's hands into the controller. No touchscreens. No downloads.
              Just motion, creativity, and play that builds real skills.
            </p>
            <div className="dl-flex dl-flex-wrap dl-items-center dl-gap-4" style={{ marginBottom: 24 }}>
              <div className="dl-cta-glow">
                <KidButton variant="primary" size="lg" onClick={() => setTryFreeOpen(true)}>
                  Play Now. It's Free
                </KidButton>
              </div>
              <KidButton
                variant="secondary"
                size="lg"
                onClick={(e) => scrollToSection(e as unknown as React.MouseEvent<HTMLAnchorElement>, 'how-it-works')}
              >
                See How It Works
              </KidButton>
            </div>
            <div className="dl-flex dl-items-center dl-flex-wrap dl-gap-3" style={{ marginTop: 24, color: tokens.colors.charcoal, opacity: 0.75 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.meadowGreen} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
                Runs in your browser
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.meadowGreen} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
                No installs
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tokens.colors.meadowGreen} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
                Camera stays on the device
              </span>
            </div>
          </div>

          {/* Hero illustration card */}
          <div className="dl-fade-up" style={{ animationDelay: '0.2s', position: 'relative' }}>
            <div className="dl-hero-frame" style={{ aspectRatio: '4/3' }}>
              {/* Inside-card 2.5D scene */}
              <svg viewBox="0 0 480 360" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#9FDFFF" />
                    <stop offset="0.5" stopColor="#BEEBFF" />
                    <stop offset="1" stopColor="#FFF6E5" />
                  </linearGradient>
                  <linearGradient id="hgrass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#92E36C" />
                    <stop offset="1" stopColor="#7ED957" />
                  </linearGradient>
                  <radialGradient id="hsun" cx="0.35" cy="0.35">
                    <stop offset="0" stopColor="#FFF1B5" />
                    <stop offset="0.5" stopColor="#FFD84D" />
                    <stop offset="1" stopColor="#FFB14D" />
                  </radialGradient>
                  <linearGradient id="htrail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#FF6B6B" />
                    <stop offset="0.33" stopColor="#FFD84D" />
                    <stop offset="0.66" stopColor="#7ED957" />
                    <stop offset="1" stopColor="#55DDE0" />
                  </linearGradient>
                </defs>
                {/* Sky */}
                <rect width="480" height="360" fill="url(#hsky)" />
                {/* Sun */}
                <circle cx="380" cy="80" r="44" fill="url(#hsun)" opacity="0.95" />
                {/* Clouds */}
                <ellipse cx="80" cy="60" rx="36" ry="14" fill="#FFFFFF" opacity="0.95" />
                <ellipse cx="100" cy="55" rx="22" ry="12" fill="#FFFFFF" opacity="0.95" />
                <ellipse cx="220" cy="40" rx="30" ry="11" fill="#FFFFFF" opacity="0.85" />
                {/* Hills */}
                <path d="M0 280 Q90 230 180 250 T360 240 T480 260 L480 360 L0 360 Z" fill="#B5F15C" opacity="0.6" />
                <path d="M0 300 Q120 260 220 280 T420 280 T480 300 L480 360 L0 360 Z" fill="url(#hgrass)" />
                {/* Rainbow trail (animated) */}
                <path
                  className="dl-trail-draw"
                  d="M40 260 Q120 180 200 200 T340 130 T440 90"
                  stroke="url(#htrail)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.95"
                />
                {/* Trail sparkles */}
                <path className="dl-wobble" d="M260 150 l3 0 l1 -10 l1 10 l3 0 l-3 1 l-1 10 l-1 -10 z" fill="#FFD84D" />
                <circle cx="120" cy="220" r="5" fill="#FFFFFF" stroke="#FF6B6B" strokeWidth="2" />
                <circle cx="380" cy="120" r="4" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="2" />
                {/* Kid silhouette: playful, simple */}
                <g transform="translate(180,200)">
                  {/* Body */}
                  <rect x="-22" y="40" width="44" height="62" rx="14" fill="#FF6B6B" />
                  {/* Head */}
                  <circle cx="0" cy="22" r="22" fill="#FFE7C9" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
                  {/* Hair */}
                  <path d="M-22 16 Q-16 -2 0 -2 Q16 -2 22 16 Q14 6 0 6 Q-14 6 -22 16 z" fill="#3F4052" />
                  {/* Eyes */}
                  <circle cx="-7" cy="22" r="2.4" fill="#3F4052" />
                  <circle cx="7" cy="22" r="2.4" fill="#3F4052" />
                  {/* Smile */}
                  <path d="M-6 30 Q0 36 6 30" stroke="#3F4052" strokeWidth="2" strokeLinecap="round" fill="none" />
                  {/* Arm raised pinching */}
                  <path d="M16 50 Q40 30 60 -20" stroke="#FFE7C9" strokeWidth="14" strokeLinecap="round" fill="none" />
                  {/* Pinch hand */}
                  <circle cx="60" cy="-20" r="10" fill="#FFE7C9" stroke="#3F4052" strokeOpacity="0.3" strokeWidth="1.5" />
                </g>
                {/* Pinch sparkle dot */}
                <circle cx="240" cy="180" r="9" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="3" />
                <circle cx="240" cy="180" r="3.5" fill="#55DDE0" />
              </svg>

              {/* Live cursor overlay */}
              <div className="dl-pinch-cursor" style={{ position: 'absolute', top: '38%', left: '46%' }} />
            </div>

            {/* Floating "TRACKING" pill */}
            <div className="dl-float" style={{
              position: 'absolute',
              top: -16,
              left: -16,
              background: '#FFFFFF',
              border: `2px solid ${tokens.colors.aqua}`,
              borderRadius: 9999,
              padding: '8px 14px',
              fontFamily: tokens.fontFamily.body,
              fontWeight: 700,
              fontSize: '0.85rem',
              color: tokens.colors.charcoal,
              boxShadow: tokens.shadow.float,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              zIndex: 2,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: tokens.colors.meadowGreen, boxShadow: `0 0 0 4px ${tokens.colors.meadowGreen}33` }} />
              Tracking 60fps
            </div>

            {/* Floating "PINCH ON" badge */}
            <div className="dl-float-2" style={{
              position: 'absolute',
              bottom: -12,
              right: -12,
              background: tokens.colors.sunshine,
              border: `3px solid #FFFFFF`,
              borderRadius: 9999,
              padding: '10px 18px',
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: '0.95rem',
              color: tokens.colors.charcoal,
              boxShadow: tokens.shadow.glow,
              zIndex: 2,
            }}>
              ✨ Pinch on
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" style={{ marginTop: '8px', marginBottom: '8px' }} />

      {/* ═══════ PROBLEM ═══════ */}
      <section style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container dl-grid-3-2">
          <div className="dl-reveal">
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.xl,
            }}>
              Screens that drain.<br />
              Or screens that <span style={{ color: tokens.colors.deepPlum }}>build</span>.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.15rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: tokens.spacing.lg, maxWidth: 620 }}>
              Most kids' screen time is passive. Tap. Swipe. Scroll. Repeat. Draw in the Air flips
              that. Here, screen time means moving: reaching, pinching, tracing, focusing.
            </p>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.15rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, maxWidth: 620 }}>
              Real motion builds real coordination. And kids love the magic of it.
            </p>
            <div style={{
              display: 'inline-block',
              marginTop: tokens.spacing.xxl,
              background: tokens.colors.sunshine,
              border: `3px solid #FFFFFF`,
              borderRadius: 9999,
              padding: '12px 24px',
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: '1.1rem',
              color: tokens.colors.charcoal,
              boxShadow: tokens.shadow.glow,
            }}>
              This is active digital play.
            </div>
          </div>
          <div className="dl-reveal" style={{ position: 'relative' }}>
            <div style={{
              position: 'relative',
              aspectRatio: '1/1',
              borderRadius: 36,
              background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)',
              border: '3px solid rgba(108, 63, 164, 0.12)',
              boxShadow: tokens.shadow.float,
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <SparkleHand accent={tokens.colors.deepPlum} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container">
          <div className="dl-reveal dl-text-center" style={{ marginBottom: tokens.spacing.xxxl }}>
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.lg,
            }}>
              Your hands become the <span style={{ color: tokens.colors.deepPlum }}>tool</span>
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.1rem', color: tokens.colors.charcoal, opacity: 0.7, maxWidth: 620, margin: '0 auto' }}>
              Four simple gestures. Endless ways to play.
            </p>
          </div>

          <div className="dl-grid-4">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="dl-reveal"
                style={{
                  background: 'linear-gradient(165deg, #FFFFFF 0%, #FBFCFF 60%, #F4FAFF 100%)',
                  border: '2px solid rgba(108, 63, 164, 0.14)',
                  borderRadius: 28,
                  padding: 28,
                  textAlign: 'center',
                  boxShadow: tokens.shadow.panel,
                  transitionDelay: `${i * 0.08}s`,
                  position: 'relative',
                }}
              >
                <div className="dl-step-num" style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)' }}>
                  {s.step}
                </div>
                <div style={{
                  width: 72,
                  height: 72,
                  margin: '24px auto 16px',
                  borderRadius: 22,
                  background: `linear-gradient(165deg, ${s.color}22 0%, ${s.color}10 100%)`,
                  border: `2px solid ${s.color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  boxShadow: tokens.shadow.inset,
                }}>
                  {s.icon}
                </div>
                <h3 style={{
                  fontFamily: tokens.fontFamily.display,
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: tokens.colors.charcoal,
                  marginBottom: 8,
                }}>{s.title}</h3>
                <p style={{
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '0.95rem',
                  color: tokens.colors.charcoal,
                  opacity: 0.7,
                  lineHeight: 1.5,
                }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ FEATURES ═══════ */}
      <section id="features" style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container">
          <div className="dl-reveal dl-text-center" style={{ marginBottom: tokens.spacing.xxxl }}>
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.lg,
            }}>
              Five worlds. <span style={{ color: tokens.colors.deepPlum }}>One pinch.</span>
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.1rem', color: tokens.colors.charcoal, opacity: 0.7, maxWidth: 620, margin: '0 auto' }}>
              Every mode is built around the same simple gesture. Learn one. Play them all.
            </p>
          </div>

          <div className="dl-grid-features">
            {MODE_TILES.map((mode, i) => (
              <div
                key={mode.id}
                className="dl-reveal dl-mode-tile"
                style={{
                  background: 'linear-gradient(165deg, #FFFFFF 0%, #FBFCFF 60%, #F4FAFF 100%)',
                  border: `2.5px solid ${mode.accent}33`,
                  borderRadius: 32,
                  padding: 28,
                  boxShadow: tokens.shadow.float,
                  transitionDelay: `${i * 0.08}s`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  minHeight: 380,
                }}
              >
                <div style={{
                  aspectRatio: '1/1',
                  width: '70%',
                  margin: '0 auto',
                  background: `radial-gradient(circle at 35% 25%, #FFFFFF 0%, ${mode.accent}15 70%)`,
                  borderRadius: 28,
                  padding: 16,
                  border: `2px solid ${mode.accent}22`,
                  boxShadow: tokens.shadow.inset,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {mode.illustration}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    background: mode.accent,
                    color: tokens.colors.charcoal,
                    fontFamily: tokens.fontFamily.display,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '4px 12px',
                    borderRadius: 9999,
                    border: '2px solid #FFFFFF',
                    boxShadow: tokens.shadow.float,
                  }}>{mode.step}</span>
                  <h3 style={{
                    fontFamily: tokens.fontFamily.display,
                    fontWeight: 700,
                    fontSize: '1.5rem',
                    color: tokens.colors.charcoal,
                  }}>{mode.title}</h3>
                </div>
                <p style={{
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '1rem',
                  color: tokens.colors.charcoal,
                  opacity: 0.85,
                  lineHeight: 1.5,
                  marginBottom: 4,
                }}>{mode.description}</p>
                <p style={{
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '0.9rem',
                  color: tokens.colors.charcoal,
                  opacity: 0.6,
                  lineHeight: 1.5,
                }}>{mode.detail}</p>
              </div>
            ))}
            {/* CTA tile to balance grid (3 cols × 2 rows) */}
            <div className="dl-reveal" style={{
              background: `linear-gradient(165deg, ${tokens.colors.deepPlum} 0%, ${tokens.semantic.primaryHover} 100%)`,
              border: '3px solid #FFFFFF',
              borderRadius: 32,
              padding: 32,
              boxShadow: tokens.shadow.glow,
              minHeight: 380,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#FFFFFF',
              transitionDelay: '0.4s',
            }}>
              <div style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3.5rem',
                marginBottom: 20,
                border: '3px solid rgba(255,255,255,0.4)',
              }}>
                <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
              </div>
              <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.75rem', color: '#FFFFFF', marginBottom: 12 }}>
                Try it now
              </h3>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1rem', color: '#FFFFFF', opacity: 0.95, lineHeight: 1.5, marginBottom: 24 }}>
                Pop a bubble in 10 seconds. No sign up.
              </p>
              <KidButton
                variant="success"
                size="lg"
                onClick={() => setTryFreeOpen(true)}
              >
                Start Playing
              </KidButton>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ WHY THIS MATTERS ═══════ */}
      <section style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container">
          <div className="dl-grid-2-3">
            <div className="dl-reveal">
              <h2 style={{
                fontFamily: tokens.fontFamily.display,
                fontWeight: 700,
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                lineHeight: 1.05,
                color: tokens.colors.charcoal,
                marginBottom: tokens.spacing.xl,
              }}>
                Movement strengthens <span style={{ color: tokens.colors.deepPlum }}>learning</span>.
              </h2>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.1rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85 }}>
                When kids move, their brains engage differently. Each mode targets one or more
                early-childhood skills, without ever feeling like work.
              </p>
              <p style={{ marginTop: tokens.spacing.xl, fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.6, fontStyle: 'italic' }}>
                Built by parents and a teacher. Aligned with EYFS Prime Areas of Learning.
              </p>
            </div>
            <div className="dl-grid-skills">
              {SKILLS.map((skill, i) => (
                <div
                  key={skill.title}
                  className="dl-reveal"
                  style={{
                    background: '#FFFFFF',
                    border: `2px solid ${skill.color}33`,
                    borderRadius: 24,
                    padding: 22,
                    boxShadow: tokens.shadow.panel,
                    transitionDelay: `${i * 0.06}s`,
                    display: 'flex',
                    gap: 18,
                    alignItems: 'flex-start',
                  }}
                >
                  <div className="dl-skill-plate" style={{ background: skill.bg, color: skill.color, flexShrink: 0 }}>
                    {skill.icon}
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: tokens.fontFamily.display,
                      fontWeight: 700,
                      fontSize: '1.15rem',
                      color: tokens.colors.charcoal,
                      marginBottom: 4,
                    }}>{skill.title}</h3>
                    <p style={{
                      fontFamily: tokens.fontFamily.body,
                      fontSize: '0.92rem',
                      color: tokens.colors.charcoal,
                      opacity: 0.75,
                      lineHeight: 1.5,
                    }}>{skill.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ FOR PARENTS ═══════ */}
      <section id="parents" style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-reveal dl-order-2 dl-order-1-lg">
            <div style={{
              background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)',
              border: '3px solid rgba(108, 63, 164, 0.14)',
              borderRadius: 36,
              padding: 24,
              boxShadow: tokens.shadow.float,
            }}>
              <div className="dl-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                {[
                  { label: 'No downloads', color: tokens.colors.coral, bg: '#FFE2E2', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
                  { label: 'No ads', color: tokens.colors.warmOrange, bg: '#FFE9CF', icon: <><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></> },
                  { label: 'No tracking', color: tokens.colors.deepPlum, bg: '#EAE0FB', icon: <><circle cx="11" cy="11" r="6" /><path d="M21 21l-4.35-4.35" /></> },
                  { label: 'No data stored', color: tokens.colors.meadowGreen, bg: '#DCF5C9', icon: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /></> },
                ].map((b) => (
                  <div key={b.label} className="dl-tick-tile" style={{ borderColor: `${b.color}33`, background: '#FFFFFF' }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      margin: '0 auto 12px',
                      borderRadius: 18,
                      background: b.bg,
                      color: b.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: tokens.shadow.inset,
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        {b.icon}
                      </svg>
                    </div>
                    <p style={{
                      fontFamily: tokens.fontFamily.display,
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: tokens.colors.charcoal,
                    }}>{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="dl-reveal dl-order-1 dl-order-2-lg">
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.xl,
            }}>
              Screen time you don't have to <span style={{ color: tokens.colors.deepPlum }}>feel guilty</span> about.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.15rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: tokens.spacing.xxl, maxWidth: 540 }}>
              Everything runs in the browser. The camera feed never leaves the device. No accounts.
              No tracking. No surprise fees. Just play.
            </p>
            <div className="dl-flex dl-flex-wrap dl-gap-4">
              <KidButton variant="primary" size="lg" onClick={() => setTryFreeOpen(true)}>
                Start in 10 Seconds
              </KidButton>
              <a
                href="/privacy"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: tokens.fontFamily.body,
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: tokens.colors.deepPlum,
                  textDecoration: 'none',
                  padding: '12px 4px',
                }}
              >
                Read our privacy promise →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ FOR SCHOOLS ═══════ */}
      <section id="schools" style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-reveal">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: tokens.colors.meadowGreen,
              color: tokens.colors.charcoal,
              border: '2px solid #FFFFFF',
              borderRadius: 9999,
              padding: '6px 14px',
              fontFamily: tokens.fontFamily.body,
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: tokens.shadow.float,
              marginBottom: tokens.spacing.lg,
            }}>
              For early-years educators
            </div>
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.xl,
            }}>
              Built for <span style={{ color: tokens.colors.deepPlum }}>classrooms</span>.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.15rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: tokens.spacing.lg }}>
              Runs on laptops, Chromebooks, and interactive whiteboards. No installs.
              No student accounts. No friction.
            </p>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: tokens.spacing.xxl }}>
              Free pilot pack: lesson plans, EYFS mapping, classroom poster, and a teacher-facing
              quick-start. Designed with reception teachers in mind.
            </p>
            <div className="dl-flex dl-flex-wrap dl-gap-4">
              <KidButton variant="primary" size="lg" onClick={openPilotModal}>
                Request Pilot Pack
              </KidButton>
              <a
                href="/schools"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: tokens.fontFamily.body,
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: tokens.colors.deepPlum,
                  textDecoration: 'none',
                  padding: '12px 4px',
                }}
              >
                Learn more →
              </a>
            </div>
          </div>
          <div className="dl-reveal">
            <div style={{
              position: 'relative',
              aspectRatio: '4/3',
              borderRadius: 36,
              background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)',
              border: '3px solid rgba(108, 63, 164, 0.14)',
              boxShadow: tokens.shadow.float,
              overflow: 'hidden',
              padding: 24,
            }}>
              {/* Classroom illustration */}
              <svg viewBox="0 0 480 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="classroom-board" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7ED957" />
                    <stop offset="1" stopColor="#92E36C" />
                  </linearGradient>
                </defs>
                {/* Floor */}
                <rect x="0" y="280" width="480" height="80" fill="#FFE9CF" />
                {/* Wall background */}
                <rect x="0" y="0" width="480" height="280" fill="#DEF5FF" />
                {/* Whiteboard */}
                <rect x="60" y="50" width="360" height="200" rx="14" fill="url(#classroom-board)" stroke="#3F4052" strokeOpacity="0.2" strokeWidth="3" />
                {/* Letter A on board */}
                <text x="180" y="180" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="120" fontWeight="700" fill="#FFFFFF">A</text>
                {/* Trace dots around A */}
                <circle cx="200" cy="100" r="6" fill="#FFD84D" />
                <circle cx="160" cy="160" r="6" fill="#FFD84D" />
                <circle cx="240" cy="160" r="6" fill="#FFD84D" />
                {/* Star and tick on board */}
                <path d="M340 100 l4 0 l2 -14 l2 14 l4 0 l-4 2 l-2 14 l-2 -14 z" fill="#FFD84D" />
                <path d="M310 220 l12 12 l24 -24" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Two kids */}
                <g transform="translate(120, 290)">
                  <circle cx="0" cy="-26" r="20" fill="#FFE7C9" />
                  <path d="M-20 -26 Q-12 -42 0 -42 Q12 -42 20 -26 Q12 -32 0 -32 Q-12 -32 -20 -26 z" fill="#FF6B6B" />
                  <circle cx="-7" cy="-26" r="2" fill="#3F4052" />
                  <circle cx="7" cy="-26" r="2" fill="#3F4052" />
                  <path d="M-5 -18 Q0 -14 5 -18" stroke="#3F4052" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <rect x="-22" y="-6" width="44" height="50" rx="10" fill="#55DDE0" />
                </g>
                <g transform="translate(360, 290)">
                  <circle cx="0" cy="-26" r="20" fill="#FFE7C9" />
                  <path d="M-20 -28 Q-14 -42 0 -42 Q14 -42 20 -28 Q14 -34 0 -34 Q-14 -34 -20 -28 z" fill="#3F4052" />
                  <circle cx="-7" cy="-26" r="2" fill="#3F4052" />
                  <circle cx="7" cy="-26" r="2" fill="#3F4052" />
                  <path d="M-5 -18 Q0 -14 5 -18" stroke="#3F4052" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <rect x="-22" y="-6" width="44" height="50" rx="10" fill="#FFD84D" />
                  {/* Raised arm */}
                  <path d="M-22 4 Q-44 -10 -42 -36" stroke="#FFE7C9" strokeWidth="10" strokeLinecap="round" fill="none" />
                  <circle cx="-42" cy="-36" r="8" fill="#FFE7C9" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ TESTIMONIALS ═══════ */}
      <section style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container">
          <h2 className="dl-reveal dl-text-center" style={{
            fontFamily: tokens.fontFamily.display,
            fontWeight: 700,
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            lineHeight: 1.05,
            color: tokens.colors.charcoal,
            marginBottom: tokens.spacing.xxxl,
          }}>
            Loved by families and <span style={{ color: tokens.colors.deepPlum }}>educators</span>.
          </h2>
          <div className="dl-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { quote: 'My son struggled to trace letters on paper. This made it click.', author: 'Parent', role: 'Age 4', tint: tokens.colors.coral },
              { quote: 'Best movement-based learning tool I have used in class.', author: 'Reception Teacher', role: 'London', tint: tokens.colors.aqua },
              { quote: 'No downloads saved us IT time. Kids were using it in minutes.', author: 'IT Coordinator', role: 'Primary School', tint: tokens.colors.meadowGreen },
            ].map((t, i) => (
              <div key={i} className="dl-reveal dl-quote-card" style={{ transitionDelay: `${i * 0.1}s` }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill={t.tint} opacity="0.85" style={{ marginBottom: 12 }}>
                  <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                </svg>
                <p style={{
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '1.05rem',
                  lineHeight: 1.5,
                  color: tokens.colors.charcoal,
                  marginBottom: 16,
                }}>"{t.quote}"</p>
                <p style={{
                  fontFamily: tokens.fontFamily.display,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: tokens.colors.deepPlum,
                  marginBottom: 2,
                }}>{t.author}</p>
                <p style={{
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '0.85rem',
                  color: tokens.colors.charcoal,
                  opacity: 0.65,
                }}>{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ TECH CREDIBILITY ═══════ */}
      <section style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-reveal">
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              lineHeight: 1.1,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.lg,
            }}>
              Built like a <span style={{ color: tokens.colors.deepPlum }}>serious</span> product.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.1rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: tokens.spacing.xxl }}>
              Performance matters. Kids notice lag instantly. We built every interaction to feel
              effortless and immediate.
            </p>
            <div className="dl-flex dl-flex-wrap dl-gap-3">
              {['60fps render loop', '30fps hand tracking', 'MediaPipe landmarks', 'One Euro filter', 'Zero frame storage', 'Local-only processing'].map((t) => (
                <span key={t} className="dl-tech-badge">{t}</span>
              ))}
            </div>
          </div>
          <div className="dl-reveal" style={{ position: 'relative' }}>
            <div style={{
              position: 'relative',
              aspectRatio: '1/1',
              borderRadius: 36,
              background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)',
              border: '3px solid rgba(108, 63, 164, 0.14)',
              boxShadow: tokens.shadow.float,
              padding: 28,
              overflow: 'hidden',
            }}>
              {/* Hand tracking landmark visualisation */}
              <svg viewBox="0 0 360 360" width="100%" height="100%">
                <defs>
                  <radialGradient id="hand-glow" cx="0.5" cy="0.5">
                    <stop offset="0" stopColor="#FFD84D" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#FFD84D" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="180" cy="180" r="160" fill="url(#hand-glow)" />
                {/* Hand silhouette */}
                <path d="M120 280 Q120 220 140 200 L140 110 Q140 100 152 100 Q164 100 164 110 L164 180 L168 180 L168 90 Q168 80 180 80 Q192 80 192 90 L192 180 L196 180 L196 100 Q196 90 208 90 Q220 90 220 100 L220 180 L224 180 L224 130 Q224 120 236 120 Q248 120 248 130 L248 200 Q258 220 258 280 Z"
                  fill="#FFE7C9" stroke="#6C3FA4" strokeWidth="2.5" strokeOpacity="0.5" />
                {/* 21 landmarks */}
                {[
                  [120, 280], [140, 240], [148, 200], [156, 170], [164, 140],
                  [168, 180], [172, 150], [176, 120], [180, 90],
                  [188, 180], [192, 140], [196, 110], [200, 80],
                  [212, 180], [216, 145], [220, 115], [224, 90],
                  [232, 200], [240, 175], [248, 155], [256, 135],
                ].map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="6" fill="#FFD84D" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx={x} cy={y} r="9" fill="none" stroke="#FFD84D" strokeOpacity="0.4" strokeWidth="2" />
                  </g>
                ))}
                {/* Connecting bones (thumb + index) */}
                <path d="M120 280 L140 240 L148 200 L156 170 L164 140" stroke="#FFD84D" strokeWidth="2.5" fill="none" />
                <path d="M120 280 L168 180 L172 150 L176 120 L180 90" stroke="#FFD84D" strokeWidth="2.5" fill="none" />
                <path d="M120 280 L188 180 L192 140 L196 110 L200 80" stroke="#FFD84D" strokeWidth="2.5" fill="none" />
                <path d="M120 280 L212 180 L216 145 L220 115 L224 90" stroke="#FFD84D" strokeWidth="2.5" fill="none" />
                <path d="M120 280 L232 200 L240 175 L248 155 L256 135" stroke="#FFD84D" strokeWidth="2.5" fill="none" />
                {/* Pinch dot */}
                <circle cx="170" cy="115" r="14" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="4" />
                <circle cx="170" cy="115" r="6" fill="#55DDE0" />
              </svg>
              <div style={{
                position: 'absolute',
                bottom: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#FFFFFF',
                border: `2px solid ${tokens.colors.aqua}`,
                borderRadius: 9999,
                padding: '8px 14px',
                fontFamily: tokens.fontFamily.body,
                fontWeight: 700,
                fontSize: '0.8rem',
                color: tokens.colors.charcoal,
                whiteSpace: 'nowrap',
                boxShadow: tokens.shadow.float,
              }}>
                21 landmarks · real-time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DIVIDER ═══════ */}
      <div className="dl-divider" />

      {/* ═══════ PRIVACY ═══════ */}
      <section style={{ position: 'relative', padding: '90px 0', zIndex: 1 }}>
        <div className="dl-container">
          <div className="dl-reveal dl-text-center" style={{ marginBottom: tokens.spacing.xxxl }}>
            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              lineHeight: 1.1,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.md,
            }}>
              Privacy by <span style={{ color: tokens.colors.deepPlum }}>design</span>.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.05rem', color: tokens.colors.charcoal, opacity: 0.7, maxWidth: 540, margin: '0 auto' }}>
              Four guarantees. Every session. No fine print.
            </p>
          </div>
          <div className="dl-grid-4">
            {[
              { label: 'Camera processed locally', icon: <><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M21 8v8l-4-3v-2l4-3z" /></>, color: tokens.colors.deepPlum },
              { label: 'No recordings ever', icon: <><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></>, color: tokens.colors.coral },
              { label: 'No child analytics', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>, color: tokens.colors.meadowGreen },
              { label: 'Adult gate for settings', icon: <><rect x="6" y="11" width="12" height="9" rx="2" /><path d="M9 11V8a3 3 0 016 0v3" /></>, color: tokens.colors.warmOrange },
            ].map((t, i) => (
              <div key={i} className="dl-reveal dl-tick-tile" style={{ transitionDelay: `${i * 0.06}s` }}>
                <div style={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 14px',
                  borderRadius: 22,
                  background: `${t.color}1A`,
                  color: t.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${t.color}33`,
                  boxShadow: tokens.shadow.inset,
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    {t.icon}
                  </svg>
                </div>
                <p style={{
                  fontFamily: tokens.fontFamily.display,
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: tokens.colors.charcoal,
                }}>{t.label}</p>
              </div>
            ))}
          </div>
          <p className="dl-reveal dl-text-center" style={{
            fontFamily: tokens.fontFamily.body,
            fontSize: '0.95rem',
            color: tokens.colors.charcoal,
            opacity: 0.65,
            marginTop: tokens.spacing.xxl,
          }}>
            <a
              href="/privacy"
              style={{
                color: tokens.colors.deepPlum,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Read our full privacy policy →
            </a>
          </p>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section id="launch" style={{ position: 'relative', padding: '120px 0 100px', zIndex: 1 }}>
        <div className="dl-container-narrow dl-text-center dl-reveal">
          <div style={{
            position: 'relative',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFCFF 100%)',
            border: '3px solid rgba(108, 63, 164, 0.18)',
            borderRadius: 48,
            padding: '60px 40px',
            boxShadow: tokens.shadow.modal,
            overflow: 'hidden',
          }}>
            {/* Decorative balloons */}
            <div style={{ position: 'absolute', top: 24, left: 24, fontSize: '2rem' }}>
              <svg viewBox="0 0 60 80" width="56" height="76">
                <ellipse cx="30" cy="30" rx="20" ry="26" fill="#FF6B6B" />
                <ellipse cx="22" cy="22" rx="6" ry="4" fill="#FFFFFF" opacity="0.5" />
                <path d="M30 56 L26 64 L30 60 L34 64 L30 56" fill="#FF6B6B" />
                <path d="M30 60 Q25 70 30 80" stroke="#3F4052" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div style={{ position: 'absolute', top: 30, right: 28 }}>
              <svg viewBox="0 0 60 80" width="46" height="64">
                <ellipse cx="30" cy="30" rx="20" ry="26" fill="#FFD84D" />
                <ellipse cx="22" cy="22" rx="6" ry="4" fill="#FFFFFF" opacity="0.5" />
                <path d="M30 56 L26 64 L30 60 L34 64 L30 56" fill="#FFD84D" />
                <path d="M30 60 Q35 70 30 80" stroke="#3F4052" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            <h2 style={{
              fontFamily: tokens.fontFamily.display,
              fontWeight: 700,
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              lineHeight: 1.05,
              color: tokens.colors.charcoal,
              marginBottom: tokens.spacing.xl,
            }}>
              Let them draw.<br />
              Let them move.<br />
              Let them <span style={{ color: tokens.colors.deepPlum }}>learn</span>.
            </h2>
            <p style={{
              fontFamily: tokens.fontFamily.body,
              fontSize: '1.15rem',
              color: tokens.colors.charcoal,
              opacity: 0.75,
              marginBottom: tokens.spacing.xxl,
              maxWidth: 480,
              margin: `0 auto ${tokens.spacing.xxl}`,
            }}>
              Free forever. Works in any modern browser with a webcam.
            </p>
            <div className="dl-flex dl-flex-wrap dl-items-center dl-justify-center dl-gap-4">
              <div className="dl-cta-glow">
                <KidButton variant="primary" size="xl" onClick={() => setTryFreeOpen(true)}>
                  Launch Draw in the Air
                </KidButton>
              </div>
            </div>
            <p style={{
              fontFamily: tokens.fontFamily.body,
              fontSize: '0.9rem',
              color: tokens.colors.charcoal,
              opacity: 0.6,
              marginTop: tokens.spacing.xl,
            }}>
              No sign up. No download. Just play.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{
        background: 'linear-gradient(180deg, #FFFAEB 0%, #FFF6E5 100%)',
        borderTop: '2px solid rgba(108, 63, 164, 0.12)',
        padding: '60px 0 32px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="dl-container">
          <div className="dl-grid-4" style={{ gap: 40, marginBottom: 40 }}>
            <div>
              <div className="dl-flex dl-items-center dl-gap-3" style={{ marginBottom: 16 }}>
                <img src="/logo.png" alt="Draw in the Air" style={{ height: 36 }} />
                <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.05rem', color: tokens.colors.deepPlum }}>
                  Draw in the Air
                </span>
              </div>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.7, lineHeight: 1.6 }}>
                Hands-free, screen-friendly learning for ages 3 to 7. Built with care.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>Product</h4>
              <div className="dl-flex-col" style={{ gap: 10 }}>
                <button onClick={() => setTryFreeOpen(true)} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75 }}>
                  Try Free
                </button>
                <a href="/play" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Play Now</a>
                <a href="/schools" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>School Pilot Pack</a>
                <a href="/faq" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>FAQ</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>Legal</h4>
              <div className="dl-flex-col" style={{ gap: 10 }}>
                <a href="/privacy" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Privacy Policy</a>
                <a href="/terms" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Terms of Use</a>
                <a href="/safeguarding" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Safeguarding</a>
                <a href="/accessibility" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Accessibility</a>
                <a href="/cookies" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Cookie Policy</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>Contact</h4>
              <div className="dl-flex-col" style={{ gap: 10 }}>
                <a href="mailto:partnership@drawintheair.com" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>partnership@drawintheair.com</a>
                <button onClick={openPilotModal} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', color: tokens.colors.charcoal, opacity: 0.75 }}>
                  Request a Demo
                </button>
              </div>
            </div>
          </div>
          <div style={{
            borderTop: '1.5px solid rgba(108, 63, 164, 0.12)',
            paddingTop: 20,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.8rem', color: tokens.colors.charcoal, opacity: 0.6 }}>
              © 2026 Draw in the Air. All rights reserved.
            </p>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.8rem', color: tokens.colors.deepPlum, fontWeight: 700 }}>
              Made with care for young learners.
            </p>
          </div>
        </div>
      </footer>

      {/* ═══════ FEEDBACK WIDGET ═══════ */}
      <button className="dl-feedback-btn" onClick={toggleFeedback} aria-label="Send Feedback">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>
      <div className={`dl-feedback-panel ${feedbackOpen ? 'dl-open' : ''}`}>
        {!feedbackSent ? (
          <div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.1rem', color: tokens.colors.charcoal, marginBottom: 4 }}>Send feedback</h3>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.65, marginBottom: 16 }}>
              We'd love to hear from you.
            </p>
            <textarea
              className="dl-form-input"
              rows={4}
              placeholder="What's on your mind?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              style={{ marginBottom: 12, resize: 'vertical' }}
            />
            <input
              type="email"
              className="dl-form-input"
              placeholder="Email (optional)"
              value={feedbackEmail}
              onChange={(e) => setFeedbackEmail(e.target.value)}
              style={{ marginBottom: 16 }}
            />
            <div className="dl-flex dl-items-center dl-justify-between">
              <KidButton variant="primary" size="md" onClick={submitFeedback} disabled={feedbackSending} style={{ minHeight: '48px', padding: '8px 22px', fontSize: '0.95rem' }}>
                {feedbackSending ? 'Sending...' : 'Send'}
              </KidButton>
              <button
                onClick={toggleFeedback}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.6, fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: 56,
              height: 56,
              margin: '0 auto 14px',
              borderRadius: '50%',
              background: tokens.colors.meadowGreen,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: tokens.shadow.glow,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.1rem', color: tokens.colors.charcoal, marginBottom: 4 }}>Thank you!</p>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.65 }}>Your feedback has been sent.</p>
          </div>
        )}
      </div>

      {/* ═══════ SCHOOL PILOT MODAL ═══════ */}
      <div className={`dl-modal-backdrop ${pilotOpen ? 'dl-open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closePilotModal(); }}>
        <div className="dl-modal-content">
          {!pilotSent ? (
            <div>
              <div className="dl-flex dl-items-center dl-justify-between" style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.4rem', color: tokens.colors.charcoal }}>Request school pilot pack</h2>
                <button
                  onClick={closePilotModal}
                  style={{ background: '#F4FAFF', border: '2px solid rgba(108,63,164,0.18)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: tokens.colors.deepPlum }}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: 22 }}>
                Tell us a bit about your school and we'll send a free pilot pack with lesson plans,
                EYFS mapping and a teacher quick-start.
              </p>
              {pilotSubmitError && (
                <div style={{
                  marginBottom: 16,
                  padding: 12,
                  borderRadius: 14,
                  background: 'rgba(255, 107, 107, 0.10)',
                  border: '2px solid rgba(255, 107, 107, 0.4)',
                  color: tokens.colors.coral,
                  fontFamily: tokens.fontFamily.body,
                  fontSize: '0.9rem',
                }}>
                  <strong>Error:</strong> {pilotSubmitError}
                </div>
              )}
              <div className="dl-flex-col" style={{ gap: 14 }}>
                <div>
                  <label className="dl-form-label">Your name *</label>
                  <input type="text" className="dl-form-input" placeholder="Jane Smith" value={pilotName} onChange={(e) => { setPilotName(e.target.value); setPilotErrors((p) => ({ ...p, name: false })); }} style={pilotErrors.name ? { borderColor: tokens.colors.coral } : undefined} />
                </div>
                <div>
                  <label className="dl-form-label">Email *</label>
                  <input type="email" className="dl-form-input" placeholder="jane@school.edu" value={pilotEmail} onChange={(e) => { setPilotEmail(e.target.value); setPilotErrors((p) => ({ ...p, email: false })); }} style={pilotErrors.email ? { borderColor: tokens.colors.coral } : undefined} />
                </div>
                <div>
                  <label className="dl-form-label">School name *</label>
                  <input type="text" className="dl-form-input" placeholder="Elm Park Primary" value={pilotSchool} onChange={(e) => { setPilotSchool(e.target.value); setPilotErrors((p) => ({ ...p, school: false })); }} style={pilotErrors.school ? { borderColor: tokens.colors.coral } : undefined} />
                </div>
                <div className="dl-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div>
                    <label className="dl-form-label">Your role</label>
                    <select className="dl-form-input" value={pilotRole} onChange={(e) => setPilotRole(e.target.value)}>
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
                    <label className="dl-form-label">Year group</label>
                    <select className="dl-form-input" value={pilotYear} onChange={(e) => setPilotYear(e.target.value)}>
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
                  <label className="dl-form-label">Primary device</label>
                  <select className="dl-form-input" value={pilotDevice} onChange={(e) => setPilotDevice(e.target.value)}>
                    <option value="">Select...</option>
                    <option>Laptops</option>
                    <option>Chromebooks</option>
                    <option>iPads / Tablets</option>
                    <option>Interactive Whiteboard</option>
                    <option>Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="dl-form-label">Notes</label>
                  <textarea className="dl-form-input" rows={3} placeholder="Anything else we should know?" value={pilotNotes} onChange={(e) => setPilotNotes(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <KidButton variant="primary" size="lg" onClick={submitPilot} disabled={pilotSending}>
                  {pilotSending ? 'Sending...' : 'Send Request'}
                </KidButton>
                <button
                  onClick={closePilotModal}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.6, fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 18px',
                borderRadius: '50%',
                background: tokens.colors.meadowGreen,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: tokens.shadow.glow,
                border: `4px solid #FFFFFF`,
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.4rem', color: tokens.colors.charcoal, marginBottom: 8 }}>Request sent!</h3>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: 20 }}>
                We'll be in touch within 24 hours with your pilot pack.
              </p>
              <KidButton variant="secondary" size="md" onClick={closePilotModal}>Close</KidButton>
            </div>
          )}
        </div>
      </div>

      <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
    </div>
  );
};
