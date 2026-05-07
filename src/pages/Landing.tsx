/**
 * Landing — Draw in the Air (Kid-UI bright sky redesign, reference-matched)
 *
 * Sections (top to bottom):
 *   1. Nav (logo + links + Try Free + Book a Demo)
 *   2. Hero — pill, headline, dual CTAs, trust strip + kid+star illustration
 *   3. Screens that drain / build — brain viz with skill rows
 *   4. Your hands become the tool — 4 horizontal step cards
 *   5. Five worlds. One pinch — 2x3 mode tile grid + CTA tile
 *   6. Movement strengthens learning + Screen-time guilt-free (dual card)
 *   7. Built for classrooms + Loved by families and educators (dual card)
 *   8. Built like a serious product — checkbox grid + hand-tracking viz
 *   9. Designed to work where you are — device platform row
 *   10. Final CTA — two kids waving + "Let them learn"
 *   11. Footer
 *
 * Critical CSS shipped via <style> inline so layout never depends on
 * external chunks loading correctly in production.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TryFreeModal } from '../components/TryFreeModal';
import { submitFormData } from '../lib/formSubmission';
import { KidButton } from '../components/kid-ui';
import { tokens } from '../styles/tokens';
import { logEvent } from '../lib/analytics';

/**
 * One canonical helper so every Try Free CTA (we have seven of them)
 * fires the same `cta_click` event with a `meta.source` discriminator.
 * Without this, A/B'ing CTA copy or position is impossible because
 * every click collapses into one indistinguishable funnel entry.
 */
type CtaSource =
  | 'nav'
  | 'mobile_menu'
  | 'hero'
  | 'activities'
  | 'mode_tile'
  | 'privacy_section'
  | 'final_banner';

function trackCtaClick(source: CtaSource, label: string): void {
    logEvent('cta_click', {
        component: 'Landing',
        meta: { source, label, target: 'try_free_modal' },
    });
}
import { LANDING_INLINE_CSS } from '../components/landing/landingInlineStyles';
import '../components/landing/landing-kid.css';

// ─── Asset paths ────────────────────────────────────────────────────────
// User-supplied 3D illustrations. Place files in /public/landing-images/.
const ASSETS = {
  heroKidStar: '/landing-images/hero-kid-star.png',
  brainSkills: '/landing-images/brain-skills.png',
  tracingB: '/landing-images/tracing-b.png',
  bubbles: '/landing-images/bubbles.png',
  sortShapes: '/landing-images/sort-shapes.png',
  wordSearch: '/landing-images/word-search-3d.png',
  kidShield: '/landing-images/kid-shield.png',
  classroomTeacher: '/landing-images/classroom-teacher.png',
  handLandmarks: '/landing-images/hand-landmarks-3d.png',
};

// ─── Image-with-SVG-fallback wrapper ────────────────────────────────────
// If a PNG file isn't shipped (404), the inline SVG we wrote earlier shows
// instead so the page never has a broken image icon.
interface AssetImgProps {
  src: string;
  alt: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}
const AssetImg: React.FC<AssetImgProps> = ({ src, alt, fallback, style }) => {
  const [errored, setErrored] = useState(false);
  if (errored && fallback) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      loading="lazy"
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', ...style }}
    />
  );
};

// ─── Hero illustration (SVG fallback) ───────────────────────────────────
const HeroIllustrationSvg = () => (
  <svg viewBox="0 0 480 400" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9FDFFF" />
        <stop offset="0.6" stopColor="#BEEBFF" />
        <stop offset="1" stopColor="#FFF6E5" />
      </linearGradient>
      <linearGradient id="hero-grass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#92E36C" />
        <stop offset="1" stopColor="#7ED957" />
      </linearGradient>
      <radialGradient id="hero-sun" cx="0.35" cy="0.35">
        <stop offset="0" stopColor="#FFF1B5" />
        <stop offset="0.5" stopColor="#FFD84D" />
        <stop offset="1" stopColor="#FFB14D" />
      </radialGradient>
      <radialGradient id="hero-star-glow" cx="0.5" cy="0.5">
        <stop offset="0" stopColor="#FFF8D4" stopOpacity="0.95" />
        <stop offset="0.5" stopColor="#FFD84D" stopOpacity="0.5" />
        <stop offset="1" stopColor="#FFD84D" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hero-shirt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FF8B4D" />
        <stop offset="1" stopColor="#FF6B2A" />
      </linearGradient>
      <linearGradient id="hero-jeans" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5BA0E8" />
        <stop offset="1" stopColor="#3D7DC5" />
      </linearGradient>
      <linearGradient id="hero-skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE2BD" />
        <stop offset="1" stopColor="#F4C58E" />
      </linearGradient>
    </defs>

    {/* Sky */}
    <rect width="480" height="400" fill="url(#hero-sky)" rx="0" />

    {/* Sun with smile */}
    <circle cx="395" cy="80" r="40" fill="url(#hero-sun)" />
    {/* Sun rays */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      const x1 = 395 + Math.cos(r) * 46;
      const y1 = 80 + Math.sin(r) * 46;
      const x2 = 395 + Math.cos(r) * 60;
      const y2 = 80 + Math.sin(r) * 60;
      return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD84D" strokeWidth="3" strokeLinecap="round" opacity="0.85" />;
    })}
    <circle cx="385" cy="73" r="3" fill="#3F4052" />
    <circle cx="403" cy="73" r="3" fill="#3F4052" />
    <path d="M385 86 Q394 92 403 86" stroke="#3F4052" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <ellipse cx="380" cy="88" rx="4" ry="2.5" fill="#FF9DB5" opacity="0.55" />
    <ellipse cx="408" cy="88" rx="4" ry="2.5" fill="#FF9DB5" opacity="0.55" />

    {/* Clouds */}
    <g opacity="0.95">
      <ellipse cx="100" cy="70" rx="38" ry="12" fill="#FFFFFF" />
      <ellipse cx="120" cy="64" rx="22" ry="10" fill="#FFFFFF" />
      <ellipse cx="80" cy="68" rx="18" ry="9" fill="#FFFFFF" />
    </g>
    <g opacity="0.85">
      <ellipse cx="220" cy="50" rx="30" ry="9" fill="#FFFFFF" />
      <ellipse cx="234" cy="45" rx="18" ry="8" fill="#FFFFFF" />
    </g>

    {/* Star with sparkle ring */}
    <circle cx="318" cy="118" r="48" fill="url(#hero-star-glow)" />
    <g transform="translate(318,118)">
      {/* Sparkle ring */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const r = (a * Math.PI) / 180;
        return (
          <g key={i} transform={`rotate(${a})`}>
            <circle cx="32" cy="0" r="2.5" fill="#FFFFFF" />
            <path d={`M${28 + Math.sin(r) * 0} 0 l3 0 l1 -4 l1 4 l3 0 l-3 1 l-1 4 l-1 -4 z`} fill="#FFD84D" />
          </g>
        );
      })}
      {/* Star shape */}
      <path d="M0 -22 L6 -7 L22 -7 L9 3 L14 18 L0 9 L-14 18 L-9 3 L-22 -7 L-6 -7 Z"
        fill="#FFD84D" stroke="#3F4052" strokeWidth="2" strokeLinejoin="round" />
      {/* Star face */}
      <circle cx="-4" cy="-2" r="1.5" fill="#3F4052" />
      <circle cx="4" cy="-2" r="1.5" fill="#3F4052" />
      <path d="M-4 4 Q0 7 4 4" stroke="#3F4052" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </g>

    {/* Butterfly */}
    <g transform="translate(420,200) rotate(-15)">
      <ellipse cx="-7" cy="-2" rx="9" ry="11" fill="#FF8FB5" />
      <ellipse cx="-7" cy="6" rx="6" ry="7" fill="#A8D8FF" />
      <ellipse cx="7" cy="-2" rx="9" ry="11" fill="#A8D8FF" />
      <ellipse cx="7" cy="6" rx="6" ry="7" fill="#FF8FB5" />
      <ellipse cx="0" cy="0" rx="2" ry="9" fill="#3F4052" />
      <circle cx="-2" cy="-7" r="1.5" fill="#3F4052" />
      <circle cx="2" cy="-7" r="1.5" fill="#3F4052" />
    </g>

    {/* Hills/grass */}
    <path d="M0 320 Q120 280 240 300 T480 290 L480 400 L0 400 Z" fill="#B5F15C" opacity="0.65" />
    <path d="M0 350 Q160 320 320 335 T480 330 L480 400 L0 400 Z" fill="url(#hero-grass)" />
    {/* Flowers */}
    {[40, 90, 200, 350, 430].map((x, i) => (
      <g key={x} transform={`translate(${x}, ${355 + i * 4})`}>
        <circle cx="0" cy="-4" r="3" fill={['#FF6B6B', '#FFD84D', '#FF8FB5', '#A8D8FF', '#FFD84D'][i]} />
        <circle cx="-3" cy="-1" r="3" fill={['#FF6B6B', '#FFD84D', '#FF8FB5', '#A8D8FF', '#FFD84D'][i]} />
        <circle cx="3" cy="-1" r="3" fill={['#FF6B6B', '#FFD84D', '#FF8FB5', '#A8D8FF', '#FFD84D'][i]} />
        <circle cx="0" cy="2" r="3" fill={['#FF6B6B', '#FFD84D', '#FF8FB5', '#A8D8FF', '#FFD84D'][i]} />
        <circle cx="0" cy="-1" r="2" fill="#FFF1B5" />
      </g>
    ))}

    {/* Kid character */}
    <g transform="translate(190, 220)">
      {/* Legs */}
      <rect x="-22" y="60" width="18" height="60" rx="9" fill="url(#hero-jeans)" />
      <rect x="4" y="60" width="18" height="60" rx="9" fill="url(#hero-jeans)" />
      {/* Shoes */}
      <ellipse cx="-13" cy="125" rx="13" ry="6" fill="#FFFFFF" stroke="#3F4052" strokeWidth="1.5" />
      <ellipse cx="13" cy="125" rx="13" ry="6" fill="#FFFFFF" stroke="#3F4052" strokeWidth="1.5" />
      {/* Body / shirt */}
      <path d="M-32 0 L-32 65 Q-32 72 -25 72 L25 72 Q32 72 32 65 L32 0 Q32 -10 22 -10 L-22 -10 Q-32 -10 -32 0 Z"
        fill="url(#hero-shirt)" />
      <path d="M-32 0 Q0 8 32 0" stroke="#FF5018" strokeWidth="0.5" fill="none" opacity="0.4" />
      {/* Left arm down */}
      <path d="M-30 5 Q-44 30 -36 60" stroke="url(#hero-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
      <circle cx="-37" cy="62" r="9" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.2" />
      {/* Right arm raised toward star */}
      <path d="M30 5 Q56 -28 90 -82" stroke="url(#hero-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* Right hand reaching */}
      <g transform="translate(95, -90)">
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.28" strokeWidth="1.5" />
        {/* Fingers — pointing up-right */}
        <rect x="-3" y="-13" width="3.5" height="9" rx="2" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
        <rect x="2" y="-15" width="3.5" height="11" rx="2" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
        <rect x="7" y="-13" width="3.5" height="9" rx="2" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
      </g>
      {/* Head */}
      <circle cx="0" cy="-32" r="28" fill="url(#hero-skin)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
      {/* Hair — wavy brown */}
      <path d="M-26 -38 Q-30 -56 -14 -60 Q-4 -68 8 -64 Q22 -62 26 -50 Q28 -42 26 -36 Q18 -44 8 -42 Q-2 -46 -10 -42 Q-20 -42 -26 -38 Z"
        fill="#7A4A2E" />
      <path d="M-22 -42 Q-18 -52 -8 -52" stroke="#5E3A22" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Eyes */}
      <ellipse cx="-9" cy="-32" rx="3" ry="3.5" fill="#3F4052" />
      <ellipse cx="9" cy="-32" rx="3" ry="3.5" fill="#3F4052" />
      <circle cx="-7.5" cy="-33" r="1" fill="#FFFFFF" />
      <circle cx="10.5" cy="-33" r="1" fill="#FFFFFF" />
      {/* Cheeks */}
      <ellipse cx="-13" cy="-22" rx="5" ry="3" fill="#FF9DB5" opacity="0.6" />
      <ellipse cx="13" cy="-22" rx="5" ry="3" fill="#FF9DB5" opacity="0.6" />
      {/* Smile */}
      <path d="M-7 -22 Q0 -15 7 -22" stroke="#3F4052" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Eyebrows */}
      <path d="M-13 -40 Q-9 -42 -5 -40" stroke="#5E3A22" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M5 -40 Q9 -42 13 -40" stroke="#5E3A22" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  </svg>
);

