/**
 * Building Mode, sprite + scene asset loader.
 *
 * Preloads all PNG sprites for the active object so the first frame
 * after `reveal` enters never has to fall back to a placeholder. Same
 * spirit as `preloadKidIcons` in the Sort-and-Place pipeline, but the
 * Building assets are large soft-3D renders rather than vector icons,
 * so we hold them in raw `Image` instances rather than parsed sprite
 * objects.
 *
 * Sources live in /public/building/ (pieces/, objects/, scene/) and
 * load over Vite's static asset server.
 */

export interface SpriteRegistry {
    pieces: Record<string, HTMLImageElement>;
    objects: Record<string, HTMLImageElement>;
    scene: Record<string, HTMLImageElement>;
}

const registry: SpriteRegistry = {
    pieces: {},
    objects: {},
    scene: {},
};

/** Map from piece templateId → public URL. Single source of truth so
 *  buildingWorlds.ts doesn't have to hard-code paths. */
const PIECE_URLS: Record<string, string> = {
    'building.flower-vase.base':    '/building/pieces/vase-base.png',
    'building.flower-vase.plant':   '/building/pieces/flower-plant.png',
    'building.flower-vase.leaf':    '/building/pieces/flower-leaf.png',
    'building.flower-vase.coral':   '/building/pieces/blossom-coral.png',
    'building.flower-vase.yellow':  '/building/pieces/blossom-yellow.png',
};

const OBJECT_URLS: Record<string, string> = {
    'flower-vase': '/building/objects/flower-vase-thumbnail.png',
    'house':       '/building/objects/house-thumbnail.png',
};

const SCENE_URLS: Record<string, string> = {
    'home-background': '/building/scene/background.png',
};

// ─── Loaders ──────────────────────────────────────────────────────────

function load(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
    });
}

async function loadInto(
    bucket: Record<string, HTMLImageElement>,
    urlMap: Record<string, string>,
    keys: string[],
): Promise<void> {
    await Promise.all(keys.map(async (key) => {
        if (bucket[key]) return;          // cached
        const url = urlMap[key];
        if (!url) return;
        try {
            bucket[key] = await load(url);
        } catch (e) {
            // Asset missing, render falls back to placeholder. We
            // don't throw because a missing piece shouldn't crash the
            // whole mode.
            // eslint-disable-next-line no-console
            console.warn(`[building] failed to load ${key} from ${url}`, e);
        }
    }));
}

// ─── Public API ───────────────────────────────────────────────────────

export async function preloadBuildingAssets(opts: {
    pieceTemplateIds: string[];
    objectIds?: string[];
    sceneIds?: string[];
}): Promise<void> {
    await Promise.all([
        loadInto(registry.pieces,  PIECE_URLS,  opts.pieceTemplateIds),
        loadInto(registry.objects, OBJECT_URLS, opts.objectIds ?? []),
        loadInto(registry.scene,   SCENE_URLS,  opts.sceneIds ?? []),
    ]);
}

export function getPieceSprite(templateId: string): HTMLImageElement | null {
    return registry.pieces[templateId] ?? null;
}

export function getObjectSprite(objectId: string): HTMLImageElement | null {
    return registry.objects[objectId] ?? null;
}

export function getSceneSprite(sceneId: string): HTMLImageElement | null {
    return registry.scene[sceneId] ?? null;
}

export function hasObjectThumbnail(objectId: string): boolean {
    return !!OBJECT_URLS[objectId];
}

export function getObjectThumbnailUrl(objectId: string): string | null {
    return OBJECT_URLS[objectId] ?? null;
}
