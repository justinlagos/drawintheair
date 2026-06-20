/**
 * Guided Colouring Book — 6 line-art pages (data + region geometry).
 *
 * Each page is a set of large, named REGIONS (closed polygons in normalized
 * 0..1 design space) plus the line-art OUTLINE strokes drawn on top. The
 * colouring engine clips the child's paint to whichever region the pointer is
 * inside, so colour never spills outside the shape (the "guided colouring book"
 * feel). Per-region coverage drives gentle completion feedback.
 *
 * Pure data + geometry helpers — no canvas, no React.
 */

export interface ColourPoint { x: number; y: number; }

export interface ColourRegion {
    id: string;
    label: string;
    /** Closed polygon (normalized 0..1). */
    polygon: ColourPoint[];
    /** Suggested colour swatch hint (not enforced). */
    hint?: string;
}

export interface ColouringPage {
    id: string;
    label: string;
    regions: ColourRegion[];
    /** Line-art strokes drawn on top of the colour, in order. */
    outline: ColourPoint[][];
}

// ── polygon builders ─────────────────────────────────────────────────────
const P = (x: number, y: number): ColourPoint => ({ x, y });

const ellipse = (cx: number, cy: number, rx: number, ry: number, segs = 40, a0 = 0, a1 = Math.PI * 2): ColourPoint[] => {
    const pts: ColourPoint[] = [];
    for (let i = 0; i <= segs; i++) {
        const a = a0 + (a1 - a0) * (i / segs);
        pts.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
    }
    return pts;
};

const starPolygon = (cx: number, cy: number, rOuter: number, rInner: number): ColourPoint[] => {
    const pts: ColourPoint[] = [];
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? rOuter : rInner;
        pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.0));
    }
    return pts;
};

// ── pages ────────────────────────────────────────────────────────────────

const apple: ColouringPage = {
    id: 'apple', label: 'Apple',
    regions: [
        { id: 'apple-body', label: 'apple', hint: '#F07A5C', polygon: ellipse(0.5, 0.58, 0.3, 0.32) },
        { id: 'apple-leaf', label: 'leaf', hint: '#5BCE9A', polygon: [P(0.52, 0.27), P(0.66, 0.18), P(0.62, 0.31), P(0.52, 0.32)] },
    ],
    outline: [
        ellipse(0.5, 0.58, 0.3, 0.32),
        [P(0.5, 0.3), P(0.5, 0.2)],                       // stem
        [P(0.52, 0.27), P(0.66, 0.18), P(0.62, 0.31), P(0.52, 0.32)], // leaf
    ],
};

const star: ColouringPage = {
    id: 'star', label: 'Star',
    regions: [{ id: 'star-body', label: 'star', hint: '#FFC83D', polygon: starPolygon(0.5, 0.5, 0.4, 0.17) }],
    outline: [starPolygon(0.5, 0.5, 0.4, 0.17)],
};

const fish: ColouringPage = {
    id: 'fish', label: 'Fish',
    regions: [
        { id: 'fish-body', label: 'body', hint: '#7BB6FF', polygon: ellipse(0.46, 0.5, 0.28, 0.2) },
        { id: 'fish-tail', label: 'tail', hint: '#FF9B7E', polygon: [P(0.72, 0.5), P(0.92, 0.34), P(0.88, 0.5), P(0.92, 0.66)] },
    ],
    outline: [
        ellipse(0.46, 0.5, 0.28, 0.2),
        [P(0.72, 0.5), P(0.92, 0.34), P(0.88, 0.5), P(0.92, 0.66), P(0.72, 0.5)],
        ellipse(0.34, 0.44, 0.025, 0.025, 16), // eye
    ],
};

