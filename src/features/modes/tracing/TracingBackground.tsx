/**
 * TracingBackground — Bright sky with a paper-and-pencil practice theme.
 *
 * Theme cues: dotted grid paper at the bottom, soft pencil silhouettes
 * floating in the sky, hills + sun. Reinforces "writing practice" without
 * competing with the gameplay-relevant tracing path drawn on the canvas.
 */

export const TracingBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #BEEBFF 0%, #E5F4FF 50%, #FFFAEB 90%, #FFF6E5 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 600px at 18% 18%, rgba(255, 216, 77, 0.40) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <defs>
                {/* Paper-grid pattern at the bottom — the "writing surface" */}
                <pattern id="tracingGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1.5" fill="#A8B8D0" opacity="0.5" />
                </pattern>
            </defs>

            {/* Sun upper-left */}
            <circle cx="220" cy="160" r="62" fill="#FFD84D" opacity="0.9" />

            {/* Soft clouds */}
            <g opacity="0.85">
                <ellipse cx="540" cy="180" rx="80" ry="22" fill="#FFFFFF" />
                <ellipse cx="900" cy="140" rx="100" ry="28" fill="#FFFFFF" />
                <ellipse cx="1240" cy="220" rx="70" ry="20" fill="#FFFFFF" />
            </g>

            {/* Floating pencils — theme cue, not gameplay */}
            <g opacity="0.55">
                <g transform="translate(380,300) rotate(-18)">
                    {/* Pencil body */}
                    <rect x="-50" y="-7" width="80" height="14" fill="#FFD84D" rx="2" />
                    {/* Wood tip */}
                    <polygon points="30,-7 30,7 50,0" fill="#E8D2A8" />
                    {/* Lead tip */}
                    <polygon points="46,-2 46,2 50,0" fill="#3F4052" />
                    {/* Eraser */}
                    <rect x="-58" y="-7" width="10" height="14" fill="#FF6B9D" rx="2" />
                    <rect x="-50" y="-7" width="3" height="14" fill="#A8A8B8" />
                </g>
                <g transform="translate(1080,400) rotate(12)">
                    <rect x="-40" y="-6" width="64" height="12" fill="#7ED957" rx="2" />
                    <polygon points="24,-6 24,6 42,0" fill="#E8D2A8" />
                    <polygon points="38,-2 38,2 42,0" fill="#3F4052" />
                    <rect x="-46" y="-6" width="8" height="12" fill="#55DDE0" rx="2" />
                </g>
            </g>

            {/* Floating dotted-line strokes (tracing motif) */}
            <g stroke="#A855F7" strokeWidth="4" strokeLinecap="round" opacity="0.22"
               strokeDasharray="2,12" fill="none">
                <path d="M 200 480 Q 300 420 420 480 T 620 460" />
                <path d="M 800 540 Q 900 480 1020 540 T 1220 520" />
            </g>

            {/* Paper grid at the bottom — "writing surface" */}
            <rect x="0" y="640" width="1440" height="260" fill="url(#tracingGrid)" />

            {/* Hills under the paper grid */}
            <path d="M0,720 Q300,680 720,710 T1440,700 L1440,900 L0,900 Z" fill="#A6E89A" opacity="0.85" />
            <path d="M0,800 Q300,760 720,790 T1440,780 L1440,900 L0,900 Z" fill="#7ED957" opacity="0.92" />
        </svg>
    </>
);
