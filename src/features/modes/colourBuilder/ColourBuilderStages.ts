export type ColourId = "red" | "blue" | "yellow" | "green" | "purple" | "orange";
export type BlockState = "idle" | "grabbed" | "placed";

export interface SlotConfig {
    id: string;
    colorId: ColourId;
    pos: { x: number; y: number }; // normalized 0–1
    layer: number; // vertical stacking order
}

export interface BlockPlan {
    spawnMode: "tray" | "scatter";
    maxActiveBlocks: number;
    sequence: Array<{ colorId: ColourId; count: number }>;
    respawnOnPlace: boolean;
}

export interface RewardConfig {
    burstOnMatch: boolean;
    burstIntensity: "low" | "med" | "high";
    streakMilestones: number[];
    badgeEnabled: boolean;
}

export interface DifficultyConfig {
    allowedAssist: "none" | "outlineHint" | "ghostSnap";
    wrongDropRule: "bounceBack" | "bounceBackWithHint";
}

export interface StageConfig {
    id: string;
    title: string;
    instruction: string;
    timeLimitSec: number;
    palette: ColourId[];
    slots: SlotConfig[];
    blockPlan: BlockPlan;
    rewards: RewardConfig;
    difficulty: DifficultyConfig;
}

// Color dictionary map
export const ColorPalette: Record<ColourId, { hex: string; highlight: string; shadow: string }> = {
    red: { hex: "#EF4444", highlight: "#F87171", shadow: "#B91C1C" },
    blue: { hex: "#3B82F6", highlight: "#60A5FA", shadow: "#1D4ED8" },
    yellow: { hex: "#EAB308", highlight: "#FACC15", shadow: "#A16207" },
    green: { hex: "#22C55E", highlight: "#4ADE80", shadow: "#15803D" },
    purple: { hex: "#A855F7", highlight: "#C084FC", shadow: "#7E22CE" },
    orange: { hex: "#F97316", highlight: "#FB923C", shadow: "#C2410C" }
};

export const STAGES: StageConfig[] = [
    {
        id: "stage-1",
        title: "Primary City",
        instruction: "Build the tower with matching blocks",
        timeLimitSec: 60,
        palette: ["red", "blue", "yellow"],
        slots: [
            { id: "s1", colorId: "red", pos: { x: 0.5, y: 0.8 }, layer: 0 },
            { id: "s2", colorId: "blue", pos: { x: 0.5, y: 0.65 }, layer: 1 },
            { id: "s3", colorId: "yellow", pos: { x: 0.5, y: 0.5 }, layer: 2 }
        ],
        blockPlan: {
            spawnMode: "tray",
            maxActiveBlocks: 3,
            sequence: [
                { colorId: "red", count: 1 },
                { colorId: "blue", count: 1 },
                { colorId: "yellow", count: 1 }
            ],
            respawnOnPlace: false
        },
        rewards: {
            burstOnMatch: true,
            burstIntensity: "med",
            streakMilestones: [3],
            badgeEnabled: true
        },
        difficulty: {
            allowedAssist: "outlineHint",
            wrongDropRule: "bounceBackWithHint"
        }
    }
];
