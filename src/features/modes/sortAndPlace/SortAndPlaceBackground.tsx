/**
 * SortAndPlaceBackground — Per-stage themed scene.
 *
 * Each Sort & Place stage gets its own scene set, sharing the same
 * kid-bright design language but distinctly themed so kids feel they're
 * "moving" through different worlds as they progress.
 *
 * All scenes:
 *   - Pure SVG / CSS, zero per-frame work
 *   - Sit behind the gameplay layer (zIndex 0)
 *   - position: fixed; inset: 0
 *   - Use the design system palette via inline values (so the background
 *     also works during early load before tokens.ts CSS injects)
 */

interface Props {
    stageId: string;
}

// Common scaffolding — sky gradient + sun glow shared by every scene
const SkyBase = ({ from, mid, to, sunX = '78%', sunColor = 'rgba(255, 216, 77, 0.45)' }: {
    from: string; mid: string; to: string; sunX?: string; sunColor?: string;
}) => (
    <>
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: `linear-gradient(180deg, ${from} 0%, ${mid} 55%, ${to} 100%)`,
        }} />
        <div style={{
            position: 'fixed', inset: 0, zIndex: 0,
            background: `radial-gradient(circle 600px at ${sunX} 18%, ${sunColor} 0%, ${sunColor.replace(/[\d.]+\)$/, '0.18)')} 35%, transparent 70%)`,
        }} />
    </>
);

// ─── 1. Colours: Rainbow meadow ────────────────────────────────────────
const ColoursScene = () => (
    <>
        <SkyBase from="#9FDFFF" mid="#DEF5FF" to="#FFF6E5" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <g transform="translate(1180,140)">
                <circle r="78" fill="#FFD84D" />
                <g stroke="#FFD84D" strokeWidth="6" strokeLinecap="round" opacity="0.7">
                    <line x1="0" y1="-105" x2="0" y2="-130" />
                    <line x1="74" y1="-74" x2="92" y2="-92" />
                    <line x1="105" y1="0" x2="130" y2="0" />
                    <line x1="74" y1="74" x2="92" y2="92" />
                    <line x1="-74" y1="74" x2="-92" y2="92" />
                    <line x1="-105" y1="0" x2="-130" y2="0" />
                    <line x1="-74" y1="-74" x2="-92" y2="-92" />
                </g>
            </g>
            {/* Big rainbow arc — celebrates the colour theme */}
            <g opacity="0.5" transform="translate(720,720)">
                <path d="M -380,0 A 380,380 0 0 1 380,0" fill="none" stroke="#FF6B6B" strokeWidth="22" />
                <path d="M -355,0 A 355,355 0 0 1 355,0" fill="none" stroke="#FFB14D" strokeWidth="22" />
                <path d="M -330,0 A 330,330 0 0 1 330,0" fill="none" stroke="#FFD84D" strokeWidth="22" />
                <path d="M -305,0 A 305,305 0 0 1 305,0" fill="none" stroke="#7ED957" strokeWidth="22" />
                <path d="M -280,0 A 280,280 0 0 1 280,0" fill="none" stroke="#55DDE0" strokeWidth="22" />
                <path d="M -255,0 A 255,255 0 0 1 255,0" fill="none" stroke="#6C3FA4" strokeWidth="22" />
            </g>
            <g opacity="0.85">
                <ellipse cx="200" cy="160" rx="55" ry="18" fill="#FFFFFF" />
                <ellipse cx="540" cy="100" rx="65" ry="20" fill="#FFFFFF" />
                <ellipse cx="800" cy="130" rx="70" ry="22" fill="#FFFFFF" />
            </g>
        </svg>
        <Hills />
    </>
);

// ─── 2. Shapes: Geometric world ────────────────────────────────────────
const ShapesScene = () => (
    <>
        <SkyBase from="#C9E5FF" mid="#E8F4FF" to="#F4FAFF" sunX="20%" sunColor="rgba(168, 229, 255, 0.5)" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Translucent geometric primitives floating in the sky */}
            <g opacity="0.18">
                <circle cx="220" cy="200" r="60" fill="#FF6B6B" />
                <rect x="380" y="120" width="80" height="80" rx="14" fill="#FFD84D" transform="rotate(15 420 160)" />
                <polygon points="900,80 960,200 840,200" fill="#7ED957" />
                <polygon points="1180,180 1230,205 1230,260 1180,285 1130,260 1130,205" fill="#A855F7" />
                <path d="M 600 240 L 596 280 L 556 280 L 588 304 L 576 344 L 600 320 L 624 344 L 612 304 L 644 280 L 604 280 Z" fill="#55DDE0" />
                <ellipse cx="1300" cy="340" rx="60" ry="40" fill="#FF6B9D" />
                <path d="M 320 380 L 340 420 L 300 420 Z" fill="#6C3FA4" />
            </g>
            {/* Pattern dots — subtle background fabric */}
            <g fill="#A8D8FF" opacity="0.25">
                {Array.from({ length: 30 }).map((_, i) => {
                    const x = (i * 53) % 1440;
                    const y = 60 + ((i * 113) % 480);
                    return <circle key={i} cx={x} cy={y} r="3" />;
                })}
            </g>
        </svg>
        <Hills mood="light" />
    </>
);

