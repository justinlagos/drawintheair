import { DrawingUtils } from '@mediapipe/tasks-vision';
import type { TrackingFrameData } from '../../tracking/TrackingLayer';
import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { OneEuroFilter2D } from '../../../core/filters/OneEuroFilter';
import { isCountdownActive } from '../../../core/countdownService';
import type { StageConfig, SlotConfig, ColourId } from './ColourBuilderStages';
import { STAGES, ColorPalette } from './ColourBuilderStages';

export type BlockItem = {
    id: string;
    colorId: ColourId;
    state: "idle" | "grabbed" | "placed";
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
    rotation: number;
    slotId: string | null;
    bounceBack: boolean;
};

let currentStageIndex = 0;
let currentStage: StageConfig | null = null;
let blocks: BlockItem[] = [];
let slots: SlotConfig[] = [];
let grabbedBlock: BlockItem | null = null;

let score = 0;
let totalBlocks = 0;
let streak = 0;
let maxStreak = 0;
let timeToFirstMatch = 0;
let stageStartTime = 0;
let roundComplete = false;
let celebrationTime = 0;
let grabFilter: OneEuroFilter2D | null = null;

export function getScore() { return score; }
export function getStreak() { return streak; }
export function getTotalBlocks() { return totalBlocks; }
export function isRoundComplete() { return roundComplete; }
export function getCelebrationTime() { return celebrationTime; }
export function getCurrentStage() { return currentStage; }

export function startStage(stageIndex: number = 0) {
    currentStageIndex = stageIndex;
    currentStage = STAGES[currentStageIndex] || STAGES[0];
    slots = currentStage.slots;

    // Instantiate blocks based on blockPlan
    blocks = [];
    currentStage.blockPlan.sequence.forEach((seq, seqIdx) => {
        for (let i = 0; i < seq.count; i++) {
            blocks.push({
                id: `block-${seq.colorId}-${seqIdx}-${i}`,
                colorId: seq.colorId,
                state: "idle",
                x: 0.2 + Math.random() * 0.6,
                y: 0.15 + Math.random() * 0.2,
                width: 0.08,
                height: 0.08,
                vx: (Math.random() - 0.5) * 0.0002,
                vy: (Math.random() - 0.5) * 0.0002,
                rotation: 0,
                slotId: null,
                bounceBack: false
            });
        }
    });

    totalBlocks = blocks.length;
    score = 0;
    streak = 0;
    maxStreak = 0;
    stageStartTime = Date.now();
    timeToFirstMatch = 0;
    roundComplete = false;
    celebrationTime = 0;
    grabbedBlock = null;

    grabFilter = new OneEuroFilter2D({ minCutoff: 1.5, beta: 0.02, dCutoff: 1.0 });
}

export function validateDrop(block: BlockItem, dropSlot: SlotConfig | null) {
    if (!dropSlot) return 'none';
    const isOccupied = blocks.some(b => b.state === 'placed' && b.slotId === dropSlot.id);
    if (isOccupied) return 'bounceBack';
    if (block.colorId === dropSlot.colorId) return 'correct';
    return 'wrong';
}