// Wrapper components that prefer the 3D asset and fall back to inline SVG
const HeroIllustration = () => (
  <AssetImg src={ASSETS.heroKidStar} alt="Child reaching for a glowing learning star in a sunny meadow" fallback={<HeroIllustrationSvg />} style={{ objectFit: 'cover' }} />
);
const BrainViz = () => (
  <AssetImg src={ASSETS.brainSkills} alt="Colorful 3D brain with focus, memory, confidence and coordination orbs" fallback={<BrainVizSvg />} />
);
const FreePaintTile = () => <FreePaintTileSvg />;
const TracingTile = () => (
  <AssetImg src={ASSETS.tracingB} alt="Letter B with dotted tracing path and pen" fallback={<TracingTileSvg />} />
);
const BubblePopTile = () => (
  <AssetImg src={ASSETS.bubbles} alt="Glossy colorful bubbles" fallback={<BubblePopTileSvg />} />
);
const SortPlaceTile = () => (
  <AssetImg src={ASSETS.sortShapes} alt="Colorful shapes being sorted into bins" fallback={<SortPlaceTileSvg />} />
);
const WordSearchTile = () => (
  <AssetImg src={ASSETS.wordSearch} alt="Word search grid highlighting CAT, DOG, BUS" fallback={<WordSearchTileSvg />} />
);
const ClassroomScene = () => (
  <AssetImg src={ASSETS.classroomTeacher} alt="Teacher pointing at letter A on a chalkboard with three students raising their hands" fallback={<ClassroomSceneSvg />} />
);
const HandTrackingViz = () => (
  <AssetImg src={ASSETS.handLandmarks} alt="3D hand with 21 colored landmark points and a security shield" fallback={<HandTrackingVizSvg />} />
);
const KidShield = () => (
  <AssetImg src={ASSETS.kidShield} alt="Smiling child holding a blue safety shield with a checkmark" />
);

// ─── Brain visualization (SVG fallback) ─────────────────────────────────
const BrainVizSvg = () => (
  <svg viewBox="0 0 320 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="brain-glow" cx="0.5" cy="0.5">
        <stop offset="0" stopColor="#FFB5C5" stopOpacity="0.4" />
        <stop offset="1" stopColor="#FFB5C5" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="brain-fill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFC4D2" />
        <stop offset="0.5" stopColor="#FF8FA8" />
        <stop offset="1" stopColor="#FF6B85" />
      </linearGradient>
      <linearGradient id="brain-fill-2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFD4DD" />
        <stop offset="1" stopColor="#FFA0B5" />
      </linearGradient>
    </defs>
    {/* Outer glow */}
    <circle cx="160" cy="160" r="130" fill="url(#brain-glow)" />
    {/* Sparkle ring */}
    <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(108, 63, 164, 0.18)" strokeWidth="2" strokeDasharray="3 6" />
    {/* Orbiting orbs at 4 cardinal positions */}
    {[
      { angle: 0, color: '#A8D8FF' },     // right - blue
      { angle: 90, color: '#FFD84D' },    // bottom - yellow
      { angle: 180, color: '#FFB5C5' },   // left - pink
      { angle: 270, color: '#7ED957' },   // top - green
    ].map((orb, i) => {
      const r = (orb.angle * Math.PI) / 180;
      const cx = 160 + Math.cos(r) * 120;
      const cy = 160 + Math.sin(r) * 120;
      return (
        <g key={i}>
          <circle cx={cx} cy={cy} r="14" fill="#FFFFFF" stroke={orb.color} strokeWidth="2.5" />
          <circle cx={cx} cy={cy} r="8" fill={orb.color} opacity="0.6" />
        </g>
      );
    })}
    {/* Brain body — abstracted with two halves */}
    <g transform="translate(160, 160)">
      {/* Right hemisphere */}
      <path d="M0 -56 Q44 -56 56 -16 Q60 16 44 40 Q56 52 36 60 Q20 64 4 56 L4 -52 Z"
        fill="url(#brain-fill)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="2" />
      {/* Left hemisphere */}
      <path d="M0 -56 Q-44 -56 -56 -16 Q-60 16 -44 40 Q-56 52 -36 60 Q-20 64 -4 56 L-4 -52 Z"
        fill="url(#brain-fill-2)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="2" />
      {/* Curls/folds — right */}
      <path d="M16 -44 Q28 -36 30 -20" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M14 -22 Q26 -18 28 -4" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M10 0 Q24 4 28 22" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M8 26 Q22 30 24 44" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      {/* Curls — left */}
      <path d="M-16 -44 Q-28 -36 -30 -20" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M-14 -22 Q-26 -18 -28 -4" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M-10 0 Q-24 4 -28 22" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M-8 26 Q-22 30 -24 44" stroke="#FF6B85" strokeWidth="2" fill="none" opacity="0.7" />
      {/* Highlight */}
      <ellipse cx="-22" cy="-30" rx="10" ry="6" fill="#FFFFFF" opacity="0.45" />
    </g>
  </svg>
);

// ─── Mode tile illustrations (SVG fallbacks) ────────────────────────────
const FreePaintTileSvg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fp-pink" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FF8FB5" /><stop offset="1" stopColor="#FF6B85" />
      </linearGradient>
      <linearGradient id="fp-yellow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FFE36B" /><stop offset="1" stopColor="#FFB14D" />
      </linearGradient>
      <linearGradient id="fp-aqua" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7BE5E8" /><stop offset="1" stopColor="#55DDE0" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="#FFE2EC" opacity="0.5" />
    <path d="M16 76 Q42 48 64 70 T100 60" stroke="url(#fp-pink)" strokeWidth="11" strokeLinecap="round" fill="none" />
    <path d="M22 90 Q44 70 66 84 T100 78" stroke="url(#fp-yellow)" strokeWidth="9" strokeLinecap="round" fill="none" />
    <path d="M28 56 Q50 38 70 48" stroke="url(#fp-aqua)" strokeWidth="8" strokeLinecap="round" fill="none" />
    <circle cx="100" cy="60" r="9" fill="#FFFFFF" stroke="#FF6B85" strokeWidth="3" />
    <circle cx="100" cy="60" r="3.5" fill="#FF6B85" />
  </svg>
);

const TracingTileSvg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#D6F0FF" opacity="0.5" />
    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" fontFamily="Fredoka, sans-serif" fontSize="68" fontWeight="700" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="3">B</text>
    <circle cx="74" cy="78" r="10" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="3" />
    <circle cx="74" cy="78" r="4" fill="#55DDE0" />
    <path d="M92 30 l3 0 l1 -8 l1 8 l3 0 l-3 1 l-1 7 l-1 -7 z" fill="#FFD84D" />
  </svg>
);

