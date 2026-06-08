/**
 * RainbowBridgeBackground — Draw in the Air 2.0 skin.
 *
 * Calm cream-and-sky backdrop with a soft sun glow and a gentle rainbow
 * arc in the 2.0 palette. Pure presentation; the gameplay-relevant rainbow
 * stones are still drawn on the canvas — only the backdrop changed.
 */

const RB_ARC = ['#FF9B7E', '#FFC83D', '#5BCE9A', '#7BB6FF', '#9D7DFF'];

export const RainbowBridgeBackground = () => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'linear-gradient(180deg, #EEF6FF 0%, #F4EFFF 55%, #FBF7EE 100%)',
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: 'radial-gradient(circle 700px at 50% 22%, rgba(255, 200, 61, 0.26) 0%, transparent 70%)',
        }} />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Twin soft clouds at the rainbow's ends */}
            <g opacity="0.8">
                <ellipse cx="220" cy="640" rx="120" ry="36" fill="#FFFFFF" />
                <ellipse cx="170" cy="630" rx="60" ry="22" fill="#FFFFFF" />
                <ellipse cx="270" cy="625" rx="70" ry="24" fill="#FFFFFF" />
                <ellipse cx="1220" cy="640" rx="120" ry="36" fill="#FFFFFF" />
                <ellipse cx="1170" cy="625" rx="70" ry="24" fill="#FFFFFF" />
                <ellipse cx="1280" cy="630" rx="60" ry="22" fill="#FFFFFF" />
            </g>
            {/* Soft rainbow centrepiece in the 2.0 palette */}
            <g opacity="0.32" transform="translate(720,640)">
                {RB_ARC.map((c, i) => {
                    const r = 480 - i * 32;
                    return <path key={c} d={`M ${-r},0 A ${r},${r} 0 0 1 ${r},0`} fill="none" stroke={c} strokeWidth="26" />;
                })}
            </g>
            {/* High sky clouds */}
            <g opacity="0.75">
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
            {/* Soft mint meadow */}
            <path d="M0,772 Q300,736 720,762 T1440,754 L1440,900 L0,900 Z" fill="#BFE8C4" />
            <path d="M0,828 Q300,792 720,818 T1440,810 L1440,900 L0,900 Z" fill="#A7DDB0" />
        </svg>
    </>
);
