/**
 * Kid-UI Icon Sprite Registry
 *
 * Bespoke SVG illustrations that replace the legacy emoji-on-ball treatment
 * in canvas-rendered modes (Sort & Place, etc.). Each illustration is a
 * 2.5D-styled bespoke shape: gradient fill, glossy highlight, soft outline.
 *
 * Architecture
 * ────────────
 *   kidIcons.ts (this file)
 *     ├─ KidIconDef type
 *     ├─ ICONS registry (merged from all category files)
 *     ├─ sprite cache (HTMLImageElement keyed by `${key}:${color}`)
 *     ├─ public API: getKidIconSprite, isKidIconReady, hasKidIcon, preloadKidIcons
 *
 *   icons/_helpers.ts   shared SVG fragments + tile/sphere builders
 *   icons/shapes.ts     circle, oval, square, rectangle, triangle, star, heart, diamond
 *   icons/letters.ts    A E I O U B C D
 *   icons/numbers.ts    1 2 3 4 5 6 7 8
 *   icons/colors.ts     red orange yellow pink blue green purple white
 *   icons/foods.ts      apple banana pizza cake
 *   icons/toys.ts       teddy car balloon controller
 *   icons/animals.ts    dog cat rabbit bear
 *   icons/vehicles.ts   car.red car.blue car.green car.yellow plane boat
 *   icons/recyclables.ts bottle can paper glass
 *   icons/trash.ts      banana wrapper paper cup
 *
 * Usage in a canvas render loop:
 *   const img = getKidIconSprite('animal.dog', '#E0B070');
 *   if (isKidIconReady(img)) ctx.drawImage(img, x, y, w, h);
 *   else /* draw a fallback while the SVG parses *\/
 */

import { SHAPE_ICONS } from './icons/shapes';
import { LETTER_ICONS } from './icons/letters';
import { NUMBER_ICONS } from './icons/numbers';
import { COLOR_ICONS } from './icons/colors';
import { FOOD_ICONS } from './icons/foods';
import { TOY_ICONS } from './icons/toys';
import { ANIMAL_ICONS } from './icons/animals';
import { VEHICLE_ICONS } from './icons/vehicles';
import { RECYCLABLE_ICONS } from './icons/recyclables';
import { TRASH_ICONS } from './icons/trash';

// ─── Types ─────────────────────────────────────────────────────────────
export interface KidIconDef {
    /** ViewBox dimensions; canvas drawImage preserves aspect ratio if you
     *  pass matching width/height. */
    viewBox: { w: number; h: number };
    /** SVG body (no outer <svg>). Use literal `{color}` for places where
     *  the item.color should be substituted. */
    body: string;
    /** When true, ignores the color argument — for items with intrinsic
     *  appearance (e.g. an apple is always red). Defaults to false. */
    intrinsicColor?: boolean;
}

// ─── Registry ──────────────────────────────────────────────────────────
// All category packs merged into a single lookup. Key = item.key from the
// stage data; value = SVG definition.
export const ICONS: Record<string, KidIconDef> = {
    ...SHAPE_ICONS,
    ...LETTER_ICONS,
    ...NUMBER_ICONS,
    ...COLOR_ICONS,
    ...FOOD_ICONS,
    ...TOY_ICONS,
    ...ANIMAL_ICONS,
    ...VEHICLE_ICONS,
    ...RECYCLABLE_ICONS,
    ...TRASH_ICONS,
};

// ─── Sprite cache ──────────────────────────────────────────────────────
const buildSvg = (def: KidIconDef, color: string): string => {
    const body = def.intrinsicColor ? def.body : def.body.replace(/\{color\}/g, color);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${def.viewBox.w} ${def.viewBox.h}">${body}</svg>`;
};

const spriteCache = new Map<string, HTMLImageElement>();

/**
 * Returns an HTMLImageElement for the sprite. First call kicks off loading
 * (the browser parses the SVG asynchronously); subsequent calls return the
 * cached image. Returns `null` if the key isn't registered — caller falls
 * back to a default render.
 */
export const getKidIconSprite = (key: string, color: string): HTMLImageElement | null => {
    const def = ICONS[key];
    if (!def) return null;

    // Intrinsic-colour icons share a single cache entry regardless of the
    // `color` argument — saves both memory and parse work.
    const cacheKey = def.intrinsicColor ? `${key}:_` : `${key}:${color}`;
    const cached = spriteCache.get(cacheKey);
    if (cached) return cached;

    const img = new Image();
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(buildSvg(def, color))}`;
    spriteCache.set(cacheKey, img);
    return img;
};

/** Whether the sprite has parsed and is ready for ctx.drawImage. */
export const isKidIconReady = (img: HTMLImageElement | null): boolean => {
    return img !== null && img.complete && img.naturalWidth > 0;
};

/** True if the key has a registered illustration. */
export const hasKidIcon = (key: string): boolean => key in ICONS;

/**
 * Eager preload — call once at mode startup with the keys + colours you'll
 * render this stage. Avoids the one-frame fallback flicker.
 */
export const preloadKidIcons = (
    items: Array<{ key: string; color: string }>,
): void => {
    for (const { key, color } of items) {
        getKidIconSprite(key, color);
    }
};

/** Total registered icon count (debug / smoke-test). */
export const getKidIconCount = (): number => Object.keys(ICONS).length;