const BubblePopTileSvg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bp-1" cx="0.35" cy="0.35"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#A8D8FF" /></radialGradient>
      <radialGradient id="bp-2" cx="0.35" cy="0.35"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#FFD84D" /></radialGradient>
      <radialGradient id="bp-3" cx="0.35" cy="0.35"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#FF6B85" /></radialGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="#E2F0FF" opacity="0.5" />
    <circle cx="40" cy="46" r="20" fill="url(#bp-1)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="35" cy="40" rx="6" ry="3.5" fill="#FFFFFF" opacity="0.7" />
    <circle cx="78" cy="42" r="14" fill="url(#bp-2)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="74" cy="38" rx="4" ry="2.5" fill="#FFFFFF" opacity="0.7" />
    <circle cx="68" cy="80" r="22" fill="url(#bp-3)" stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
    <ellipse cx="62" cy="74" rx="7" ry="4" fill="#FFFFFF" opacity="0.7" />
  </svg>
);

const SortPlaceTileSvg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#DCF5C9" opacity="0.5" />
    <rect x="14" y="64" width="40" height="38" rx="8" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="2.5" />
    <rect x="66" y="64" width="40" height="38" rx="8" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="2.5" />
    <circle cx="34" cy="83" r="7" fill="#FF6B85" />
    <rect x="80" y="76" width="12" height="12" rx="2" fill="#55DDE0" />
    <circle cx="38" cy="36" r="11" fill="#FF6B85" />
    <ellipse cx="35" cy="32" rx="3" ry="2" fill="#FFFFFF" opacity="0.7" />
    <rect x="68" y="26" width="22" height="22" rx="4" fill="#55DDE0" />
    <rect x="71" y="30" width="6" height="3" rx="1" fill="#FFFFFF" opacity="0.7" />
    <path d="M45 50 L40 60" stroke="#7ED957" strokeWidth="3" strokeLinecap="round" />
    <path d="M76 50 L80 60" stroke="#7ED957" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const WordSearchTileSvg = () => (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="56" fill="#FFF1B5" opacity="0.6" />
    <rect x="22" y="22" width="76" height="76" rx="12" fill="#FFFFFF" stroke="#6C3FA4" strokeOpacity="0.18" strokeWidth="2" />
    {['C', 'A', 'T', 'B', 'D', 'O', 'G', 'R', 'S', 'U', 'N', 'Q', 'M', 'A', 'P', 'X'].map((ch, i) => {
      const col = i % 4; const row = Math.floor(i / 4);
      return (
        <text key={i} x={34 + col * 17} y={42 + row * 17} textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="13" fontWeight="700" fill="#3F4052">{ch}</text>
      );
    })}
    <rect x="28" y="33" width="44" height="14" rx="7" fill="#FFD84D" opacity="0.55" />
  </svg>
);

// ─── Classroom illustration (SVG fallback) ──────────────────────────────
const ClassroomSceneSvg = () => (
  <svg viewBox="0 0 480 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cls-board" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7ED957" /><stop offset="1" stopColor="#5FB840" />
      </linearGradient>
      <linearGradient id="cls-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE9CF" /><stop offset="1" stopColor="#FFCFA0" />
      </linearGradient>
      <linearGradient id="cls-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFAEB" /><stop offset="1" stopColor="#FFF1D6" />
      </linearGradient>
      <linearGradient id="t-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE2BD" /><stop offset="1" stopColor="#F4C58E" /></linearGradient>
    </defs>
    <rect width="480" height="280" fill="url(#cls-wall)" />
    <rect y="280" width="480" height="80" fill="url(#cls-floor)" />
    {/* Bookshelf */}
    <rect x="20" y="180" width="60" height="100" rx="4" fill="#A77A4F" />
    {[185, 218, 251].map((y, i) => (
      <g key={i}>
        <rect x="24" y={y} width="52" height="28" fill="#8C6238" />
        <rect x="28" y={y + 4} width="6" height="20" fill={['#FF6B85', '#FFD84D', '#55DDE0'][i]} />
        <rect x="36" y={y + 4} width="6" height="20" fill={['#7ED957', '#FF6B85', '#FFD84D'][i]} />
        <rect x="44" y={y + 4} width="6" height="20" fill={['#A8D8FF', '#7ED957', '#FF8FB5'][i]} />
        <rect x="52" y={y + 4} width="6" height="20" fill={['#FFD84D', '#A8D8FF', '#7ED957'][i]} />
        <rect x="60" y={y + 4} width="6" height="20" fill={['#FF8FB5', '#FF6B85', '#A8D8FF'][i]} />
      </g>
    ))}
    {/* Chalkboard */}
    <rect x="170" y="40" width="240" height="160" rx="14" fill="url(#cls-board)" stroke="#3F4052" strokeOpacity="0.2" strokeWidth="3" />
    <rect x="170" y="40" width="240" height="160" rx="14" fill="none" stroke="#5FB840" strokeWidth="6" strokeOpacity="0.5" />
    {/* Letter A on chalkboard */}
    <text x="290" y="155" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="120" fontWeight="700" fill="#FFFFFF">A</text>
    {/* Sparkles around the A */}
    <path d="M222 60 l3 0 l1 -8 l1 8 l3 0 l-3 1 l-1 8 l-1 -8 z" fill="#FFD84D" />
    <path d="M380 70 l3 0 l1 -8 l1 8 l3 0 l-3 1 l-1 8 l-1 -8 z" fill="#FFD84D" />
    <circle cx="370" cy="170" r="3" fill="#FFD84D" />

    {/* Teacher (right side) */}
    <g transform="translate(110, 230)">
      <ellipse cx="0" cy="60" rx="32" ry="6" fill="#3F4052" opacity="0.12" />
      <rect x="-22" y="0" width="44" height="56" rx="14" fill="#A8D8FF" />
      {/* Apron */}
      <path d="M-18 16 L18 16 L14 56 L-14 56 Z" fill="#FFFFFF" opacity="0.5" />
      <circle cx="0" cy="-22" r="22" fill="url(#t-skin)" />
      {/* Hair — short brown */}
      <path d="M-22 -22 Q-22 -42 0 -44 Q22 -42 22 -22 Q14 -32 0 -32 Q-14 -32 -22 -22 Z" fill="#7A4A2E" />
      {/* Glasses */}
      <circle cx="-7" cy="-22" r="5" fill="none" stroke="#3F4052" strokeWidth="1.5" />
      <circle cx="7" cy="-22" r="5" fill="none" stroke="#3F4052" strokeWidth="1.5" />
      <line x1="-2" y1="-22" x2="2" y2="-22" stroke="#3F4052" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="-7" cy="-22" r="1.5" fill="#3F4052" />
      <circle cx="7" cy="-22" r="1.5" fill="#3F4052" />
      <path d="M-4 -14 Q0 -10 4 -14" stroke="#3F4052" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <ellipse cx="-12" cy="-16" rx="3" ry="2" fill="#FF9DB5" opacity="0.65" />
      <ellipse cx="12" cy="-16" rx="3" ry="2" fill="#FF9DB5" opacity="0.65" />
      {/* Pointing arm */}
      <path d="M22 8 Q42 -10 50 -42" stroke="url(#t-skin)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="-42" r="7" fill="url(#t-skin)" stroke="#3F4052" strokeOpacity="0.2" strokeWidth="1" />
    </g>

    {/* Three kids (in front of board) */}
    {[
      { x: 220, shirt: '#7ED957', hair: '#3F4052' },
      { x: 280, shirt: '#FF8B4D', hair: '#7A4A2E' },
      { x: 340, shirt: '#5BA0E8', hair: '#3F4052' },
    ].map((kid) => (
      <g key={kid.x} transform={`translate(${kid.x}, 290)`}>
        <ellipse cx="0" cy="40" rx="22" ry="4" fill="#3F4052" opacity="0.12" />
        <rect x="-16" y="-2" width="32" height="40" rx="10" fill={kid.shirt} />
        <circle cx="0" cy="-18" r="16" fill="url(#t-skin)" />
        <path d="M-16 -18 Q-16 -32 0 -34 Q16 -32 16 -18 Q10 -24 0 -24 Q-10 -24 -16 -18 Z" fill={kid.hair} />
        <circle cx="-5" cy="-18" r="1.4" fill="#3F4052" />
        <circle cx="5" cy="-18" r="1.4" fill="#3F4052" />
        <ellipse cx="-9" cy="-13" rx="2.4" ry="1.5" fill="#FF9DB5" opacity="0.6" />
        <ellipse cx="9" cy="-13" rx="2.4" ry="1.5" fill="#FF9DB5" opacity="0.6" />
      </g>
    ))}
  </svg>
);

// ─── Hand-tracking visualization (SVG fallback) ─────────────────────────
const HandTrackingVizSvg = () => (
  <svg viewBox="0 0 360 360" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hand-glow-2" cx="0.5" cy="0.5">
        <stop offset="0" stopColor="#FFD84D" stopOpacity="0.4" />
        <stop offset="1" stopColor="#FFD84D" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hand-skin-2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE2BD" /><stop offset="1" stopColor="#F4C58E" />
      </linearGradient>
    </defs>
    <circle cx="180" cy="180" r="160" fill="url(#hand-glow-2)" />
    {/* Hand silhouette */}
    <path d="M120 280 Q120 220 140 200 L140 110 Q140 100 152 100 Q164 100 164 110 L164 180 L168 180 L168 90 Q168 80 180 80 Q192 80 192 90 L192 180 L196 180 L196 100 Q196 90 208 90 Q220 90 220 100 L220 180 L224 180 L224 130 Q224 120 236 120 Q248 120 248 130 L248 200 Q258 220 258 280 Z"
      fill="url(#hand-skin-2)" stroke="#6C3FA4" strokeWidth="2.5" strokeOpacity="0.5" />
    {/* Bone connections */}
    {[
      'M120 280 L140 240 L148 200 L156 170 L164 140',
      'M120 280 L168 180 L172 150 L176 120 L180 90',
      'M120 280 L188 180 L192 140 L196 110 L200 80',
      'M120 280 L212 180 L216 145 L220 115 L224 90',
      'M120 280 L232 200 L240 175 L248 155 L256 135',
    ].map((d, i) => (
      <path key={i} d={d} stroke="#FF8B4D" strokeWidth="2.5" fill="none" opacity="0.85" />
    ))}
    {/* 21 landmarks */}
    {[
      [120, 280], [140, 240], [148, 200], [156, 170], [164, 140],
      [168, 180], [172, 150], [176, 120], [180, 90],
      [188, 180], [192, 140], [196, 110], [200, 80],
      [212, 180], [216, 145], [220, 115], [224, 90],
      [232, 200], [240, 175], [248, 155], [256, 135],
    ].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="9" fill="none" stroke="#FFD84D" strokeOpacity="0.45" strokeWidth="2" />
        <circle cx={x} cy={y} r="6" fill="#FFD84D" stroke="#FFFFFF" strokeWidth="2" />
      </g>
    ))}
    {/* Pinch dot — between thumb and index */}
    <circle cx="170" cy="115" r="14" fill="#FFFFFF" stroke="#55DDE0" strokeWidth="4" />
    <circle cx="170" cy="115" r="6" fill="#55DDE0" />
  </svg>
);

