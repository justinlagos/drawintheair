import { DrawingUtils, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

// Simple path definition: Line from A to B
interface PathTarget {
    start: { x: number, y: number };
    end: { x: number, y: number };
    completed: boolean;
}

let currentPath: PathTarget = {
    start: { x: 0.2, y: 0.2 },
    end: { x: 0.2, y: 0.8 },
    completed: false
};

// State for progress
let progress = 0; // 0 to 1 along the line

export const preWritingLogic = (
    ctx: CanvasRenderingContext2D,
    results: HandLandmarkerResult | null,
    width: number,
    height: number,
    drawingUtils: DrawingUtils | null
) => {
    // Draw Ghost Path
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(currentPath.start.x * width, currentPath.start.y * height);
    ctx.lineTo(currentPath.end.x * width, currentPath.end.y * height);
    ctx.stroke();

    // Draw Progress (Glow)
    if (progress > 0) {
        const px = currentPath.start.x + (currentPath.end.x - currentPath.start.x) * progress;
        const py = currentPath.start.y + (currentPath.end.y - currentPath.start.y) * progress;

        ctx.strokeStyle = '#00f5d4'; // Success color
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(currentPath.start.x * width, currentPath.start.y * height);
        ctx.lineTo(px * width, py * height);
        ctx.stroke();
    }

    // Detection Logic
    if (results && results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const indexTip = landmarks[8];

        // Check if tip is near the "next" point on the line
        // Simple projection: Project point onto line segment, check distance.
        // And check if projection is ahead of current progress.

        // Vector math
        const pax = currentPath.end.x - currentPath.start.x;
        const pay = currentPath.end.y - currentPath.start.y;
        const lengthSq = pax * pax + pay * pay;

        // Point relative to start
        const pbx = indexTip.x - currentPath.start.x;
        const pby = indexTip.y - currentPath.start.y;

        // Dot product to find projection scalar t
        let t = (pbx * pax + pby * pay) / lengthSq;
        t = Math.max(0, Math.min(1, t)); // Clamp to segment

        // Closest point on line
        const closestX = currentPath.start.x + t * pax;
        const closestY = currentPath.start.y + t * pay;

        // Distance from path
        const dx = indexTip.x - closestX;
        const dy = indexTip.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Threshold: 0.05 (5% of screen width)
        if (dist < 0.05) {
            // If t is greater than current progress (moving forward), update progress
            if (t > progress && t < progress + 0.1) { // Prevent skipping too far
                progress = t;
            }

            // Draw feedback "Brush" at finger
            ctx.beginPath();
            ctx.arc(indexTip.x * width, indexTip.y * height, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#00f5d4';
            ctx.fill();
        }

        // Debug
        if (drawingUtils) {
            drawingUtils.drawLandmarks(landmarks, { color: "blue", radius: 2 });
        }
    }

    if (progress >= 0.98 && !currentPath.completed) {
        currentPath.completed = true;
        // Trigger win? (e.g. callback via loose custom event or similar for MVP)
        console.log("Path Complete!");
        ctx.fillStyle = "gold";
        ctx.font = "40px Arial";
        ctx.fillText("GREAT JOB!", width / 2 - 100, height / 2);
    }
};

export const resetPath = () => {
    progress = 0;
    currentPath.completed = false;
};
