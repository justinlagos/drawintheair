/**
 * SpellingStarsBackground — Bright sky with floating stars + letters.
 *
 * Theme reflects the mode name "Spelling Stars" — sparkles + soft letter
 * silhouettes drifting in the background.
 */

export const SpellingStarsBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #C9E5FF 0%, #DEF5FF 45%, #FFF6E5 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 600px at 50% 20%, rgba(255, 216, 77, 0.30) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Soft clouds */}
            <g opacity="0.85">
                <ellipse cx="220" cy="160" rx="85" ry="24" fill="#FFFFFF" />
                <ellipse cx="780" cy="130" rx="100" ry="28" fill="#FFFFFF" />
                <ellipse cx="1180" cy="200" rx="80" ry="22" fill="#FFFFFF" />
            </g>

            {/* Floating soft star silhouettes — distinct, magical */}
            <g opacity="0.32">
                {[
                    { x: 180, y: 280, s: 1, c: '#FFD84D' },
                    { x: 380, y: 380, s: 0.7, c: '#FF6B6B' },
                    { x: 620, y: 320, s: 0.85, c: '#55DDE0' },
                    { x: 920, y: 400, s: 0.75, c: '#7ED957' },
                    { x: 1180, y: 350, s: 0.9, c: '#A855F7' },
                    { x: 1320, y: 480, s: 0.7, c: '#FF6B9D' },
                ].map((s, i) => (
                    <polygon key={i}
                        transform={`translate(${s.x},${s.y}) scale(${s.s})`}
                        points="0,-30 8,-10 30,-8 14,8 18,30 0,18 -18,30 -14,8 -30,-8 -8,-10"
                        fill={s.c} />
                ))}
            </g>

            {/* Faint letter silhouettes drifting in the sky */}
            <g fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" opacity="0.10">
                <text x="280" y="220" fontSize="76" fill="#6C3FA4">A</text>
                <text x="540" y="180" fontSize="64" fill="#FF6B6B">b</text>
                <text x="820" y="240" fontSize="80" fill="#7ED957">c</text>
                <text x="1080" y="220" fontSize="68" fill="#55DDE0">d</text>
            </g>

            {/* Sparkle dots */}
            <g fill="#FFFFFF" opacity="0.85">
                <circle cx="320" cy="450" r="2.5" />
                <circle cx="700" cy="500" r="2" />
                <circle cx="1020" cy="520" r="2.5" />
                <circle cx="1240" cy="460" r="2" />
            </g>

            {/* Hills at the bottom */}
            <path d="M0,720 Q300,680 720,710 T1440,700 L1440,900 L0,900 Z" fill="#A6E89A" />
            <path d="M0,800 Q300,760 720,790 T1440,780 L1440,900 L0,900 Z" fill="#7ED957" />
        </svg>
    </>
);
