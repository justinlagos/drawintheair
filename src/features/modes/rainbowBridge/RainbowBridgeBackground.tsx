/**
 * RainbowBridgeBackground — Bright sky with a prominent rainbow centrepiece.
 *
 * The big arc reinforces the "build the rainbow" theme without competing
 * with the gameplay-relevant rainbow stones drawn on the canvas.
 */

export const RainbowBridgeBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #9FDFFF 0%, #BEEBFF 30%, #DEF5FF 65%, #F4FAFF 90%, #FFF6E5 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 700px at 50% 25%, rgba(255, 216, 77, 0.32) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Twin clouds at the rainbow's ends */}
            <g>
                <ellipse cx="220" cy="640" rx="120" ry="36" fill="#FFFFFF" />
                <ellipse cx="170" cy="630" rx="60" ry="22" fill="#FFFFFF" />
                <ellipse cx="270" cy="625" rx="70" ry="24" fill="#FFFFFF" />
                <ellipse cx="1220" cy="640" rx="120" ry="36" fill="#FFFFFF" />
                <ellipse cx="1170" cy="625" rx="70" ry="24" fill="#FFFFFF" />
                <ellipse cx="1280" cy="630" rx="60" ry="22" fill="#FFFFFF" />
            </g>
            {/* Big rainbow centrepiece — softer than the colours-stage version */}
            <g opacity="0.4" transform="translate(720,640)">
                <path d="M -480,0 A 480,480 0 0 1 480,0" fill="none" stroke="#FF6B6B" strokeWidth="28" />
                <path d="M -448,0 A 448,448 0 0 1 448,0" fill="none" stroke="#FFB14D" strokeWidth="28" />
                <path d="M -416,0 A 416,416 0 0 1 416,0" fill="none" stroke="#FFD84D" strokeWidth="28" />
                <path d="M -384,0 A 384,384 0 0 1 384,0" fill="none" stroke="#7ED957" strokeWidth="28" />
                <path d="M -352,0 A 352,352 0 0 1 352,0" fill="none" stroke="#55DDE0" strokeWidth="28" />
                <path d="M -320,0 A 320,320 0 0 1 320,0" fill="none" stroke="#6C3FA4" strokeWidth="28" />
            </g>
            {/* Soft sky clouds */}
            <g opacity="0.85">
                <ellipse cx="380" cy="160" rx="80" ry="22" fill="#FFFFFF" />
                <ellipse cx="1080" cy="200" rx="90" ry="26" fill="#FFFFFF" />
            </g>
            {/* Sparkle dots */}
            <g fill="#FFFFFF" opacity="0.85">
                <circle cx="280" cy="320" r="2.5" />
                <circle cx="640" cy="280" r="2" />
                <circle cx="900" cy="350" r="2.5" />
                <circle cx="1180" cy="400" r="2" />
            </g>
            {/* Hills at the bottom */}
            <path d="M0,760 Q300,720 720,750 T1440,740 L1440,900 L0,900 Z" fill="#A6E89A" />
            <path d="M0,820 Q300,780 720,810 T1440,800 L1440,900 L0,900 Z" fill="#7ED957" />
        </svg>
    </>
);
