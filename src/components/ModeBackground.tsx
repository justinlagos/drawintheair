/**
 * Mode Background Component — Hyper-Casual 3D Toy World
 *
 * Each mode has a DRAMATICALLY different background.
 * No more subtle overlays — bold, saturated, unmistakable.
 *
 * - Bubble Pop: Layered gradient sunrise (warm peach → coral → deep blue)
 * - Sort & Place: Warm playroom (peach → warm brown tones)
 * - Free Paint: Deep navy art studio gradient
 * - Tracing: Dark blue cave with central spotlight
 * - Word Search: Warm wood-tone classroom
 */


type ModeId = 'free' | 'calibration' | 'sort-and-place' | 'pre-writing' | 'word-search';

interface ModeBackgroundProps {
    modeId: ModeId;
}

/**
 * Bubble Pop — Layered sunrise gradient
 * Peach-coral top, warm horizon, deep navy bottom
 */
const BubblePopBG = () => (
    <>
        {/* Base sky gradient */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #1B274F 0%, #2E3C6E 20%, #5E4B8A 40%, #D4717E 65%, #F4A983 82%, #FFD4A8 100%)',
            zIndex: 0,
        }} />
        {/* Soft radial glow at horizon */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 120% 50% at 50% 75%, rgba(255, 180, 120, 0.35) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Subtle cloud-like soft shapes */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(ellipse 300px 100px at 20% 30%, rgba(255,255,255,0.06) 0%, transparent 70%),
                radial-gradient(ellipse 400px 120px at 70% 25%, rgba(255,255,255,0.05) 0%, transparent 70%),
                radial-gradient(ellipse 250px 80px at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)
            `,
            zIndex: 0,
        }} />
        {/* Vignette */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15, 10, 30, 0.4) 100%)',
            zIndex: 0,
        }} />
    </>
);

/**
 * Sort & Place — Warm playroom / toy workshop
 * Warm wood tones, soft amber light from above
 */
const SortAndPlaceBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(170deg, #3D2B1F 0%, #5C3D2E 25%, #7A5C3E 50%, #6B4830 75%, #3D2B1F 100%)',
            zIndex: 0,
        }} />
        {/* Warm overhead light */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 50% at 50% 10%, rgba(255, 200, 120, 0.20) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Soft floor reflection */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 100% 40% at 50% 95%, rgba(255, 220, 160, 0.12) 0%, transparent 60%)',
            zIndex: 0,
        }} />
        {/* Subtle wood grain texture (CSS pattern) */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `repeating-linear-gradient(
                90deg,
                rgba(255,255,255,0.01) 0px,
                rgba(255,255,255,0.01) 2px,
                transparent 2px,
                transparent 30px
            )`,
            zIndex: 0,
            opacity: 0.5,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(20, 10, 5, 0.5) 100%)',
            zIndex: 0,
        }} />
    </>
);

/**
 * Free Paint — Deep navy art studio
 * Like a cozy art room with dramatic lighting
 */
const FreePaintBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(160deg, #0A0E27 0%, #141B3D 30%, #1A2555 55%, #0F1430 80%, #080B1E 100%)',
            zIndex: 0,
        }} />
        {/* Warm studio spotlight from upper-left */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(147, 100, 255, 0.12) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Secondary warm glow from right */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 50% 40% at 75% 60%, rgba(255, 100, 150, 0.08) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Soft colored ambient particles effect */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(circle 4px at 15% 25%, rgba(255, 0, 110, 0.15) 0%, transparent 100%),
                radial-gradient(circle 3px at 80% 15%, rgba(58, 134, 255, 0.15) 0%, transparent 100%),
                radial-gradient(circle 5px at 60% 75%, rgba(131, 56, 236, 0.12) 0%, transparent 100%),
                radial-gradient(circle 3px at 25% 80%, rgba(255, 190, 11, 0.12) 0%, transparent 100%),
                radial-gradient(circle 4px at 90% 55%, rgba(0, 245, 212, 0.10) 0%, transparent 100%),
                radial-gradient(circle 3px at 45% 35%, rgba(255, 84, 0, 0.10) 0%, transparent 100%)
            `,
            zIndex: 0,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(5, 5, 15, 0.5) 100%)',
            zIndex: 0,
        }} />
    </>
);

/**
 * Tracing — Dark blue cave with central spotlight
 * Magical, mysterious, focused on the path
 */
const TracingBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #050A1A 0%, #0B1628 25%, #0D1F3C 50%, #091428 75%, #040810 100%)',
            zIndex: 0,
        }} />
        {/* Central spotlight — draws attention to tracing area */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(30, 80, 160, 0.18) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Neon ambient glow */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(ellipse 40% 30% at 20% 40%, rgba(255, 140, 50, 0.06) 0%, transparent 70%),
                radial-gradient(ellipse 40% 30% at 80% 60%, rgba(0, 150, 255, 0.06) 0%, transparent 70%)
            `,
            zIndex: 0,
        }} />
        {/* Subtle star-like dots */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(circle 1.5px at 10% 15%, rgba(255,255,255,0.15) 0%, transparent 100%),
                radial-gradient(circle 1px at 30% 8%, rgba(255,255,255,0.10) 0%, transparent 100%),
                radial-gradient(circle 1.5px at 55% 12%, rgba(255,255,255,0.12) 0%, transparent 100%),
                radial-gradient(circle 1px at 75% 20%, rgba(255,255,255,0.08) 0%, transparent 100%),
                radial-gradient(circle 1.5px at 90% 10%, rgba(255,255,255,0.10) 0%, transparent 100%),
                radial-gradient(circle 1px at 85% 35%, rgba(255,255,255,0.06) 0%, transparent 100%),
                radial-gradient(circle 1px at 15% 45%, rgba(255,255,255,0.06) 0%, transparent 100%)
            `,
            zIndex: 0,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2, 4, 10, 0.6) 100%)',
            zIndex: 0,
        }} />
    </>
);

/**
 * Word Search — Warm classroom / wooden board world
 * Like a cozy schoolroom with wooden shelves
 */
const WordSearchBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(160deg, #1a1a3e 0%, #2d2563 30%, #3a2e5e 50%, #2a2050 75%, #1a1a3e 100%)',
            zIndex: 0,
        }} />
        {/* Warm overhead classroom light */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 40% at 50% 15%, rgba(255, 220, 150, 0.10) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Soft ambient */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(78, 205, 196, 0.06) 0%, transparent 60%)',
            zIndex: 0,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(10, 10, 25, 0.5) 100%)',
            zIndex: 0,
        }} />
    </>
);

export const ModeBackground = ({ modeId }: ModeBackgroundProps) => {
    return (
        <>
            {modeId === 'calibration' && <BubblePopBG />}
            {modeId === 'sort-and-place' && <SortAndPlaceBG />}
            {modeId === 'free' && <FreePaintBG />}
            {modeId === 'pre-writing' && <TracingBG />}
            {modeId === 'word-search' && <WordSearchBG />}
        </>
    );
};