// ─── Two waving kids for final CTA ──────────────────────────────────────
const KidWaving = ({ side }: { side: 'left' | 'right' }) => {
  const flipX = side === 'right' ? -1 : 1;
  const shirtTop = side === 'left' ? '#FFB07A' : '#B589DB';
  const shirtBottom = side === 'left' ? '#FF6B2A' : '#7E4FB8';
  const hairTop = side === 'left' ? '#9B6442' : '#5B5C68';
  const hairBottom = side === 'left' ? '#7A4A2E' : '#3F4052';
  const id = `kw-${side}`;
  return (
    <svg viewBox="0 0 220 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE7C9" /><stop offset="1" stopColor="#F4C58E" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shirtTop} /><stop offset="1" stopColor={shirtBottom} />
        </linearGradient>
        <linearGradient id={`${id}-hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairTop} /><stop offset="1" stopColor={hairBottom} />
        </linearGradient>
        <linearGradient id={`${id}-jeans`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BA0E8" /><stop offset="1" stopColor="#3D7DC5" />
        </linearGradient>
        <radialGradient id={`${id}-cheek`} cx="0.5" cy="0.5">
          <stop offset="0" stopColor="#FF9DB5" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FF9DB5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(110, 145) scale(${flipX} 1)`}>
        {/* Soft ground shadow */}
        <ellipse cx="0" cy="124" rx="40" ry="6" fill="#000000" opacity="0.18" />
        {/* Legs */}
        <rect x="-22" y="62" width="18" height="62" rx="9" fill={`url(#${id}-jeans)`} />
        <rect x="4" y="62" width="18" height="62" rx="9" fill={`url(#${id}-jeans)`} />
        {/* Knees */}
        <ellipse cx="-13" cy="92" rx="3" ry="2" fill="#FFFFFF" opacity="0.18" />
        <ellipse cx="13" cy="92" rx="3" ry="2" fill="#FFFFFF" opacity="0.18" />
        {/* Shoes */}
        <ellipse cx="-13" cy="126" rx="13" ry="6" fill="#FFFFFF" stroke="#3F4052" strokeWidth="1.6" />
        <ellipse cx="13" cy="126" rx="13" ry="6" fill="#FFFFFF" stroke="#3F4052" strokeWidth="1.6" />
        <path d="M-20 126 L-6 126" stroke="#3F4052" strokeWidth="1" opacity="0.4" />
        <path d="M6 126 L20 126" stroke="#3F4052" strokeWidth="1" opacity="0.4" />
        {/* Body / shirt with rounded shoulders */}
        <path d="M-30 -2 Q-30 -10 -22 -10 L22 -10 Q30 -10 30 -2 L30 60 Q30 68 22 68 L-22 68 Q-30 68 -30 60 Z"
          fill={`url(#${id}-shirt)`} />
        {/* Shirt highlight */}
        <path d="M-26 4 Q-26 -6 -16 -6 L16 -6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.22" fill="none" />
        {/* Left arm down */}
        <path d="M-28 8 Q-38 30 -32 56" stroke={`url(#${id}-skin)`} strokeWidth="13" strokeLinecap="round" fill="none" />
        <circle cx="-33" cy="58" r="9" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.25" strokeWidth="1.2" />
        <ellipse cx="-31" cy="56" rx="3" ry="2" fill="#FFFFFF" opacity="0.4" />
        {/* Right arm raised waving with bend at elbow */}
        <path d="M28 8 Q42 -10 46 -38 Q50 -64 60 -78" stroke={`url(#${id}-skin)`} strokeWidth="13" strokeLinecap="round" fill="none" />
        {/* Right hand waving */}
        <g transform="translate(60, -78)">
          <circle cx="0" cy="0" r="10" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.22" strokeWidth="1.4" />
          {/* Fingers */}
          <rect x="-4" y="-14" width="3.5" height="11" rx="1.8" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
          <rect x="0" y="-16" width="3.5" height="13" rx="1.8" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
          <rect x="4" y="-15" width="3.5" height="12" rx="1.8" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
          <rect x="8" y="-13" width="3.5" height="10" rx="1.8" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1" />
          {/* Highlight */}
          <ellipse cx="-2" cy="-2" rx="3" ry="2" fill="#FFFFFF" opacity="0.4" />
        </g>
        {/* Neck */}
        <rect x="-6" y="-12" width="12" height="6" rx="3" fill={`url(#${id}-skin)`} />
        {/* Head with subtle 3D shading */}
        <circle cx="0" cy="-30" r="26" fill={`url(#${id}-skin)`} stroke="#3F4052" strokeOpacity="0.18" strokeWidth="1.5" />
        {/* Hair — fluffier, more defined */}
        <path d="M-26 -32 Q-30 -54 -16 -58 Q-4 -64 8 -62 Q22 -60 26 -42 Q28 -34 24 -30 Q16 -42 4 -42 Q-6 -44 -14 -42 Q-22 -42 -26 -32 Z"
          fill={`url(#${id}-hair)`} />
        <path d="M-22 -38 Q-18 -50 -8 -52" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.25" fill="none" />
        {/* Cheeks (radial soft) */}
        <circle cx="-13" cy="-18" r="5" fill={`url(#${id}-cheek)`} />
        <circle cx="13" cy="-18" r="5" fill={`url(#${id}-cheek)`} />
        {/* Eyes — bigger, with sparkles */}
        <ellipse cx="-9" cy="-30" rx="3.2" ry="3.8" fill="#3F4052" />
        <ellipse cx="9" cy="-30" rx="3.2" ry="3.8" fill="#3F4052" />
        <circle cx="-7.5" cy="-31.5" r="1.2" fill="#FFFFFF" />
        <circle cx="10.5" cy="-31.5" r="1.2" fill="#FFFFFF" />
        {/* Eyebrows */}
        <path d="M-13 -38 Q-9 -40 -5 -38" stroke={hairBottom} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M5 -38 Q9 -40 13 -38" stroke={hairBottom} strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Big happy smile */}
        <path d="M-7 -19 Q0 -12 7 -19" stroke="#3F4052" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
};

// ─── Device platform icons ──────────────────────────────────────────────
const DeviceIcons: Record<string, React.ReactNode> = {
  Chromebook: (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
      <circle cx="14" cy="14" r="13" stroke="#6C3FA4" strokeWidth="2.4" />
      <path d="M14 1 L14 14 L25 20" stroke="#6C3FA4" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="14" cy="14" r="4" fill="#FFFFFF" stroke="#6C3FA4" strokeWidth="2.4" />
    </svg>
  ),
  Windows: (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="#6C3FA4">
      <rect x="2" y="3" width="11" height="11" />
      <rect x="15" y="3" width="11" height="11" />
      <rect x="2" y="16" width="11" height="11" />
      <rect x="15" y="16" width="11" height="11" />
    </svg>
  ),
  macOS: (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="#6C3FA4">
      <path d="M19.6 14.8c0-3.2 2.6-4.6 2.7-4.7-1.5-2.1-3.7-2.4-4.5-2.5-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1-2.1 0-4 1.2-5.1 3.1-2.2 3.7-.5 9.2 1.6 12.3 1 1.5 2.3 3.1 3.9 3.1 1.6-.1 2.2-1 4.1-1s2.4 1 4.1 1c1.7 0 2.8-1.5 3.8-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.5-1.3-3.5-5.3M16.7 5.5c.9-1 1.4-2.5 1.3-3.9-1.2.1-2.7.8-3.6 1.8-.8.9-1.5 2.4-1.3 3.7 1.4.1 2.7-.6 3.6-1.6" />
    </svg>
  ),
  iPadOS: (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
      <rect x="4" y="2" width="20" height="24" rx="3" stroke="#6C3FA4" strokeWidth="2.4" />
      <circle cx="14" cy="22" r="1.4" fill="#6C3FA4" />
      <line x1="11" y1="5" x2="17" y2="5" stroke="#6C3FA4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  'Android Tablet': (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
      <rect x="2" y="6" width="24" height="16" rx="3" stroke="#6C3FA4" strokeWidth="2.4" />
      <circle cx="24" cy="14" r="1.2" fill="#6C3FA4" />
      <path d="M9 12 a2 2 0 1 1 0.01 0 M19 12 a2 2 0 1 1 0.01 0" stroke="#6C3FA4" strokeWidth="1.5" />
    </svg>
  ),
  'Google TV': (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
      <rect x="2" y="5" width="24" height="16" rx="2.5" stroke="#6C3FA4" strokeWidth="2.4" />
      <line x1="9" y1="24" x2="19" y2="24" stroke="#6C3FA4" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="14" cy="13" r="3" stroke="#6C3FA4" strokeWidth="2" />
    </svg>
  ),
};

// ─── Skill rows for the brain section ───────────────────────────────────
interface SkillRow {
  title: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}