// ─── 3. Food & Toys: Kitchen meets playroom ───────────────────────────
const FoodToysScene = () => (
    <>
        <SkyBase from="#FFE4D4" mid="#FFF4E0" to="#FFFAEB" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Soft sun */}
            <circle cx="1200" cy="160" r="68" fill="#FFD84D" opacity="0.85" />
            {/* Kitchen counter on the left */}
            <rect x="0" y="640" width="720" height="260" fill="#F2D5A5" />
            <rect x="0" y="640" width="720" height="22" fill="#E0BC83" />
            <rect x="0" y="660" width="720" height="6" fill="#FFFFFF" opacity="0.4" />
            {/* Counter wood plank lines */}
            {[100, 280, 460, 640].map((x, i) => (
                <rect key={i} x={x} y="700" width="2" height="180" fill="#C49765" opacity="0.55" />
            ))}
            {/* Apple on the counter */}
            <g transform="translate(80,610)">
                <circle r="22" fill="#E84545" />
                <rect x="-2" y="-22" width="4" height="8" fill="#6B4423" />
                <path d="M 2 -18 Q 18 -22 22 -14 Q 14 -10 4 -14 Z" fill="#5BB04A" />
            </g>
            {/* Toy box on the right */}
            <rect x="780" y="640" width="660" height="260" fill="#9B6B3F" />
            <rect x="780" y="640" width="660" height="22" fill="#7A4F1F" />
            {/* Wood grain stripes on toy box */}
            {[60, 120, 200, 280, 360, 440, 540].map((x, i) => (
                <rect key={i} x={780 + x} y="700" width="2" height="180" fill="#7A4F1F" opacity="0.4" />
            ))}
            {/* Block toys peeking out of the toy box */}
            <rect x="820" y="600" width="48" height="48" rx="8" fill="#FF6B6B" />
            <rect x="900" y="610" width="42" height="42" rx="6" fill="#55DDE0" />
            <circle cx="1010" cy="620" r="22" fill="#FFD84D" />
            <polygon points="1080,640 1110,580 1140,640" fill="#7ED957" />
            <rect x="1180" y="600" width="48" height="48" rx="10" fill="#A855F7" />
            <circle cx="1300" cy="618" r="24" fill="#FF6B9D" />
            <rect x="1370" y="610" width="40" height="40" rx="6" fill="#FFB14D" />
            {/* Window in the upper sky — kitchen vibe */}
            <rect x="60" y="80" width="240" height="180" rx="12" fill="rgba(255,255,255,0.45)"
                  stroke="#A8B0C0" strokeWidth="3" />
            <line x1="180" y1="80" x2="180" y2="260" stroke="#A8B0C0" strokeWidth="3" />
            <line x1="60" y1="170" x2="300" y2="170" stroke="#A8B0C0" strokeWidth="3" />
            {/* Toy mobile in the upper-right corner */}
            <line x1="1200" y1="280" x2="1200" y2="380" stroke="#7A4F1F" strokeWidth="3" />
            <line x1="1140" y1="380" x2="1260" y2="380" stroke="#7A4F1F" strokeWidth="3" />
            <circle cx="1140" cy="420" r="18" fill="#FF6B9D" />
            <polygon points="1260,420 1240,400 1280,400" fill="#FFD84D" />
            <line x1="1140" y1="400" x2="1140" y2="402" stroke="#7A4F1F" strokeWidth="2" />
            <line x1="1260" y1="400" x2="1260" y2="402" stroke="#7A4F1F" strokeWidth="2" />
        </svg>
    </>
);

