/**
 * BalloonMathBackground — Draw in the Air 2.0 skin.
 *
 * Calm, premium 2.0 look: cool-cream sky gradient, a soft sun glow, a
 * gentle mint meadow band, and a few low-opacity decorative balloons in
 * the 2.0 palette. Pure SVG/CSS, zero per-frame work. Sits behind the
 * gameplay layer. The gameplay-relevant numbered balloons are still drawn
 * on the canvas by balloonMathLogic — only the backdrop changed.
 */

export const BalloonMathBackground = () => (
    <>
        {/* 2.0 sky → meadow gradient */}
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #EAF4FF 0%, #F3FBF4 62%, #DDF3E2 100%)',
        }} />
        {/* Soft sun glow, top-right */}
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 520px at 80% 16%, rgba(255, 200, 61, 0.30) 0%, transparent 68%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Sun */}
            <circle cx="1180" cy="150" r="58" fill="#FFD972" opacity="0.9" />
            <circle cx="1180" cy="150" r="58" fill="none" stroke="#FFC83D" strokeWidth="2" opacity="0.5" />

            {/* Decorative balloons in the 2.0 palette, low opacity */}
            {[
                { x: 90, y: 300, c: '#9D7DFF', s: 1 },
                { x: 1330, y: 340, c: '#5BCE9A', s: 0.85 },
                { x: 230, y: 540, c: '#FF9B7E', s: 0.7 },
                { x: 1280, y: 600, c: '#7BB6FF', s: 0.9 },
                { x: 70, y: 720, c: '#FFC83D', s: 0.72 },
            ].map((b, i) => (
                <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.s})`} opacity="0.45">
                    <path d="M 0 0 C -22 0 -32 24 -32 38 C -32 56 -18 66 0 68 C 18 66 32 56 32 38 C 32 24 22 0 0 0 Z"
                          fill={b.c} />
                    <ellipse cx="-10" cy="20" rx="8" ry="11" fill="#FFFFFF" opacity="0.5"
                             transform="rotate(-22)" />
                    <polygon points="-4,68 0,62 4,68 2,74 -2,74" fill={b.c} />
                    <path d="M 0 74 Q -2 110 2 140" fill="none" stroke="#6B6580" strokeWidth="1.4" />
                </g>
            ))}

            {/* Soft white clouds */}
            <g opacity="0.7">
                <ellipse cx="220" cy="150" rx="80" ry="22" fill="#FFFFFF" />
                <ellipse cx="260" cy="135" rx="50" ry="18" fill="#FFFFFF" />
                <ellipse cx="800" cy="120" rx="90" ry="26" fill="#FFFFFF" />
                <ellipse cx="1020" cy="240" rx="70" ry="22" fill="#FFFFFF" />
            </g>

            {/* Faint math symbols (theme cue) in 2.0 colours */}
            <g fontFamily="Outfit, system-ui, sans-serif" fontWeight="800" opacity="0.08">
                <text x="320" y="380" fontSize="80" fill="#9D7DFF">+</text>
                <text x="940" y="450" fontSize="72" fill="#5BCE9A">−</text>
                <text x="640" y="620" fontSize="70" fill="#7BB6FF">=</text>
                <text x="1180" y="720" fontSize="64" fill="#FF9B7E">×</text>
            </g>

            {/* Soft mint meadow band */}
            <path d="M0,742 Q300,706 720,732 T1440,724 L1440,900 L0,900 Z" fill="#BFE8C4" />
            <path d="M0,810 Q300,778 720,800 T1440,792 L1440,900 L0,900 Z" fill="#A7DDB0" />
        </svg>
    </>
);
