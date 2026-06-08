/**
 * SpellingStarsBackground — Draw in the Air 2.0 skin.
 *
 * Calm lavender-cream sky with soft floating stars and faint letter
 * silhouettes in the 2.0 palette. Pure presentation; the gameplay letters
 * are still drawn on the canvas — only the backdrop changed.
 */

export const SpellingStarsBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #F4EFFF 0%, #EEF6FF 48%, #FBF7EE 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 600px at 50% 18%, rgba(255, 200, 61, 0.24) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Soft clouds */}
            <g opacity="0.72">
                <ellipse cx="220" cy="160" rx="85" ry="24" fill="#FFFFFF" />
                <ellipse cx="780" cy="130" rx="100" ry="28" fill="#FFFFFF" />
                <ellipse cx="1180" cy="200" rx="80" ry="22" fill="#FFFFFF" />
            </g>

            {/* Floating soft stars in the 2.0 palette */}
            <g opacity="0.3">
                {[
                    { x: 180, y: 280, s: 1, c: '#FFC83D' },
                    { x: 380, y: 380, s: 0.7, c: '#FF9B7E' },
                    { x: 620, y: 320, s: 0.85, c: '#7BB6FF' },
                    { x: 920, y: 400, s: 0.75, c: '#5BCE9A' },
                    { x: 1180, y: 350, s: 0.9, c: '#9D7DFF' },
                    { x: 1320, y: 480, s: 0.7, c: '#FF9B7E' },
                ].map((s, i) => (
                    <polygon key={i}
                        transform={`translate(${s.x},${s.y}) scale(${s.s})`}
                        points="0,-30 8,-10 30,-8 14,8 18,30 0,18 -18,30 -14,8 -30,-8 -8,-10"
                        fill={s.c} />
                ))}
            </g>

            {/* Faint letter silhouettes */}
            <g fontFamily="Outfit, system-ui, sans-serif" fontWeight="800" opacity="0.09">
                <text x="280" y="220" fontSize="76" fill="#9D7DFF">A</text>
                <text x="540" y="180" fontSize="64" fill="#FF9B7E">b</text>
                <text x="820" y="240" fontSize="80" fill="#5BCE9A">c</text>
                <text x="1080" y="220" fontSize="68" fill="#7BB6FF">d</text>
            </g>

            {/* Sparkle dots */}
            <g fill="#FFFFFF" opacity="0.85">
                <circle cx="320" cy="450" r="2.5" />
                <circle cx="700" cy="500" r="2" />
                <circle cx="1020" cy="520" r="2.5" />
                <circle cx="1240" cy="460" r="2" />
            </g>

            {/* Soft mint meadow */}
            <path d="M0,742 Q300,706 720,732 T1440,724 L1440,900 L0,900 Z" fill="#BFE8C4" />
            <path d="M0,810 Q300,778 720,800 T1440,792 L1440,900 L0,900 Z" fill="#A7DDB0" />
        </svg>
    </>
);