// ─── 4. Animals & Vehicles: Savannah meets road ───────────────────────
const AnimalsVehiclesScene = () => (
    <>
        <SkyBase from="#FFD89C" mid="#FFE8C0" to="#E8F4D8" sunX="50%" sunColor="rgba(255, 184, 122, 0.5)" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Sun */}
            <circle cx="720" cy="180" r="70" fill="#FFD84D" />
            {/* LEFT side: savannah grass + acacia trees */}
            <path d="M0,720 Q200,680 400,710 T720,720 L720,900 L0,900 Z" fill="#D4C57A" />
            <path d="M0,780 Q160,760 320,775 T720,780 L720,900 L0,900 Z" fill="#B8AB66" />
            {/* Acacia trees on the savannah */}
            {[120, 280, 480].map((x, i) => (
                <g key={i} transform={`translate(${x},700)`}>
                    <rect x="-3" y="-30" width="6" height="60" fill="#7A5A3A" />
                    <ellipse cx="0" cy="-40" rx="40" ry="14" fill="#9BAA52" />
                    <ellipse cx="0" cy="-50" rx="30" ry="10" fill="#9BAA52" />
                </g>
            ))}
            {/* RIGHT side: road and city */}
            <rect x="720" y="720" width="720" height="180" fill="#5B6470" />
            <rect x="720" y="720" width="720" height="6" fill="#3F4052" />
            {/* Road dashed centre line */}
            <g fill="#FFD84D">
                {[760, 860, 960, 1060, 1160, 1260, 1360].map((x, i) => (
                    <rect key={i} x={x} y="800" width="40" height="6" rx="3" />
                ))}
            </g>
            {/* Buildings silhouette in distance */}
            <g fill="#A8B0C0" opacity="0.55">
                <rect x="780" y="560" width="80" height="160" rx="2" />
                <rect x="880" y="500" width="100" height="220" rx="2" />
                <rect x="1000" y="540" width="70" height="180" rx="2" />
                <rect x="1090" y="480" width="90" height="240" rx="2" />
                <rect x="1200" y="540" width="80" height="180" rx="2" />
                <rect x="1300" y="510" width="120" height="210" rx="2" />
            </g>
            {/* Building windows */}
            <g fill="#FFD84D" opacity="0.5">
                {[
                    [800, 600], [820, 600], [800, 640], [820, 640], [800, 680], [820, 680],
                    [900, 540], [920, 540], [940, 540], [900, 580], [920, 580], [940, 580],
                    [1110, 520], [1140, 520], [1110, 560], [1140, 560], [1110, 600], [1140, 600],
                ].map(([x, y], i) => <rect key={i} x={x} y={y} width="10" height="10" rx="1" />)}
            </g>
            {/* Cloud in centre */}
            <ellipse cx="500" cy="200" rx="80" ry="22" fill="#FFFFFF" opacity="0.85" />
            <ellipse cx="1100" cy="280" rx="60" ry="18" fill="#FFFFFF" opacity="0.7" />
        </svg>
    </>
);

// ─── 5. Recycle & Trash: Park with bins ───────────────────────────────
const RecycleTrashScene = () => (
    <>
        <SkyBase from="#BEEBFF" mid="#E5F8E0" to="#F4FFEB" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            <circle cx="1200" cy="160" r="60" fill="#FFD84D" opacity="0.9" />
            {/* Park grass */}
            <path d="M0,680 Q360,640 720,670 T1440,660 L1440,900 L0,900 Z" fill="#7ED957" />
            <path d="M0,750 Q300,720 720,740 T1440,730 L1440,900 L0,900 Z" fill="#5BB04A" />
            {/* Park trees */}
            {[120, 320, 540, 1020, 1240, 1380].map((x, i) => (
                <g key={i} transform={`translate(${x},650)`}>
                    <rect x="-5" y="0" width="10" height="44" fill="#7A5A3A" />
                    <circle cx="0" cy="-10" r="34" fill="#5BB04A" />
                    <circle cx="-12" cy="-22" r="22" fill="#7ED957" />
                    <circle cx="14" cy="-20" r="20" fill="#7ED957" />
                </g>
            ))}
            {/* Recycle bin (left, green with arrows) */}
            <g transform="translate(360,540)">
                <rect x="-50" y="0" width="100" height="140" rx="6" fill="#5BB04A" />
                <rect x="-50" y="0" width="100" height="14" rx="6" fill="#3F8A2E" />
                <rect x="-58" y="-8" width="116" height="14" rx="4" fill="#3F8A2E" />
                {/* Recycling triangle */}
                <g transform="translate(0,68)" stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinejoin="round">
                    <path d="M -22 12 L 0 -22 L 22 12 Z" />
                </g>
                <text x="0" y="124" fontFamily="Fredoka, system-ui, sans-serif" fontSize="20"
                      fontWeight="700" fill="#FFFFFF" textAnchor="middle">RECYCLE</text>
            </g>
            {/* Trash bin (right, gray with X / different look) */}
            <g transform="translate(1080,540)">
                <rect x="-50" y="0" width="100" height="140" rx="6" fill="#6B7280" />
                <rect x="-50" y="0" width="100" height="14" rx="6" fill="#4B5563" />
                <rect x="-58" y="-8" width="116" height="14" rx="4" fill="#4B5563" />
                {/* Trash bag indicator */}
                <g transform="translate(0,68)" stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinecap="round">
                    <path d="M -16 -16 L 16 16 M 16 -16 L -16 16" />
                </g>
                <text x="0" y="124" fontFamily="Fredoka, system-ui, sans-serif" fontSize="20"
                      fontWeight="700" fill="#FFFFFF" textAnchor="middle">TRASH</text>
            </g>
            {/* Birds */}
            <g stroke="#3F4052" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5">
                <path d="M380,200 q12,-12 24,0 q12,-12 24,0" />
                <path d="M820,260 q10,-10 20,0 q10,-10 20,0" />
            </g>
        </svg>
    </>
);

