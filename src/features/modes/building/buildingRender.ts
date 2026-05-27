/**
 * Building Mode — canvas rendering.
 *
 * Composites AI-generated soft-3D PNG sprites onto the canvas, with
 * the home-world background scene as the base layer. Sprites are
 * preloaded by `buildingAssets.preloadBuildingAssets()` at mode mount,
 * so by the time the first interaction frame fires, drawImage hits a
 * cached HTMLImageElement.
 *
 * Layer order, bottom-up:
 *   1. Background scene (home-background.png)
 *   2. Silhouette glow (subtle ghost of completed object)
 *   3. Snap zone outlines + glow halos
 *   4. Pieces (drop shadow → sprite → selection ring)
 *   5. (Completion animator paints on top — see buildingCompletion.ts)
 */

import { normalizedToCanvas } from '../../../core/coordinateUtils';
import { getPieceSprite, getSceneSprite } from './buildingAssets';
import type { BuildObject, BuildPiece, BuildingPhase, SnapZone } from './buildingTypes';

// ─── Public entry ─────────────────────────────────────────────────────

export function renderBuildScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    object: BuildObject,
    phase: BuildingPhase,
    revealElapsedMs: number,
): void {
    drawBackground(ctx, width, height);
    drawSilhouetteHalo(ctx, width, height, object);

    for (const zone of object.snapZones) {
        if (!zone.visible) continue;
        drawSnapZone(ctx, width, height, zone);
    }

    // Stagger piece visibility during reveal so they appear to drift in
    // one after another rather than all at once.
    for (const piece of object.pieces) {
        const visible = phase !== 'reveal' || revealElapsedMs >= piece.spawnDelayMs;
        if (!visible) continue;
        const intro = phase === 'reveal'
            ? Math.min(1, (revealElapsedMs - piece.spawnDelayMs) / 600)
            : 1;
        drawPiece(ctx, width, height, piece, intro);
    }
}

// ─── Background scene ─────────────────────────────────────────────────

function drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
): void {
    const bg = getSceneSprite('home-background');
    if (bg && bg.complete && bg.naturalWidth > 0) {
        // Cover fit — scale up the smaller side so the whole canvas is
        // filled, even if it crops some of the scene.
        const srcRatio = bg.naturalWidth / bg.naturalHeight;
        const dstRatio = width / height;
        let dw = width, dh = height, dx = 0, dy = 0;
        if (dstRatio > srcRatio) {
            // canvas wider than image — scale to width, crop top/bottom
            dh = width / srcRatio;
            dy = (height - dh) / 2;
        } else {
            dw = height * srcRatio;
            dx = (width - dw) / 2;
        }
        ctx.drawImage(bg, dx, dy, dw, dh);
        return;
    }
    // Fallback gradient until the image loads.
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#BEEBFF');
    grad.addColorStop(1, '#7ED957');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
}

// ─── Silhouette halo ──────────────────────────────────────────────────
// Subtle glowing oval where the assembled object will sit. Helps the
// child see "the build belongs here" without screaming about the shape.

function drawSilhouetteHalo(
    _ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    _object: BuildObject,
): void {
    // Intentionally a no-op. The earlier white-bloom halo competed
    // with the scene background and reinforced the "stage card" feel
    // that we're trying to dissolve. The build silhouette is now
    // communicated only by the dashed snap-zone outlines.
}

// ─── Snap zones ───────────────────────────────────────────────────────

function drawSnapZone(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    zone: SnapZone,
): void {
    if (zone.filled) return;             // piece sits on top; hide outline

    const c = normalizedToCanvas({ x: zone.cx, y: zone.cy }, width, height);
    const w = zone.width * width;
    const h = zone.height * height;

    ctx.save();

    // Glow halo — fades in with proximity.
    if (zone.glow > 0) {
        ctx.save();
        ctx.shadowColor = '#FFD84D';
        ctx.shadowBlur = 36 * zone.glow;
        ctx.globalAlpha = 0.4 * zone.glow;
        ctx.fillStyle = '#FFD84D';
        roundedRect(ctx, c.x - w / 2 - 8, c.y - h / 2 - 8, w + 16, h + 16, 18);
        ctx.fill();
        ctx.restore();
    }

    // Dashed outline — soft purple, matches kid-UI primary accent.
    // Lighter weight than before so the outline reads as a "spot"
    // rather than a frame around a card.
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#6C3FA4';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    roundedRect(ctx, c.x - w / 2, c.y - h / 2, w, h, 14);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

// ─── Pieces ───────────────────────────────────────────────────────────

function drawPiece(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    piece: BuildPiece,
    introAlpha: number,
): void {
    const c = normalizedToCanvas({ x: piece.cx, y: piece.cy }, width, height);
    const pieceW = piece.width * width;
    const pieceH = piece.height * height;

    // Tiny scale-up when grabbed for tactile feedback. Kept modest
    // (5%) because pieces are now full master-size and any larger
    // scale visibly breaks the "this is a real object" feel.
    const scale = piece.grabbed ? 1.05 : 1.0;
    const rw = pieceW * scale;
    const rh = pieceH * scale;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, introAlpha));
    ctx.translate(c.x, c.y);
    ctx.rotate(piece.rotation);

    // Note: no synthesized drop-shadow. The AI-rendered sprites already
    // bake their own soft contact shadow from the upper-left light, so
    // adding a canvas ellipse beneath them double-shadowed and made the
    // pieces read as "cards on a surface" rather than objects in space.

    // Sprite — aspect-fit into the piece bounding box so the sprite
    // never stretches if its natural aspect doesn't exactly match the
    // declared width/height. When a future master image gives us
    // master-aligned sizes, we'll switch back to exact-rect drawing.
    const sprite = getPieceSprite(piece.templateId);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const aspect = sprite.naturalWidth / sprite.naturalHeight;
        const drawW = aspect >= 1 ? rw : rh * aspect;
        const drawH = aspect >= 1 ? rw / aspect : rh;
        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
        // Fallback — flat coloured ellipse so the piece is still
        // grabbable while assets are loading.
        ctx.fillStyle = piece.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * 0.4, rh * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Selection ring (grabbed) or placed ring.
    if (piece.grabbed || piece.placed) {
        ctx.save();
        const ringColor = piece.grabbed ? '#FFD84D' : '#7ED957';
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = piece.grabbed ? 26 : 16;
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * 0.55, rh * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

// ─── Helpers ──────────────────────────────────────────────────────────

function roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,     x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x,     y + h, rr);
    ctx.arcTo(x,     y + h, x,     y,     rr);
    ctx.arcTo(x,     y,     x + w, y,     rr);
    ctx.closePath();
}
