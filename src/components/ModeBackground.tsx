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


type ModeId = 'free' | 'calibration' | 'sort-and-place' | 'pre-writing' | 'word-search' | 'colour-builder' | 'balloon-math' | 'rainbow-bridge' | 'gesture-spelling';

interface ModeBackgroundProps {
    modeId: ModeId;
}

/**
 * Bubble Pop — Bright morning sky.
 *
 * The chapter-specific parallax backgrounds are drawn on the game canvas
 * by renderLandscape.ts; this is the fallback "sky" behind that canvas.
 * Matches the Kid-UI bright-sky design language.
 */
const BubblePopBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #9FDFFF 0%, #BEEBFF 35%, #DEF5FF 70%, #FFF6E5 100%)',
            zIndex: 0,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle 600px at 20% 18%, rgba(255, 216, 77, 0.40) 0%, rgba(255, 216, 77, 0.15) 35%, transparent 70%)',
            zIndex: 0,
        }} />
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(ellipse 280px 88px at 22% 28%, rgba(255,255,255,0.55) 0%, transparent 70%),
                radial-gradient(ellipse 360px 110px at 72% 22%, rgba(255,255,255,0.5) 0%, transparent 70%),
                radial-gradient(ellipse 220px 70px at 50% 38%, rgba(255,255,255,0.4) 0%, transparent 70%)
            `,
            zIndex: 0,
        }} />
    </>
);

/**
 * Free Paint — Bright art studio sky.
 *
 * Soft cream paper background so kids' strokes show vividly. Gentle
 * lavender corner glows hint at "creative space" without competing with
 * the user's drawing.
 */
const FreePaintBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #FFF6E5 0%, #FFFAEB 50%, #FFF6E5 100%)',
            zIndex: 0,
        }} />
        {/* Lavender corner glow upper-left */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 18% 18%, rgba(168, 85, 247, 0.10) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Coral corner glow lower-right */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse 50% 40% at 82% 78%, rgba(255, 107, 157, 0.08) 0%, transparent 70%)',
            zIndex: 0,
        }} />
        {/* Subtle paint-splatter sparkle dots */}
        <div style={{
            position: 'fixed',
            inset: 0,
            background: `
                radial-gradient(circle 4px at 15% 25%, rgba(255, 107, 107, 0.18) 0%, transparent 100%),
                radial-gradient(circle 3px at 80% 15%, rgba(85, 221, 224, 0.18) 0%, transparent 100%),
                radial-gradient(circle 5px at 60% 75%, rgba(126, 217, 87, 0.14) 0%, transparent 100%),
                radial-gradient(circle 3px at 25% 80%, rgba(255, 216, 77, 0.14) 0%, transparent 100%),
                radial-gradient(circle 4px at 90% 55%, rgba(108, 63, 164, 0.12) 0%, transparent 100%)
            `,
            zIndex: 0,
        }} />
    </>
);

/**
 * Tracing — Bright sky-and-paper fallback.
 *
 * The richer scene (with pencils, paper grid, hills) is rendered inside
 * the mode by TracingBackground.tsx. This fallback covers any gap during
 * mount/route transitions so the page never shows a dark body.
 */
const TracingBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #BEEBFF 0%, #E5F4FF 50%, #FFFAEB 100%)',
            zIndex: 0,
        }} />
    </>
);

/**
 * Word Search — Bright classroom-sky fallback.
 *
 * The chapter-themed background gradient is set inside WordSearchMode
 * (per CHAPTER_ENVIRONMENTS). This fallback keeps the body bright if the
 * mode is mid-mount or transitions are happening.
 */
const WordSearchBG = () => (
    <>
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'linear-gradient(180deg, #BEEBFF 0%, #DEF5FF 60%, #FFFAEB 100%)',
            zIndex: 0,
        }} />
    </>
);

export const ModeBackground = ({ modeId }: ModeBackgroundProps) => {
    return (
        <>
            {modeId === 'calibration' && <BubblePopBG />}
            {/* Sort & Place renders its own per-stage themed background
                inside SortAndPlaceMode — see SortAndPlaceBackground.tsx */}
            {modeId === 'free' && <FreePaintBG />}
            {modeId === 'pre-writing' && <TracingBG />}
            {modeId === 'word-search' && <WordSearchBG />}
        </>
    );
};
