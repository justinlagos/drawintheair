/**
 * BalloonMathBackground — Bright sky scene with floating balloons.
 *
 * Pure SVG, zero per-frame work. Sits behind the gameplay layer.
 * Floating balloons are decorative — the gameplay-relevant balloons
 * (with numbers on them) are drawn on the canvas by balloonMathLogic.
 */

export const BalloonMathBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 55%, #FFF6E5 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 600px at 78% 18%, rgba(255, 216, 77, 0.40) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Sun */}
            <circle cx="1180" cy="160" r="62" fill="#FFD84D" opacity="0.9" />

            {/* Floating decorative balloons (background only) */}
            {[
                { x: 80, y: 280, c: '#FF6B6B', s: 1 },
                { x: 1320, y: 320, c: '#7ED957', s: 0.85 },
                { x: 220, y: 520, c: '#FFB14D', s: 0.7 },
                { x: 1280, y: 580, c: '#A855F7', s: 0.9 },
                { x: 60, y: 700, c: '#55DDE0', s: 0.75 },
            ].map((b, i) => (
                <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.s})`} opacity="0.65">
                    <path d="M 0 0 C -22 0 -32 24 -32 38 C -32 56 -18 66 0 68 C 18 66 32 56 32 38 C 32 24 22 0 0 0 Z"
                          fill={b.c} />
                    <ellipse cx="-10" cy="20" rx="8" ry="11" fill="#FFFFFF" opacity="0.45"
                             transform="rotate(-22)" />
                    <polygon points="-4,68 0,62 4,68 2,74 -2,74" fill={b.c} />
                    <path d="M 0 74 Q -2 110 2 140" fill="none" stroke="#3F4052" strokeWidth="1.5" />
                </g>
            ))}

            {/* Soft clouds */}
            <g opacity="0.85">
                <ellipse cx="200" cy="150" rx="80" ry="22" fill="#FFFFFF" />
                <ellipse cx="240" cy="135" rx="50" ry="18" fill="#FFFFFF" />
                <ellipse cx="780" cy="120" rx="90" ry="26" fill="#FFFFFF" />
                <ellipse cx="1020" cy="240" rx="70" ry="22" fill="#FFFFFF" />
            </g>

            {/* Floating math symbols at low opacity (theme cue) */}
            <g fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" opacity="0.10">
                <text x="320" y="380" fontSize="80" fill="#FF6B6B">+</text>
                <text x="940" y="450" fontSize="72" fill="#7ED957">−</text>
                <text x="640" y="620" fontSize="70" fill="#A855F7">=</text>
                <text x="1180" y="720" fontSize="64" fill="#55DDE0">×</text>
            </g>

            {/* Hills at the bottom */}
            <path d="M0,720 Q300,680 720,710 T1440,700 L1440,900 L0,900 Z" fill="#A6E89A" />
            <path d="M0,800 Q300,760 720,790 T1440,780 L1440,900 L0,900 Z" fill="#7ED957" />
        </svg>
    </>
);