export function colourBuilderLogic(
    ctx: CanvasRenderingContext2D,
    frameData: TrackingFrameData,
    width: number,
    height: number,
    _drawingUtils: DrawingUtils | null
) {
    if (!currentStage) return;
    if (isCountdownActive()) return;

    const { filteredPoint, pinchActive, timestamp } = frameData;

    // Movement & bouncing for idle blocks
    blocks.forEach(block => {
        if (block.state === "idle" && !block.bounceBack) {
            block.x += block.vx;
            block.y += block.vy;
            if (block.x < 0.1 || block.x > 0.9) block.vx *= -1;
            if (block.y < 0.1 || block.y > 0.4) block.vy *= -1;
        } else if (block.bounceBack) {
            // Animating back to spawn roughly
            block.x += (0.5 - block.x) * 0.05;
            block.y += (0.2 - block.y) * 0.05;
            if (Math.abs(block.x - 0.5) < 0.05 && Math.abs(block.y - 0.2) < 0.05) {
                block.bounceBack = false;
            }
        }
    });

    if (pinchActive && filteredPoint) {
        if (!grabbedBlock) {
            let minDist = Infinity;
            let nearest: BlockItem | null = null;
            for (const b of blocks) {
                if (b.state !== "idle") continue;
                const dist = Math.hypot(filteredPoint.x - b.x, filteredPoint.y - b.y);
                if (dist < b.width * 1.5 && dist < minDist) {
                    minDist = dist;
                    nearest = b;
                }
            }
            if (nearest) {
                grabbedBlock = nearest;
                nearest.state = "grabbed";
                grabFilter?.reset();
            }
        } else if (grabbedBlock) {
            let targetX = filteredPoint.x;
            let targetY = filteredPoint.y;

            if (grabFilter) {
                const smoothed = grabFilter.filter(targetX, targetY, timestamp);
                grabbedBlock.x = smoothed.x;
                grabbedBlock.y = smoothed.y;
            } else {
                grabbedBlock.x = targetX;
                grabbedBlock.y = targetY;
            }
        }
    } else {
        if (grabbedBlock) {
            // Find nearest slot within snap radius
            let deviceSnapRadius = 0.06; // Mobile default
            if (width > 1200) deviceSnapRadius = 0.045; // Desktop
            else if (width > 768) deviceSnapRadius = 0.05; // Tablet

            let nearestSlot: SlotConfig | null = null;
            let minSlotDist = Infinity;

            for (const slot of slots) {
                const dist = Math.hypot(grabbedBlock.x - slot.pos.x, grabbedBlock.y - slot.pos.y);
                if (dist < deviceSnapRadius && dist < minSlotDist) {
                    minSlotDist = dist;
                    nearestSlot = slot;
                }
            }

            const result = validateDrop(grabbedBlock, nearestSlot);
            if (result === 'correct' && nearestSlot) {
                grabbedBlock.state = "placed";
                grabbedBlock.slotId = nearestSlot.id;
                grabbedBlock.x = nearestSlot.pos.x;
                grabbedBlock.y = nearestSlot.pos.y;
                score++;
                streak++;
                maxStreak = Math.max(maxStreak, streak);
                if (timeToFirstMatch === 0) {
                    timeToFirstMatch = Date.now() - stageStartTime;
                }

                // Trigger burst (simulated here for DOM overlayer or canvas)
                // For canvas: we will dispatch an event or handle it in Mode component
                window.dispatchEvent(new CustomEvent('colour-builder-burst', { detail: { x: nearestSlot.pos.x, y: nearestSlot.pos.y } }));

            } else {
                grabbedBlock.state = "idle";
                if (currentStage.difficulty.wrongDropRule.includes('bounceBack')) {
                    grabbedBlock.bounceBack = true;
                }
                streak = 0;
            }
            grabbedBlock = null;
        }
    }

    if (blocks.filter(b => b.state === 'placed').length === totalBlocks && !roundComplete) {
        roundComplete = true;
        celebrationTime = Date.now();
    }

    // DRAWING
    // Draw slots
    slots.forEach(slot => {
        const sc = normalizedToCanvas({ x: slot.pos.x, y: slot.pos.y }, width, height);
        const w = 0.08 * width;
        const h = 0.08 * height;
        const palette = ColorPalette[slot.colorId];
        ctx.fillStyle = palette.shadow; // recessed
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(sc.x - w / 2, sc.y - h / 2, w, h, 10);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = palette.highlight;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Draw blocks
    blocks.forEach(block => {
        const bc = normalizedToCanvas({ x: block.x, y: block.y }, width, height);
        const w = block.width * width;
        const h = block.height * height;
        const palette = ColorPalette[block.colorId];

        ctx.save();
        ctx.translate(bc.x, bc.y);
        ctx.rotate(block.rotation);

        // shadow
        if (block.state === "grabbed") {
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 10;
        } else if (block.state === "placed") {
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 2;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
        }

        ctx.fillStyle = palette.hex;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 12);
        ctx.fill();

        // top-left key light
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, palette.highlight);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
    });
}