// ─── 6. Letters: Library / book world ─────────────────────────────────
const LettersScene = () => (
    <>
        <SkyBase from="#FFF0DC" mid="#FFFAEB" to="#FFF6E5" sunX="50%" sunColor="rgba(255, 200, 100, 0.35)" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Bookshelf at horizon */}
            <rect x="0" y="600" width="1440" height="120" fill="#9B6B3F" />
            <rect x="0" y="600" width="1440" height="14" fill="#7A4F1F" />
            <rect x="0" y="710" width="1440" height="10" fill="#7A4F1F" />
            {/* Books on the shelf */}
            {[
                ['#FF6B6B', 60], ['#FFD84D', 50], ['#7ED957', 65], ['#55DDE0', 55],
                ['#6C3FA4', 70], ['#FF6B9D', 60], ['#FFB14D', 50], ['#A855F7', 65],
                ['#FF6B6B', 55], ['#7ED957', 60], ['#FFD84D', 50], ['#6C3FA4', 65],
                ['#55DDE0', 55], ['#FF6B9D', 70], ['#FFB14D', 50], ['#A855F7', 60],
                ['#7ED957', 55], ['#FF6B6B', 60], ['#FFD84D', 65], ['#55DDE0', 50],
            ].map(([color, h], i) => {
                const x = 30 + i * 70;
                const height = h as number;
                return (
                    <g key={i}>
                        <rect x={x} y={612 - height + 88} width="55" height={height + 8} fill={color as string} />
                        <rect x={x + 5} y={612 - height + 92} width="3" height={height} fill="rgba(255,255,255,0.4)" />
                    </g>
                );
            })}
            {/* Floating letters in the sky */}
            <g fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" opacity="0.18">
                <text x="180" y="200" fontSize="80" fill="#6C3FA4">a</text>
                <text x="380" y="160" fontSize="64" fill="#FF6B6B">b</text>
                <text x="640" y="220" fontSize="72" fill="#7ED957">c</text>
                <text x="900" y="180" fontSize="68" fill="#55DDE0">d</text>
                <text x="1140" y="240" fontSize="78" fill="#FFB14D">e</text>
                <text x="1300" y="180" fontSize="60" fill="#A855F7">f</text>
            </g>
            {/* Floating book */}
            <g transform="translate(160,360) rotate(-12)">
                <rect width="80" height="60" rx="3" fill="#FF6B6B" />
                <rect x="2" y="2" width="76" height="56" rx="2" fill="#FFFFFF" />
                <line x1="40" y1="2" x2="40" y2="58" stroke="#3F4052" strokeWidth="1.5" />
                <line x1="10" y1="20" x2="34" y2="20" stroke="#A8B0C0" strokeWidth="1" />
                <line x1="10" y1="32" x2="34" y2="32" stroke="#A8B0C0" strokeWidth="1" />
                <line x1="46" y1="20" x2="70" y2="20" stroke="#A8B0C0" strokeWidth="1" />
                <line x1="46" y1="32" x2="70" y2="32" stroke="#A8B0C0" strokeWidth="1" />
            </g>
            <g transform="translate(1180,400) rotate(8)">
                <rect width="70" height="52" rx="3" fill="#7ED957" />
                <rect x="2" y="2" width="66" height="48" rx="2" fill="#FFFFFF" />
                <line x1="35" y1="2" x2="35" y2="50" stroke="#3F4052" strokeWidth="1.5" />
            </g>
        </svg>
    </>
);

