/**
 * TracingBackground — Draw in the Air 2.0 skin.
 *
 * Calm sky-and-cream "practice paper" backdrop in the 2.0 palette: soft
 * dotted grid surface, faint lavender dotted-line strokes (the tracing
 * motif), and a couple of gentle pencil silhouettes. Pure presentation;
 * the gameplay tracing path is still drawn on the canvas — only the
 * backdrop changed.
 */

export const TracingBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #EEF6FF 0%, #F4EFFF 52%, #FBF7EE 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 560px at 18% 16%, rgba(255, 200, 61, 0.28) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <defs>
                <pattern id="tracingGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1.5" fill="#B69BFF" opacity="0.4" />
                </pattern>
            </defs>

            {/* Soft sun upper-left */}
            <circle cx="220" cy="155" r="56" fill="#FFD972" opacity="0.85" />

            {/* Soft clouds */}
            <g opacity="0.72">
                <ellipse cx="540" cy="180" rx="80" ry="22" fill="#FFFFFF" />
                <ellipse cx="900" cy="140" rx="100" ry="28" fill="#FFFFFF" />
                <ellipse cx="1240" cy="220" rx="70" ry="20" fill="#FFFFFF" />
            </g>

            {/* Gentle pencil silhouettes in 2.0 colours */}
            <g opacity="0.5">
                <g transform="translate(380,300) rotate(-18)">
                    <rect x="-50" y="-7" width="80" height="14" fill="#FFC83D" rx="2" />
                    <polygon points="30,-7 30,7 50,0" fill="#E8D2A8" />
                    <polygon points="46,-2 46,2 50,0" fill="#3A3450" />
                    <rect x="-58" y="-7" width="10" height="14" fill="#FF9B7E" rx="2" />
                    <rect x="-50" y="-7" width="3" height="14" fill="#C5C0D1" />
                </g>
                <g transform="translate(1080,400) rotate(12)">
                    <rect x="-40" y="-6" width="64" height="12" fill="#5BCE9A" rx="2" />
                    <polygon points="24,-6 24,6 42,0" fill="#E8D2A8" />
                    <polygon points="38,-2 38,2 42,0" fill="#3A3450" />
                    <rect x="-46" y="-6" width="8" height="12" fill="#7BB6FF" rx="2" />
                </g>
            </g>

            {/* Faint dotted-line strokes (tracing motif) in lavender */}
            <g stroke="#9D7DFF" strokeWidth="4" strokeLinecap="round" opacity="0.22"
               strokeDasharray="2,12" fill="none">
                <path d="M 200 480 Q 300 420 420 480 T 620 460" />
                <path d="M 800 540 Q 900 480 1020 540 T 1220 520" />
            </g>

            {/* Dotted "writing surface" at the bottom */}
            <rect x="0" y="640" width="1440" height="260" fill="url(#tracingGrid)" />

            {/* Soft mint meadow under the surface */}
            <path d="M0,742 Q300,706 720,732 T1440,724 L1440,900 L0,900 Z" fill="#BFE8C4" opacity="0.9" />
            <path d="M0,810 Q300,778 720,800 T1440,792 L1440,900 L0,900 Z" fill="#A7DDB0" />
        </svg>
    </>
);