const house: ColouringPage = {
    id: 'house', label: 'House',
    regions: [
        { id: 'house-wall', label: 'wall', hint: '#FFC83D', polygon: [P(0.28, 0.5), P(0.72, 0.5), P(0.72, 0.85), P(0.28, 0.85)] },
        { id: 'house-roof', label: 'roof', hint: '#F07A5C', polygon: [P(0.22, 0.5), P(0.5, 0.24), P(0.78, 0.5)] },
        { id: 'house-door', label: 'door', hint: '#8A66F0', polygon: [P(0.44, 0.62), P(0.56, 0.62), P(0.56, 0.85), P(0.44, 0.85)] },
    ],
    outline: [
        [P(0.28, 0.5), P(0.72, 0.5), P(0.72, 0.85), P(0.28, 0.85), P(0.28, 0.5)],
        [P(0.22, 0.5), P(0.5, 0.24), P(0.78, 0.5)],
        [P(0.44, 0.62), P(0.56, 0.62), P(0.56, 0.85), P(0.44, 0.85)],
    ],
};

const flower: ColouringPage = {
    id: 'flower', label: 'Flower',
    regions: [
        { id: 'flower-petals', label: 'petals', hint: '#FF9B7E', polygon: ellipse(0.5, 0.42, 0.26, 0.26) },
        { id: 'flower-center', label: 'middle', hint: '#FFC83D', polygon: ellipse(0.5, 0.42, 0.1, 0.1) },
        { id: 'flower-leaf', label: 'leaf', hint: '#5BCE9A', polygon: [P(0.5, 0.7), P(0.66, 0.66), P(0.56, 0.8)] },
    ],
    outline: [
        ...Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return ellipse(0.5 + Math.cos(a) * 0.18, 0.42 + Math.sin(a) * 0.18, 0.09, 0.09, 20);
        }),
        ellipse(0.5, 0.42, 0.1, 0.1, 24),                 // center
        [P(0.5, 0.52), P(0.5, 0.86)],                     // stem
        [P(0.5, 0.7), P(0.66, 0.66), P(0.56, 0.8), P(0.5, 0.7)], // leaf
    ],
};

const balloon: ColouringPage = {
    id: 'balloon', label: 'Balloon',
    regions: [{ id: 'balloon-body', label: 'balloon', hint: '#F07A5C', polygon: ellipse(0.5, 0.42, 0.24, 0.3) }],
    outline: [
        ellipse(0.5, 0.42, 0.24, 0.3),
        [P(0.5, 0.72), P(0.47, 0.74), P(0.5, 0.76)],      // knot
        [P(0.5, 0.76), P(0.55, 0.86), P(0.46, 0.94)],     // string
    ],
};

export const COLOURING_PAGES: ColouringPage[] = [apple, star, fish, house, flower, balloon];

export const getColouringPage = (id: string): ColouringPage | undefined =>
    COLOURING_PAGES.find((p) => p.id === id);

// ── geometry helpers ───────────────────────────────────────────────────────

/** Ray-casting point-in-polygon (normalized coords). */
export const pointInPolygon = (x: number, y: number, poly: ColourPoint[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
};

/** The region at a point (later regions win — smaller details on top). */
export const regionAt = (page: ColouringPage, x: number, y: number): ColourRegion | null => {
    for (let i = page.regions.length - 1; i >= 0; i--) {
        if (pointInPolygon(x, y, page.regions[i].polygon)) return page.regions[i];
    }
    return null;
};

export interface PageIssue { pageId: string; code: 'no-regions' | 'tiny-polygon' | 'duplicate-region'; message: string; }
export const validateColouringPages = (pages = COLOURING_PAGES): PageIssue[] => {
    const issues: PageIssue[] = [];
    for (const p of pages) {
        if (p.regions.length === 0) issues.push({ pageId: p.id, code: 'no-regions', message: `${p.id} has no regions` });
        const seen = new Set<string>();
        for (const r of p.regions) {
            if (seen.has(r.id)) issues.push({ pageId: p.id, code: 'duplicate-region', message: `duplicate region ${r.id}` });
            seen.add(r.id);
            if (r.polygon.length < 3) issues.push({ pageId: p.id, code: 'tiny-polygon', message: `region ${r.id} has < 3 points` });
        }
    }
    return issues;
};
export const getColouringValidationIssues = () => validateColouringPages();