const BRAIN_SKILLS: SkillRow[] = [
  {
    title: 'Focus & attention', color: '#5BA0E8', bg: '#E0EFFB',
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg>,
  },
  {
    title: 'Memory & thinking', color: '#7ED957', bg: '#DCF5C9',
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a4 4 0 014 4v3a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 01-4-4 4 4 0 014-4V7a4 4 0 014-4z" /></svg>,
  },
  {
    title: 'Confidence & joy', color: '#FF8FB5', bg: '#FFE2EC',
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>,
  },
  {
    title: 'Coordination & balance', color: '#FFB14D', bg: '#FFE9CF',
    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /><circle cx="12" cy="12" r="9" /></svg>,
  },
];

// ─── Mode tile data ─────────────────────────────────────────────────────
interface ModeTile {
  step: string; title: string; subtitle: string; accent: string; bg: string;
  illustration: React.ReactNode;
}
const MODE_TILES: ModeTile[] = [
  { step: '01', title: 'Free Paint', subtitle: 'Draw in the air with color and creativity.', accent: '#FF6B85', bg: '#FFE2EC', illustration: <FreePaintTile /> },
  { step: '02', title: 'Tracing', subtitle: 'Trace letters, shapes and numbers.', accent: '#55DDE0', bg: '#D6F0FF', illustration: <TracingTile /> },
  { step: '03', title: 'Bubble Pop', subtitle: 'Pop bubbles, build focus and timing.', accent: '#A8D8FF', bg: '#E2F0FF', illustration: <BubblePopTile /> },
  { step: '04', title: 'Sort & Place', subtitle: 'Sort objects and build logic & memory.', accent: '#7ED957', bg: '#DCF5C9', illustration: <SortPlaceTile /> },
  { step: '05', title: 'Word Search', subtitle: 'Find words, build vocabulary.', accent: '#FFD84D', bg: '#FFF1B5', illustration: <WordSearchTile /> },
];