// ─── 7. Numbers: Math sky / chalkboard ────────────────────────────────
const NumbersScene = () => (
    <>
        <SkyBase from="#D4E8FF" mid="#E8F0FF" to="#F4F6FF" sunX="80%" sunColor="rgba(108, 63, 164, 0.20)" />
        <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
             style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
            {/* Chalkboard at horizon */}
            <rect x="80" y="500" width="1280" height="220" rx="12" fill="#2E5840" />
            <rect x="80" y="500" width="1280" height="220" rx="12" fill="none"
                  stroke="#7A4F1F" strokeWidth="14" />
            {/* Equations on the chalkboard */}
            <g fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" fill="#FFFFFF" opacity="0.88">
                <text x="160" y="580" fontSize="48">2 + 2 = 4</text>
                <text x="500" y="580" fontSize="48">5 - 1 = 4</text>
                <text x="850" y="580" fontSize="48">3 × 2 = 6</text>
                <text x="1180" y="580" fontSize="48">8 ÷ 2 = 4</text>
                <text x="160" y="660" fontSize="42">7 + 1 = 8</text>
                <text x="500" y="660" fontSize="42">6 - 4 = 2</text>
                <text x="850" y="660" fontSize="42">9 + 0 = 9</text>
                <text x="1180" y="660" fontSize="42">4 + 3 = 7</text>
            </g>
            {/* Eraser on chalkboard ledge */}
            <rect x="700" y="720" width="60" height="14" rx="2" fill="#FFD84D" />
            <rect x="700" y="720" width="60" height="6" rx="2" fill="#FFB14D" />
            {/* Chalk */}
            <rect x="800" y="722" width="40" height="6" rx="3" fill="#FFFFFF" />
            <rect x="860" y="722" width="35" height="6" rx="3" fill="#FF6B6B" />
            {/* Floating math symbols in the sky */}
            <g fontFamily="Fredoka, system-ui, sans-serif" fontWeight="700" opacity="0.18">
                <text x="220" y="200" fontSize="80" fill="#FF6B6B">+</text>
                <text x="420" y="280" fontSize="72" fill="#55DDE0">−</text>
                <text x="640" y="160" fontSize="84" fill="#7ED957">×</text>
                <text x="900" y="220" fontSize="80" fill="#FFD84D">÷</text>
                <text x="1140" y="180" fontSize="76" fill="#A855F7">=</text>
                <text x="1300" y="280" fontSize="64" fill="#FF6B9D">%</text>
            </g>
            {/* Cloud */}
            <ellipse cx="280" cy="120" rx="60" ry="18" fill="#FFFFFF" opacity="0.85" />
            <ellipse cx="1080" cy="100" rx="70" ry="20" fill="#FFFFFF" opacity="0.85" />
        </svg>
    </>
);

// Reusable hill base for scenes that need a meadow.
const Hills = ({ mood = 'meadow' }: { mood?: 'meadow' | 'light' }) => (
    <svg aria-hidden viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice"
         style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
        <path d="M0,600 Q260,540 520,580 T1080,560 T1440,570 L1440,900 L0,900 Z"
              fill={mood === 'meadow' ? '#A6E89A' : '#C5F0BC'} />
        <path d="M0,680 Q300,610 720,670 T1440,650 L1440,900 L0,900 Z"
              fill={mood === 'meadow' ? '#8DDC7A' : '#A6E89A'} />
        <path d="M0,760 Q300,690 720,750 T1440,740 L1440,900 L0,900 Z"
              fill={mood === 'meadow' ? '#7ED957' : '#8DDC7A'} />
        {/* Tree silhouettes */}
        <g opacity="0.7">
            {[120, 280, 410, 700, 870, 1100, 1280].map((x, i) => (
                <g key={i} transform={`translate(${x},${590 + (i % 3) * 4})`}>
                    <rect x="-3" y="0" width="6" height="14" fill="#6B5538" />
                    <ellipse cx="0" cy="-12" rx="14" ry="18" fill="#5BB04A" />
                </g>
            ))}
        </g>
    </svg>
);

// ─── Public component ──────────────────────────────────────────────────
export const SortAndPlaceBackground = ({ stageId }: Props) => {
    switch (stageId) {
        case 'colors-sort':         return <ColoursScene />;
        case 'shapes-sort':         return <ShapesScene />;
        case 'food-vs-toys':        return <FoodToysScene />;
        case 'animals-vs-vehicles': return <AnimalsVehiclesScene />;
        case 'recycle-vs-trash':    return <RecycleTrashScene />;
        case 'letters-sort':        return <LettersScene />;
        case 'numbers-sort':        return <NumbersScene />;
        default:                    return <ColoursScene />;
    }
};
