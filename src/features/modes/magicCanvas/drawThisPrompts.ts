/**
 * "Draw This" prompts — a reference illustration shown to the side, the child
 * draws it freely (mouse or gesture) on the canvas, a gentle per-prompt timer
 * runs, then it auto-advances to the next prompt. No grading — it's about
 * having a go. Each prompt carries a small vector `draw` for the reference
 * card (context-agnostic so it works in-browser and headless).
 */

export interface DrawThisPrompt {
    id: string;
    label: string;
    instruction: string;
    timerSeconds: number;
    /** Draw the reference into a square of side `s` at the current origin. */
    draw: (ctx: CanvasRenderingContext2D, s: number) => void;
}

const sun: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.strokeStyle = '#FFC83D'; ctx.lineWidth = Math.max(2, s * 0.03); ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3);
        ctx.lineTo(s / 2 + Math.cos(a) * s * 0.42, s / 2 + Math.sin(a) * s * 0.42);
        ctx.stroke();
    }
    ctx.fillStyle = '#FFD54A'; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.22, 0, Math.PI * 2); ctx.fill();
};
const balloon: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.fillStyle = '#F07A5C'; ctx.beginPath(); ctx.ellipse(s / 2, s * 0.4, s * 0.22, s * 0.27, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8A66F0'; ctx.lineWidth = Math.max(2, s * 0.02); ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.67); ctx.quadraticCurveTo(s * 0.58, s * 0.82, s * 0.46, s * 0.92); ctx.stroke();
};
const house: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.fillStyle = '#FFC83D'; ctx.fillRect(s * 0.28, s * 0.46, s * 0.44, s * 0.36);
    ctx.fillStyle = '#F07A5C'; ctx.beginPath(); ctx.moveTo(s * 0.22, s * 0.46); ctx.lineTo(s * 0.5, s * 0.22); ctx.lineTo(s * 0.78, s * 0.46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8A66F0'; ctx.fillRect(s * 0.44, s * 0.6, s * 0.12, s * 0.22);
};
const flower: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.fillStyle = '#FF9B7E';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(s / 2 + Math.cos(a) * s * 0.16, s * 0.4 + Math.sin(a) * s * 0.16, s * 0.09, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#FFC83D'; ctx.beginPath(); ctx.arc(s / 2, s * 0.4, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5BCE9A'; ctx.lineWidth = Math.max(2, s * 0.025); ctx.beginPath(); ctx.moveTo(s / 2, s * 0.5); ctx.lineTo(s / 2, s * 0.86); ctx.stroke();
};
const fish: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.fillStyle = '#7BB6FF'; ctx.beginPath(); ctx.ellipse(s * 0.46, s / 2, s * 0.26, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s * 0.7, s / 2); ctx.lineTo(s * 0.9, s * 0.36); ctx.lineTo(s * 0.9, s * 0.64); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1F1B2E'; ctx.beginPath(); ctx.arc(s * 0.34, s * 0.45, s * 0.02, 0, Math.PI * 2); ctx.fill();
};
const star: DrawThisPrompt['draw'] = (ctx, s) => {
    ctx.fillStyle = '#FFC83D'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 === 0 ? s * 0.36 : s * 0.15; const x = s / 2 + Math.cos(a) * r; const y = s / 2 + Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill();
};

export const DRAW_THIS_PROMPTS: DrawThisPrompt[] = [
    { id: 'sun', label: 'Sun', instruction: 'Draw a sun', timerSeconds: 45, draw: sun },
    { id: 'balloon', label: 'Balloon', instruction: 'Draw a balloon', timerSeconds: 45, draw: balloon },
    { id: 'house', label: 'House', instruction: 'Draw a house', timerSeconds: 60, draw: house },
    { id: 'flower', label: 'Flower', instruction: 'Draw a flower', timerSeconds: 60, draw: flower },
    { id: 'fish', label: 'Fish', instruction: 'Draw a fish', timerSeconds: 60, draw: fish },
    { id: 'star', label: 'Star', instruction: 'Draw a star', timerSeconds: 45, draw: star },
];

export const getDrawThisPrompt = (id: string): DrawThisPrompt | undefined =>
    DRAW_THIS_PROMPTS.find((p) => p.id === id);