// ─── Skill cards (Movement strengthens learning) ────────────────────────
interface SkillCard { title: string; color: string; bg: string; icon: React.ReactNode; }
const SKILLS: SkillCard[] = [
  { title: 'Fine motor control', color: '#FF6B85', bg: '#FFE2EC', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 014 0v5" /><path d="M5 13V8a2 2 0 014 0" /><path d="M13 11v-1a2 2 0 014 0v6" /><path d="M17 13a2 2 0 014 0v3a8 8 0 01-16 0v-1" /></svg> },
  { title: 'Hand-eye coordination', color: '#55DDE0', bg: '#D6F0FF', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" fill="currentColor" /></svg> },
  { title: 'Spatial awareness', color: '#6C3FA4', bg: '#EAE0FB', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 3v18" /></svg> },
  { title: 'Early literacy & numeracy', color: '#FFB14D', bg: '#FFE9CF', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16" /></svg> },
  { title: 'Sustained focus', color: '#FFD84D', bg: '#FFF1B5', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> },
  { title: 'Active screen time', color: '#7ED957', bg: '#DCF5C9', icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M5 12H1M23 12h-4" /><circle cx="12" cy="12" r="4" /></svg> },
];

// ─── Privacy guarantees ─────────────────────────────────────────────────
const PRIVACY: { label: string; color: string; icon: React.ReactNode }[] = [
  { label: 'No downloads', color: '#FF6B85', icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></svg> },
  { label: 'No ads', color: '#FFB14D', icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></svg> },
  { label: 'No tracking', color: '#6C3FA4', icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6" /><path d="M21 21l-4.35-4.35" /></svg> },
  { label: 'No data shared', color: '#7ED957', icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg> },
];

// ─── Testimonials ───────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: 'My son looks forward to learning now. He doesn\'t even realize how much he\'s learning.', name: 'Priya M.', role: 'Parent', tint: '#FF6B85' },
  { quote: 'A perfect brain break that builds real skills. My class is more focused and happy.', name: 'James L.', role: 'Teacher', tint: '#55DDE0' },
  { quote: '"Finally, screen time I feel good about."', name: 'Sarah K.', role: 'Parent', tint: '#7ED957' },
];

// ─── Steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { step: '1', title: 'Raise Your Hand', desc: 'Enter the motion zone on screen.', color: '#6C3FA4', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 014 0v5" /><path d="M5 13V8a2 2 0 014 0" /><path d="M13 11v-1a2 2 0 014 0v6" /><path d="M17 13a2 2 0 014 0v3a8 8 0 01-16 0v-1" /></svg> },
  { step: '2', title: 'Path to Draw', desc: 'Move your hand to follow the guide.', color: '#FF6B85', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19c4 0 4-12 8-12s4 12 8 12" /></svg> },
  { step: '3', title: 'Open Hand to Pause', desc: 'Hold still to pause or finish.', color: '#55DDE0', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 3" /></svg> },
  { step: '4', title: 'Instant Magic', desc: 'See your actions come to life!', color: '#FFD84D', icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" stroke="#3F4052" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 2 L14.5 9 L22 9 L16 13.5 L18.2 21 L12 16.5 L5.8 21 L8 13.5 L2 9 L9.5 9 Z" /></svg> },
];

// ─── Tech / safety badges ───────────────────────────────────────────────
const TECH_BADGES: { label: string; color: string; icon: React.ReactNode }[] = [
  { label: 'No AI profiling', color: '#6C3FA4', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg> },
  { label: 'Secure by design', color: '#7ED957', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z" /></svg> },
  { label: 'Kid-first interface', color: '#FF8FB5', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4" /><path d="M5 21c0-4 4-7 7-7s7 3 7 7" /></svg> },
  { label: 'Continuous innovation', color: '#FFB14D', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" /></svg> },
];

const NAV_LINKS = [
  { id: 'how-it-works', label: 'How it Works' },
  { id: 'features', label: 'Activities' },
  { id: 'parents', label: 'For Families' },
  { id: 'schools', label: 'For Educators' },
  { id: 'safety', label: 'Safety' },
  { id: 'pricing', label: 'Pricing' },
];

// ════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════
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
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('dl-visible'); });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.dl-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
    setFeedbackOpen((prev) => { if (!prev) setFeedbackSent(false); return !prev; });
  }, []);

  const submitFeedback = useCallback(() => {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    submitFormData({ type: 'feedback', email: feedbackEmail.trim() || undefined, message: feedbackText.trim() })
      .then(() => {
        setFeedbackSent(true); setFeedbackText(''); setFeedbackEmail(''); setFeedbackSending(false);
        setTimeout(() => setFeedbackOpen(false), 2500);
      }).catch(() => setFeedbackSending(false));
  }, [feedbackText, feedbackEmail]);

  const openPilotModal = useCallback(() => {
    setPilotOpen(true); setPilotSent(false); setPilotErrors({}); setPilotSubmitError('');
    document.body.style.overflow = 'hidden';
  }, []);

  const submitPilot = useCallback(() => {
    const errors: Record<string, boolean> = {};
    if (!pilotName.trim()) errors.name = true;
    if (!pilotEmail.trim()) errors.email = true;
    if (!pilotSchool.trim()) errors.school = true;
    if (Object.keys(errors).length > 0) { setPilotErrors(errors); return; }
    setPilotSubmitError(''); setPilotSending(true);
    submitFormData({
      type: 'school_pack_request', name: pilotName.trim(), email: pilotEmail.trim(),
      school: pilotSchool.trim(), role: pilotRole, yearGroup: pilotYear,
      deviceType: pilotDevice, sendNotes: pilotNotes.trim(),
    }).then(() => {
      setPilotSent(true); setPilotSending(false);
      setPilotName(''); setPilotEmail(''); setPilotSchool('');
      setPilotRole(''); setPilotYear(''); setPilotDevice(''); setPilotNotes('');
    }).catch((err: { message?: string }) => {
      setPilotSubmitError(err.message ?? 'Something went wrong. Please try again.');
      setPilotSending(false);
    });
  }, [pilotName, pilotEmail, pilotSchool, pilotRole, pilotYear, pilotDevice, pilotNotes]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault(); closeMobileMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="dl-page">
      <style dangerouslySetInnerHTML={{ __html: LANDING_INLINE_CSS }} />

      {/* ═══════ NAV ═══════ */}
      <nav className="dl-nav-fixed dl-nav-blur" style={{ background: 'rgba(255,255,255,0.85)', borderBottom: '1.5px solid rgba(108,63,164,0.10)' }}>
        <div className="dl-container dl-flex dl-items-center dl-justify-between" style={{ height: 68 }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="dl-flex dl-items-center dl-gap-3" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="Draw in the Air" width={120} height={36} className="dl-nav-logo" />
            <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.1rem', color: tokens.colors.deepPlum }} className="dl-brand-name">Draw in the Air</span>
          </a>
          <div className="dl-desktop-only dl-items-center" style={{ gap: 28, fontFamily: tokens.fontFamily.body, fontWeight: 600, color: tokens.colors.charcoal }}>
            {NAV_LINKS.map((l) => l.id === 'safety' || l.id === 'pricing' ? (
              <a key={l.id} href={l.id === 'safety' ? '/privacy' : '/pricing'} className="dl-nav-link">{l.label}</a>
            ) : (
              <a key={l.id} href={`#${l.id}`} onClick={(e) => scrollTo(e, l.id)} className="dl-nav-link">{l.label}</a>
            ))}
          </div>
          <div className="dl-desktop-only dl-items-center" style={{ gap: 12 }}>
            <KidButton variant="primary" size="md" onClick={() => { trackCtaClick('nav', 'Try Free'); setTryFreeOpen(true); }} style={{ minHeight: 44, padding: '8px 22px', fontSize: '0.95rem' }}>Try Free</KidButton>
            <KidButton variant="secondary" size="md" onClick={openPilotModal} style={{ minHeight: 44, padding: '8px 20px', fontSize: '0.95rem' }}>Book a Demo</KidButton>
          </div>
          <button className="dl-mobile-only" style={{ background: 'none', border: 'none', color: tokens.colors.deepPlum }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="dl-mobile-drawer dl-mobile-only-block" style={{ padding: '8px 24px 16px' }}>
            {NAV_LINKS.map((l) => l.id === 'safety' || l.id === 'pricing' ? (
              <a key={l.id} href={l.id === 'safety' ? '/privacy' : '/pricing'} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>{l.label}</a>
            ) : (
              <a key={l.id} href={`#${l.id}`} onClick={(e) => scrollTo(e, l.id)} className="dl-mobile-nav-link" style={{ color: tokens.colors.charcoal }}>{l.label}</a>
            ))}
            <div className="dl-flex-col dl-gap-3" style={{ marginTop: 12 }}>
              <KidButton variant="primary" size="md" fullWidth onClick={() => { trackCtaClick('mobile_menu', 'Try Free'); closeMobileMenu(); setTryFreeOpen(true); }}>Try Free</KidButton>
              <KidButton variant="secondary" size="md" fullWidth onClick={() => { closeMobileMenu(); openPilotModal(); }}>Book a Demo</KidButton>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section style={{ position: 'relative', paddingTop: 100, paddingBottom: 60 }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-fade-up">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.15)', borderRadius: 9999, padding: '6px 14px', fontFamily: tokens.fontFamily.body, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, boxShadow: tokens.shadow.float, marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: tokens.colors.meadowGreen }} />
              Motion learning for ages 3 to 10
            </div>
            <h1 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(2.6rem, 6.5vw, 4.6rem)', lineHeight: 1.05, letterSpacing: '-0.02em', color: tokens.colors.charcoal, marginBottom: 24 }}>
              Learning that{' '}
              <span style={{ color: tokens.colors.deepPlum, position: 'relative', whiteSpace: 'nowrap', display: 'inline-block' }}>
                moves
                <svg viewBox="0 0 220 22" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: -10, width: '100%', height: 18 }}>
                  <path d="M4 14 Q60 2 110 11 T216 9" stroke={tokens.colors.sunshine} strokeWidth="8" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: 'clamp(1.05rem, 1.5vw, 1.2rem)', lineHeight: 1.55, color: tokens.colors.charcoal, opacity: 0.85, maxWidth: 520, marginBottom: 28 }}>
              Draw in the Air turns screen time into active learning. No downloads. No wearables. Just your motion, your imagination, and fun.
            </p>
            <div className="dl-flex dl-flex-wrap dl-items-center dl-gap-4" style={{ marginBottom: 22 }}>
              <div className="dl-cta-glow">
                <KidButton variant="primary" size="lg" onClick={() => { trackCtaClick('hero', "Try Draw in the Air. It's Free"); setTryFreeOpen(true); }}>Try Draw in the Air. It's Free</KidButton>
              </div>
              <KidButton variant="secondary" size="lg" onClick={(e) => scrollTo(e as unknown as React.MouseEvent<HTMLAnchorElement>, 'how-it-works')}>See How It Works</KidButton>
            </div>
            <div className="dl-flex dl-flex-wrap dl-items-center dl-gap-4" style={{ marginTop: 6 }}>
              {[
                { label: 'No downloads', color: tokens.colors.meadowGreen, icon: '✓' },
                { label: 'No ads', color: tokens.colors.coral, icon: '✕' },
                { label: 'Child-safe & private', color: tokens.colors.deepPlum, icon: '🔒' },
              ].map((b) => (
                <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: tokens.fontFamily.body, fontSize: '0.9rem', fontWeight: 600, color: tokens.colors.charcoal, opacity: 0.85 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: `${b.color}25`, color: b.color, fontSize: '0.8rem', fontWeight: 700 }}>{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
          <div className="dl-fade-up" style={{ animationDelay: '0.2s', position: 'relative' }}>
            <div className="dl-hero-frame" style={{ aspectRatio: '1/1', overflow: 'hidden', padding: 12, background: 'linear-gradient(165deg, #BEEBFF 0%, #DEF5FF 50%, #FFFAEB 100%)' }}>
              <HeroIllustration />
            </div>
            <div className="dl-float" style={{ position: 'absolute', top: 16, left: 16, background: '#FFFFFF', border: '2px solid rgba(85,221,224,0.4)', borderRadius: 9999, padding: '6px 14px', fontFamily: tokens.fontFamily.body, fontWeight: 700, fontSize: '0.82rem', color: tokens.colors.charcoal, boxShadow: tokens.shadow.float }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tokens.colors.meadowGreen, boxShadow: `0 0 0 3px ${tokens.colors.meadowGreen}33` }} />
                Works in your browser
              </span>
            </div>
            <div className="dl-float-2" style={{ position: 'absolute', bottom: -10, right: -10, background: tokens.colors.sunshine, border: '3px solid #FFFFFF', borderRadius: 9999, padding: '8px 16px', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.9rem', color: tokens.colors.charcoal, boxShadow: tokens.shadow.glow }}>
              ✨ No setup
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PROBLEM / SCREENS THAT BUILD ═══════ */}
      <section style={{ background: '#FFFFFF', padding: '80px 0', position: 'relative' }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-reveal">
            <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, color: tokens.colors.charcoal, marginBottom: 22 }}>
              Screens that drain.<br />
              Or screens that <span style={{ color: tokens.colors.deepPlum }}>build</span>.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.1rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, maxWidth: 480, marginBottom: 28 }}>
              Not all screen time is created equal. Draw in the Air uses your child's body as the controller. Building skills that last far beyond the screen.
            </p>
            <KidButton variant="success" size="md" onClick={(e) => scrollTo(e as unknown as React.MouseEvent<HTMLAnchorElement>, 'how-it-works')}>The science behind play</KidButton>
          </div>
          <div className="dl-reveal" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, alignItems: 'center' }}>
            <div style={{ background: 'linear-gradient(165deg, #FFFFFF 0%, #FFF1F4 60%, #FFE9D6 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 18, boxShadow: tokens.shadow.float, aspectRatio: '1/1' }}>
              <BrainViz />
            </div>
            <div className="dl-flex-col" style={{ gap: 12 }}>
              {BRAIN_SKILLS.map((s) => (
                <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 18, padding: '12px 14px', boxShadow: '0 2px 8px rgba(108,63,164,0.06)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.95rem', color: tokens.colors.charcoal }}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS — 4 step cards ═══════ */}
      <section id="how-it-works" style={{ background: '#F4FAFF', padding: '80px 0', position: 'relative' }}>
        <div className="dl-container">
          <div className="dl-reveal dl-text-center" style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, color: tokens.colors.charcoal, marginBottom: 12 }}>
              Your hands become <span style={{ color: tokens.colors.deepPlum }}>the tool</span>
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.05rem', color: tokens.colors.charcoal, opacity: 0.7 }}>
              No controller needed. Just you.
            </p>
          </div>
          <div className="dl-grid-4" style={{ position: 'relative' }}>
            {STEPS.map((s, i) => (
              <div key={s.step} className="dl-reveal" style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.12)', borderRadius: 26, padding: 24, textAlign: 'center', boxShadow: tokens.shadow.panel, position: 'relative', transitionDelay: `${i * 0.06}s` }}>
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(180deg, ${s.color} 0%, ${s.color}DD 100%)`, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1rem', boxShadow: `0 4px 10px ${s.color}66`, border: '3px solid #FFFFFF' }}>
                  {s.step}
                </div>
                <div style={{ width: 56, height: 56, margin: '20px auto 14px', borderRadius: 18, background: `${s.color}1A`, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${s.color}33` }}>
                  {s.icon}
                </div>
                <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.05rem', color: tokens.colors.charcoal, marginBottom: 4 }}>{s.title}</h3>
                <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.7, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FIVE WORLDS / ACTIVITIES ═══════ */}
      <section id="features" style={{ background: '#FFFFFF', padding: '80px 0' }}>
        <div className="dl-container dl-grid-2-3" style={{ alignItems: 'flex-start' }}>
          <div className="dl-reveal">
            <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, color: tokens.colors.charcoal, marginBottom: 16 }}>
              Five worlds.<br />
              <span style={{ color: tokens.colors.deepPlum }}>One pinch.</span>
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.05rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: 24, maxWidth: 360 }}>
              Playful activities that turn movement into meaningful learning.
            </p>
            <KidButton variant="primary" size="md" onClick={() => { trackCtaClick('activities', 'Explore Activities'); setTryFreeOpen(true); }}>Explore Activities →</KidButton>
          </div>
          <div>
            <div className="dl-reveal dl-mode-tiles">
              {MODE_TILES.map((m) => (
                <div key={m.title} className="dl-mode-tile" style={{ border: `2.5px solid ${m.accent}33` }}>
                  <div style={{ background: m.bg, borderRadius: 18, padding: 12, marginBottom: 14, aspectRatio: '1/1' }}>
                    {m.illustration}
                  </div>
                  <span style={{ display: 'inline-block', background: m.accent, color: '#FFFFFF', fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.7rem', padding: '2px 10px', borderRadius: 9999, marginBottom: 6 }}>{m.step}</span>
                  <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.05rem', color: tokens.colors.charcoal, marginBottom: 4 }}>{m.title}</h3>
                  <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.82rem', color: tokens.colors.charcoal, opacity: 0.7, lineHeight: 1.45 }}>{m.subtitle}</p>
                </div>
              ))}
              {/* CTA tile */}
              <div className="dl-mode-tile" style={{ background: `linear-gradient(165deg, ${tokens.colors.deepPlum} 0%, ${tokens.semantic.primaryHover} 100%)`, border: '3px solid #FFFFFF', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: tokens.shadow.glow }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: '2px solid rgba(255,255,255,0.4)' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="#FFFFFF"><path d="M5 3l14 9-14 9V3z" /></svg>
                </div>
                <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.15rem', marginBottom: 4, color: '#FFFFFF' }}>Try it now</h3>
                <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.82rem', opacity: 0.95, lineHeight: 1.4, marginBottom: 14, color: '#FFFFFF', fontWeight: 600 }}>Jump in and play in your browser.</p>
                <KidButton variant="success" size="md" onClick={() => { trackCtaClick('mode_tile', 'Start Playing'); setTryFreeOpen(true); }} style={{ minHeight: 40, padding: '6px 16px', fontSize: '0.85rem' }}>Start Playing</KidButton>
              </div>
            </div>
            <p className="dl-scroll-hint">← swipe to explore →</p>
          </div>
        </div>
      </section>

      {/* ═══════ MOVEMENT + GUILT-FREE — dual card ═══════ */}
      <section id="parents" style={{ background: '#F4FAFF', padding: '80px 0' }}>
        <div className="dl-container dl-grid-2">
          {/* Movement strengthens learning */}
          <div className="dl-reveal" style={{ background: 'linear-gradient(165deg, #FFFAEB 0%, #FFF1D6 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 32, boxShadow: tokens.shadow.float }}>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.6rem', color: tokens.colors.charcoal, marginBottom: 12 }}>
              Movement strengthens <span style={{ color: tokens.colors.deepPlum }}>learning</span>
            </h3>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', lineHeight: 1.55, color: tokens.colors.charcoal, opacity: 0.8, marginBottom: 18 }}>
              When kids move, their brains light up. Draw in the Air supports growth in attention, memory, coordination and emotional well-being.
            </p>
            <a href="#how-it-works" onClick={(e) => scrollTo(e, 'how-it-works')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.9rem', color: tokens.colors.deepPlum, textDecoration: 'none', marginBottom: 22 }}>
              Learn more →
            </a>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {SKILLS.map((s) => (
                <div key={s.title} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, margin: '0 auto 6px', borderRadius: 12, background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {s.icon}
                  </div>
                  <p style={{ fontFamily: tokens.fontFamily.body, fontWeight: 700, fontSize: '0.72rem', color: tokens.colors.charcoal, lineHeight: 1.3 }}>{s.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Screen time guilt-free */}
          <div className="dl-reveal" style={{ background: 'linear-gradient(165deg, #FFFFFF 0%, #F4FAFF 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 32, boxShadow: tokens.shadow.float }}>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.6rem', color: tokens.colors.charcoal, marginBottom: 12 }}>
              Screen time you don't<br />have to feel <span style={{ color: tokens.colors.deepPlum }}>guilty</span> about
            </h3>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', lineHeight: 1.55, color: tokens.colors.charcoal, opacity: 0.8, marginBottom: 18 }}>
              Everything your child does stays private on your device. No ads. No tracking. Ever.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 22 }}>
              {PRIVACY.map((p) => (
                <div key={p.label} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 14, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 9, background: `${p.color}1A`, color: p.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.icon}</span>
                  <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.82rem', color: tokens.colors.charcoal }}>{p.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <KidButton variant="primary" size="md" onClick={() => { trackCtaClick('privacy_section', 'Start in 10 Seconds'); setTryFreeOpen(true); }}>Start in 10 Seconds →</KidButton>
              {/* Kid+shield sits inline next to the button so it's never clipped */}
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                <KidShield />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CLASSROOMS + TESTIMONIALS ═══════ */}
      <section id="schools" style={{ background: '#FFFFFF', padding: '80px 0' }}>
        <div className="dl-container dl-grid-2">
          {/* Classroom card */}
          <div className="dl-reveal" style={{ background: 'linear-gradient(165deg, #F4FAFF 0%, #E8DEFB 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 32, boxShadow: tokens.shadow.float }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '2px solid rgba(126,217,87,0.4)', borderRadius: 9999, padding: '4px 12px', fontFamily: tokens.fontFamily.body, fontWeight: 700, fontSize: '0.78rem', color: tokens.colors.meadowGreen, marginBottom: 14 }}>
              <span>♡</span> Loved by educators
            </div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.7rem', color: tokens.colors.charcoal, marginBottom: 12 }}>
              Built for <span style={{ color: tokens.colors.deepPlum }}>classrooms</span>
            </h3>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', lineHeight: 1.55, color: tokens.colors.charcoal, opacity: 0.8, marginBottom: 18 }}>
              Bring active, engaging learning to every classroom. No logins. No installs. Just open and teach.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Works on any device with a camera',
                'Curriculum-aligned activities',
                'Simple to use for every teacher',
              ].map((t) => (
                <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', fontWeight: 600, color: tokens.colors.charcoal }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: tokens.colors.meadowGreen, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <KidButton variant="primary" size="md" onClick={openPilotModal}>Request Pilot Pack</KidButton>
            <div style={{ marginTop: 22, borderRadius: 22, overflow: 'hidden', border: '2.5px solid rgba(108,63,164,0.14)', boxShadow: '0 6px 16px rgba(108,63,164,0.10)' }}>
              <ClassroomScene />
            </div>
          </div>

          {/* Testimonials card */}
          <div className="dl-reveal" style={{ background: 'linear-gradient(165deg, #FFE9D6 0%, #FFD2BC 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 32, boxShadow: tokens.shadow.float }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '2px solid rgba(255,107,133,0.4)', borderRadius: 9999, padding: '4px 12px', fontFamily: tokens.fontFamily.body, fontWeight: 700, fontSize: '0.78rem', color: tokens.colors.coral, marginBottom: 14 }}>
              <span>♥</span> Loved by families
            </div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.7rem', color: tokens.colors.charcoal, marginBottom: 22 }}>
              Loved by families and<br /><span style={{ color: tokens.colors.deepPlum }}>educators</span>
            </h3>
            <div className="dl-flex-col" style={{ gap: 14 }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.10)', borderRadius: 18, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.tint, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1rem' }}>
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', lineHeight: 1.45, color: tokens.colors.charcoal, marginBottom: 4 }}>"{t.quote.replace(/^"|"$/g, '')}"</p>
                    <p style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.78rem', color: tokens.colors.deepPlum }}>
                      {t.name} · <span style={{ color: tokens.colors.charcoal, opacity: 0.7, fontWeight: 600 }}>{t.role}</span>
                    </p>
                    <div style={{ marginTop: 4, color: tokens.colors.sunshine, fontSize: '0.85rem' }}>★★★★★</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.9rem', color: tokens.colors.deepPlum, textDecoration: 'none' }}>Read more stories →</a>
          </div>
        </div>
      </section>

      {/* ═══════ BUILT LIKE A SERIOUS PRODUCT ═══════ */}
      <section style={{ background: '#FFFAEB', padding: '80px 0' }}>
        <div className="dl-container dl-grid-2-hero">
          <div className="dl-reveal">
            <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(2rem, 4.5vw, 3rem)', lineHeight: 1.05, color: tokens.colors.charcoal, marginBottom: 14 }}>
              Built like a <span style={{ color: tokens.colors.deepPlum }}>serious</span> product.
            </h2>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1.05rem', lineHeight: 1.6, color: tokens.colors.charcoal, opacity: 0.85, marginBottom: 22, maxWidth: 480 }}>
              Designed with care, backed by research, and built with your child's well-being in mind.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              {TECH_BADGES.map((b) => (
                <div key={b.label} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.12)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 9, background: `${b.color}1A`, color: b.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{b.icon}</span>
                  <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.9rem', color: tokens.colors.charcoal }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dl-reveal" style={{ background: 'linear-gradient(165deg, #FFFFFF 0%, #FFF1F4 100%)', border: '2.5px solid rgba(108,63,164,0.14)', borderRadius: 32, padding: 24, boxShadow: tokens.shadow.float, position: 'relative' }}>
            <HandTrackingViz />
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <a href="#how-it-works" onClick={(e) => scrollTo(e, 'how-it-works')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.9rem', color: tokens.colors.deepPlum, textDecoration: 'none' }}>See how it works →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DEVICE SUPPORT ═══════ */}
      <section style={{ background: '#FFFFFF', padding: '80px 0' }}>
        <div className="dl-container dl-text-center">
          <h2 className="dl-reveal" style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.1, color: tokens.colors.charcoal, marginBottom: 8 }}>
            Designed to work where you are
          </h2>
          <p className="dl-reveal" style={{ fontFamily: tokens.fontFamily.body, fontSize: '1rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: 36 }}>
            Open in your browser on any modern device with a camera.
          </p>
          <div className="dl-reveal" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
            {Object.keys(DeviceIcons).map((platform) => (
              <div key={platform} style={{ background: '#FFFFFF', border: '2px solid rgba(108,63,164,0.16)', borderRadius: 18, padding: '14px 20px', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 10px rgba(108,63,164,0.08)' }}>
                {DeviceIcons[platform]}
                <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.95rem', color: tokens.colors.charcoal }}>{platform}</span>
              </div>
            ))}
          </div>
          <p className="dl-reveal" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.6, marginTop: 22 }}>
            No downloads. No sign ups. Just open and play.
          </p>
        </div>
      </section>

      {/* ═══════ FINAL CTA — purple banner with two kids ═══════ */}
      <section style={{ padding: '80px 0 100px', position: 'relative' }}>
        <div className="dl-container" style={{ position: 'relative' }}>
          <div className="dl-reveal" style={{
            position: 'relative',
            background: `linear-gradient(135deg, ${tokens.semantic.primaryHover} 0%, ${tokens.colors.deepPlum} 60%, #5A3290 100%)`,
            borderRadius: 44,
            padding: '60px 30px',
            overflow: 'hidden',
          }}>
            {/* Confetti dots */}
            {Array.from({ length: 24 }).map((_, i) => {
              const colors = ['#FFD84D', '#FF6B85', '#7ED957', '#55DDE0', '#FFB14D'];
              return (
                <span key={i} style={{
                  position: 'absolute',
                  top: `${(i * 13) % 100}%`,
                  left: `${(i * 17) % 100}%`,
                  width: 8 + (i % 3) * 4,
                  height: 8 + (i % 3) * 4,
                  borderRadius: i % 2 === 0 ? '50%' : '4px',
                  background: colors[i % colors.length],
                  opacity: 0.85,
                  transform: `rotate(${i * 30}deg)`,
                  pointerEvents: 'none',
                }} />
              );
            })}
            {/* Two kids */}
            <div style={{ position: 'absolute', bottom: 0, left: 10, width: 180, height: 240, pointerEvents: 'none' }} className="dl-cta-kid-left">
              <KidWaving side="left" />
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 10, width: 180, height: 240, pointerEvents: 'none' }} className="dl-cta-kid-right">
              <KidWaving side="right" />
            </div>
            {/* Center content */}
            <div style={{ position: 'relative', textAlign: 'center', maxWidth: 580, margin: '0 auto' }}>
              <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: 'clamp(1.8rem, 4.5vw, 3rem)', lineHeight: 1.15, color: '#FFFFFF', marginBottom: 14 }}>
                Let them draw.<br />
                Let them move.<br />
                Let them <span style={{ color: tokens.colors.sunshine }}>learn</span>.
              </h2>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '1rem', color: '#FFFFFF', opacity: 0.95, marginBottom: 22 }}>
                Try Draw in the Air now. Free, safe and joyful.
              </p>
              <KidButton variant="success" size="lg" onClick={() => { trackCtaClick('final_banner', 'Launch Draw in the Air'); setTryFreeOpen(true); }}>Launch Draw in the Air</KidButton>
              <p style={{ marginTop: 14, fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: '#FFFFFF', opacity: 0.95, fontWeight: 600 }}>
                Free to try · No downloads · No credit card
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background: '#FFFFFF', borderTop: '2px solid rgba(108,63,164,0.10)', padding: '40px 0 24px' }}>
        <div className="dl-container">
          <div className="dl-grid-4" style={{ marginBottom: 32 }}>
            <div>
              <div className="dl-flex dl-items-center dl-gap-3" style={{ marginBottom: 12 }}>
                <img src="/logo.png" alt="Draw in the Air" width={110} height={32} className="dl-footer-logo" />
                <span style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1rem', color: tokens.colors.deepPlum }}>Draw in the Air</span>
              </div>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.7, lineHeight: 1.5 }}>
                Active learning that moves young minds forward.
              </p>
              <div className="dl-flex dl-gap-3" style={{ marginTop: 14 }}>
                {['📷', '𝕏', '♪', 'f'].map((s, i) => (
                  <span key={i} style={{ width: 32, height: 32, borderRadius: 8, background: '#F4FAFF', border: '2px solid rgba(108,63,164,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.deepPlum, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Product</h4>
              <div className="dl-flex-col" style={{ gap: 8 }}>
                <a href="#how-it-works" onClick={(e) => scrollTo(e, 'how-it-works')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>How it Works</a>
                <a href="#features" onClick={(e) => scrollTo(e, 'features')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Activities</a>
                <a href="/privacy" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Safety & Privacy</a>
                <a href="/pricing" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Pricing</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>For Families</h4>
              <div className="dl-flex-col" style={{ gap: 8 }}>
                <a href="#parents" onClick={(e) => scrollTo(e, 'parents')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Why Movement Matters</a>
                <a href="#parents" onClick={(e) => scrollTo(e, 'parents')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Screen Time Guide</a>
                <a href="/faq" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Parent Resources</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '0.85rem', color: tokens.colors.deepPlum, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>For Educators</h4>
              <div className="dl-flex-col" style={{ gap: 8 }}>
                <a href="#schools" onClick={(e) => scrollTo(e, 'schools')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Classroom Solutions</a>
                <a href="#schools" onClick={(e) => scrollTo(e, 'schools')} style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75, textDecoration: 'none' }}>Lesson Ideas</a>
                <button onClick={openPilotModal} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.75 }}>Pilot Program</button>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1.5px solid rgba(108,63,164,0.10)', paddingTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.78rem', color: tokens.colors.charcoal, opacity: 0.6 }}>
              © 2026 Draw in the Air. All rights reserved.
            </p>
            <div className="dl-flex dl-gap-4">
              <a href="/privacy" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.78rem', color: tokens.colors.charcoal, opacity: 0.6, textDecoration: 'none' }}>Privacy Policy</a>
              <a href="/terms" style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.78rem', color: tokens.colors.charcoal, opacity: 0.6, textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════ FEEDBACK WIDGET ═══════ */}
      <button className="dl-feedback-btn" onClick={toggleFeedback} aria-label="Send Feedback">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
      </button>
      <div className={`dl-feedback-panel ${feedbackOpen ? 'dl-open' : ''}`}>
        {!feedbackSent ? (
          <div>
            <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.1rem', color: tokens.colors.charcoal, marginBottom: 4 }}>Send feedback</h3>
            <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.65, marginBottom: 16 }}>We'd love to hear from you.</p>
            <textarea className="dl-form-input" rows={4} placeholder="What's on your mind?" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ marginBottom: 12, resize: 'vertical' }} />
            <input type="email" className="dl-form-input" placeholder="Email (optional)" value={feedbackEmail} onChange={(e) => setFeedbackEmail(e.target.value)} style={{ marginBottom: 16 }} />
            <div className="dl-flex dl-items-center dl-justify-between">
              <KidButton variant="primary" size="md" onClick={submitFeedback} disabled={feedbackSending} style={{ minHeight: 48, padding: '8px 22px', fontSize: '0.95rem' }}>{feedbackSending ? 'Sending…' : 'Send'}</KidButton>
              <button onClick={toggleFeedback} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.85rem', color: tokens.colors.charcoal, opacity: 0.6, fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: tokens.colors.meadowGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tokens.shadow.glow }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
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
                <h2 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.4rem', color: tokens.colors.charcoal }}>Book a demo / Pilot pack</h2>
                <button onClick={closePilotModal} style={{ background: '#F4FAFF', border: '2px solid rgba(108,63,164,0.18)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: tokens.colors.deepPlum }} aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: 22 }}>
                Tell us about your school and we'll send a free pilot pack with lesson plans, EYFS mapping and a teacher quick-start.
              </p>
              {pilotSubmitError && (
                <div style={{ marginBottom: 16, padding: 12, borderRadius: 14, background: 'rgba(255,107,107,0.10)', border: '2px solid rgba(255,107,107,0.4)', color: tokens.colors.coral, fontFamily: tokens.fontFamily.body, fontSize: '0.9rem' }}>
                  <strong>Error:</strong> {pilotSubmitError}
                </div>
              )}
              <div className="dl-flex-col" style={{ gap: 14 }}>
                <div><label className="dl-form-label">Your name *</label><input type="text" className="dl-form-input" placeholder="Jane Smith" value={pilotName} onChange={(e) => { setPilotName(e.target.value); setPilotErrors((p) => ({ ...p, name: false })); }} style={pilotErrors.name ? { borderColor: tokens.colors.coral } : undefined} /></div>
                <div><label className="dl-form-label">Email *</label><input type="email" className="dl-form-input" placeholder="jane@school.edu" value={pilotEmail} onChange={(e) => { setPilotEmail(e.target.value); setPilotErrors((p) => ({ ...p, email: false })); }} style={pilotErrors.email ? { borderColor: tokens.colors.coral } : undefined} /></div>
                <div><label className="dl-form-label">School name *</label><input type="text" className="dl-form-input" placeholder="Elm Park Primary" value={pilotSchool} onChange={(e) => { setPilotSchool(e.target.value); setPilotErrors((p) => ({ ...p, school: false })); }} style={pilotErrors.school ? { borderColor: tokens.colors.coral } : undefined} /></div>
                <div className="dl-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
                  <div><label className="dl-form-label">Your role</label>
                    <select className="dl-form-input" value={pilotRole} onChange={(e) => setPilotRole(e.target.value)}>
                      <option value="">Select...</option><option>Teacher</option><option>Teaching Assistant</option><option>SENCO</option><option>Head Teacher</option><option>IT Coordinator</option><option>Other</option>
                    </select>
                  </div>
                  <div><label className="dl-form-label">Year group</label>
                    <select className="dl-form-input" value={pilotYear} onChange={(e) => setPilotYear(e.target.value)}>
                      <option value="">Select...</option><option>Nursery (3-4)</option><option>Reception (4-5)</option><option>Year 1 (5-6)</option><option>Year 2 (6-7)</option><option>Mixed / SEN</option>
                    </select>
                  </div>
                </div>
                <div><label className="dl-form-label">Primary device</label>
                  <select className="dl-form-input" value={pilotDevice} onChange={(e) => setPilotDevice(e.target.value)}>
                    <option value="">Select...</option><option>Laptops</option><option>Chromebooks</option><option>iPads / Tablets</option><option>Interactive Whiteboard</option><option>Mixed</option>
                  </select>
                </div>
                <div><label className="dl-form-label">Notes</label><textarea className="dl-form-input" rows={3} placeholder="Anything else we should know?" value={pilotNotes} onChange={(e) => setPilotNotes(e.target.value)} style={{ resize: 'vertical' }} /></div>
              </div>
              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <KidButton variant="primary" size="lg" onClick={submitPilot} disabled={pilotSending}>{pilotSending ? 'Sending…' : 'Send Request'}</KidButton>
                <button onClick={closePilotModal} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.6, fontWeight: 600 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 80, height: 80, margin: '0 auto 18px', borderRadius: '50%', background: tokens.colors.meadowGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: tokens.shadow.glow, border: '4px solid #FFFFFF' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
              </div>
              <h3 style={{ fontFamily: tokens.fontFamily.display, fontWeight: 700, fontSize: '1.4rem', color: tokens.colors.charcoal, marginBottom: 8 }}>Request sent!</h3>
              <p style={{ fontFamily: tokens.fontFamily.body, fontSize: '0.95rem', color: tokens.colors.charcoal, opacity: 0.7, marginBottom: 20 }}>We'll be in touch within 24 hours with your pilot pack.</p>
              <KidButton variant="secondary" size="md" onClick={closePilotModal}>Close</KidButton>
            </div>
          )}
        </div>
      </div>

      <TryFreeModal open={tryFreeOpen} onClose={() => setTryFreeOpen(false)} />
    </div>
  );
};
