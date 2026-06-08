/**
 * Mode Background — Draw in the Air 2.0 skin.
 *
 * The calm, premium 2.0 backdrop behind each game canvas. Several modes
 * also paint a richer themed scene of their own (TracingBackground,
 * BalloonMathBackground, etc.); this provides the 2.0 fallback "sky" so
 * the page never flashes an off-palette background during mount/route
 * transitions, and is the primary backdrop for modes without their own
 * scene component. Backgrounds taken from the 2.0 prototype (games2.css).
 *
 * Pure presentation — no gameplay, tracking, or logic.
 */


type ModeId = 'free' | 'calibration' | 'sort-and-place' | 'pre-writing' | 'word-search' | 'colour-builder' | 'balloon-math' | 'rainbow-bridge' | 'gesture-spelling' | 'building';

interface ModeBackgroundProps {
    modeId: ModeId;
}

const fill = (background: string): React.CSSProperties => ({
    position: 'fixed', inset: 0, zIndex: 0, background,
});

/** Bubble Pop — cool 2.0 sky → mint wash. */
const BubblePopBG = () => (
    <>
        <div style={fill('linear-gradient(180deg, #DCEEFF 0%, #EAF7FF 55%, #DFF4E6 100%)')} />
        <div style={fill('radial-gradient(circle 560px at 20% 16%, rgba(255, 200, 61, 0.26) 0%, transparent 70%)')} />
    </>
);

/** Free Paint — soft cream studio so strokes show vividly. */
const FreePaintBG = () => (
    <>
        <div style={fill('radial-gradient(ellipse 900px 600px at 50% 40%, #FFFDF7 0%, #FBF3E6 100%)')} />
        <div style={fill('radial-gradient(ellipse 60% 50% at 18% 18%, rgba(157, 125, 255, 0.10) 0%, transparent 70%)')} />
        <div style={fill('radial-gradient(ellipse 50% 40% at 82% 78%, rgba(255, 155, 126, 0.09) 0%, transparent 70%)')} />
    </>
);

/** Tracing — 2.0 sky-and-cream fallback (TracingBackground draws the richer scene). */
const TracingBG = () => (
    <div style={fill('linear-gradient(180deg, #EEF6FF 0%, #F4EFFF 52%, #FBF7EE 100%)')} />
);

/** Word Search — 2.0 mint-cream fallback. */
const WordSearchBG = () => (
    <div style={fill('linear-gradient(165deg, #ECFBF3 0%, #F3FBF4 60%, #FBF7EE 100%)')} />
);

/** Sort & Place — warm 2.0 market-stall fallback. */
const SortAndPlaceBG = () => (
    <div style={fill('linear-gradient(180deg, #FFF6E8 0%, #FFF0DC 60%, #F3E4C8 100%)')} />
);

export const ModeBackground = ({ modeId }: ModeBackgroundProps) => {
    return (
        <>
            {modeId === 'calibration' && <BubblePopBG />}
            {modeId === 'sort-and-place' && <SortAndPlaceBG />}
            {modeId === 'free' && <FreePaintBG />}
            {modeId === 'pre-writing' && <TracingBG />}
            {modeId === 'word-search' && <WordSearchBG />}
            {/* Building reuses the warm Free-Paint backdrop in Phase 0. */}
            {modeId === 'building' && <FreePaintBG />}
        </>
    );
};
