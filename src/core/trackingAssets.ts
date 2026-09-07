/**
 * trackingAssets: decides where the MediaPipe hand tracking runtime loads
 * from (DIA-020, WP2B.3).
 *
 * Order of preference for both the WASM runtime and the hand_landmarker
 * model:
 *   1. Our own origin, under /mediapipe/<version>/ (copied verbatim from
 *      node_modules/@mediapipe/tasks-vision/wasm plus the model file, and
 *      served immutable-cached by vercel.json).
 *   2. The public CDNs the app used before (jsdelivr for WASM/JS,
 *      storage.googleapis.com for the model).
 *
 * Why: school content filters often block one or both CDN hosts. When that
 * happened the camera started but tracking never did, so the whole product
 * was unusable. Serving from our own origin means a school only has to
 * allow drawintheair.com. The CDN path stays as an automatic fallback for
 * any deploy or host where the self-hosted files are missing.
 *
 * The functions here are pure with respect to the network: `fetch`,
 * timeout and origin are injectable so the fallback order can be unit
 * tested without a browser.
 */

// Pin to the version actually resolved in package-lock.json (the
// installed JS). The JS to WASM API contract is version locked, so the
// self-hosted copy under public/mediapipe/<version>/ and this constant
// must move together. To verify after `npm install`:
//   grep -A1 '"node_modules/@mediapipe/tasks-vision"' package-lock.json
export const TASKS_VISION_VERSION = '0.10.32';

/** Path prefix (own origin) for the self-hosted runtime. */
export const SELF_HOSTED_BASE_PATH = `/mediapipe/${TASKS_VISION_VERSION}`;
export const SELF_HOSTED_WASM_PATH = `${SELF_HOSTED_BASE_PATH}/wasm`;
export const SELF_HOSTED_MODEL_PATH = `${SELF_HOSTED_BASE_PATH}/hand_landmarker.task`;

export const CDN_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
export const CDN_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * The loader script MediaPipe requests first. We probe this file (not the
 * 11 MB binary) to decide whether the self-hosted runtime is reachable.
 * The GET also warms the browser cache for the real load that follows.
 */
export const WASM_PROBE_FILENAME = 'vision_wasm_internal.js';

/**
 * hand_landmarker.task (float16 v1) is 7,819,105 bytes. Anything much
 * smaller is not the model (for example an SPA index.html served by a
 * catch-all rewrite, or an error page from a captive portal).
 */
export const MIN_MODEL_BYTES = 1_000_000;

export const ASSET_FETCH_TIMEOUT_MS = 15_000;

export type TrackingAssetSource = 'self' | 'cdn';

export interface ResolvedWasm {
    source: TrackingAssetSource;
    /** Base URL to hand to FilesetResolver.forVisionTasks. */
    baseUrl: string;
    /** Why the self-hosted copy was skipped, if it was. */
    selfError?: string;
}

export interface ResolvedModel {
    source: TrackingAssetSource;
    url: string;
    buffer: ArrayBuffer;
    /** Why the self-hosted copy was skipped, if it was. */
    selfError?: string;
}

export interface ResolveDeps {
    fetch?: typeof fetch;
    timeoutMs?: number;
    /** Origin used to absolutise self-hosted paths. Defaults to location.origin. */
    origin?: string;
}

const defaultOrigin = (): string => {
    if (typeof globalThis.location !== 'undefined' && globalThis.location?.origin) {
        return globalThis.location.origin;
    }
    return '';
};

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
        promise.then(
            (v) => { clearTimeout(t); resolve(v); },
            (e) => { clearTimeout(t); reject(e); },
        );
    });
};

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const looksLikeHtml = (res: Response): boolean => {
    const ct = res.headers?.get?.('content-type') ?? '';
    return ct.toLowerCase().includes('text/html');
};

/** Absolute URL for the self-hosted WASM directory. */
export const selfHostedWasmBaseUrl = (origin: string = defaultOrigin()): string =>
    `${origin}${SELF_HOSTED_WASM_PATH}`;

/** Absolute URL for the self-hosted model file. */
export const selfHostedModelUrl = (origin: string = defaultOrigin()): string =>
    `${origin}${SELF_HOSTED_MODEL_PATH}`;

/**
 * Fetches `url` and rejects unless the response is a 200 that does not look
 * like an HTML page. A catch-all SPA rewrite answers unknown paths with
 * index.html and status 200, which would otherwise pass a naive check.
 */
const fetchOk = async (
    fetchFn: typeof fetch,
    url: string,
    timeoutMs: number,
    label: string,
): Promise<Response> => {
    const res = await withTimeout(fetchFn(url, { method: 'GET', credentials: 'omit' }), timeoutMs, label);
    if (!res.ok) throw new Error(`${label}: HTTP ${res.status}`);
    if (looksLikeHtml(res)) throw new Error(`${label}: got text/html instead of an asset`);
    return res;
};

/**
 * Decide which base URL to give FilesetResolver for the WASM runtime.
 * Probes the self-hosted loader script; on any failure (network error,
 * non-200, HTML response, timeout) returns the CDN base. The CDN itself is
 * not probed here: if it also fails, HandLandmarker.createFromOptions
 * throws exactly as it did before this change.
 */
export async function resolveWasmBase(deps: ResolveDeps = {}): Promise<ResolvedWasm> {
    const fetchFn = deps.fetch ?? globalThis.fetch;
    const timeoutMs = deps.timeoutMs ?? ASSET_FETCH_TIMEOUT_MS;
    const selfBase = selfHostedWasmBaseUrl(deps.origin);
    const probeUrl = `${selfBase}/${WASM_PROBE_FILENAME}`;

    try {
        await fetchOk(fetchFn, probeUrl, timeoutMs, 'self-hosted wasm probe');
        return { source: 'self', baseUrl: selfBase };
    } catch (err) {
        return { source: 'cdn', baseUrl: CDN_WASM_BASE_URL, selfError: errorMessage(err) };
    }
}

const fetchModelBuffer = async (
    fetchFn: typeof fetch,
    url: string,
    timeoutMs: number,
    label: string,
): Promise<ArrayBuffer> => {
    const res = await fetchOk(fetchFn, url, timeoutMs, label);
    const buffer = await withTimeout(res.arrayBuffer(), timeoutMs, `${label} body`);
    if (buffer.byteLength < MIN_MODEL_BYTES) {
        throw new Error(`${label}: body too small (${buffer.byteLength} bytes)`);
    }
    return buffer;
};

/**
 * Download the hand_landmarker model, own origin first, CDN second.
 * Throws only if both sources fail; the error message carries both reasons
 * so the tracker_init_failed event stays diagnosable.
 */
export async function resolveModel(deps: ResolveDeps = {}): Promise<ResolvedModel> {
    const fetchFn = deps.fetch ?? globalThis.fetch;
    const timeoutMs = deps.timeoutMs ?? ASSET_FETCH_TIMEOUT_MS;
    const selfUrl = selfHostedModelUrl(deps.origin);

    let selfError: string;
    try {
        const buffer = await fetchModelBuffer(fetchFn, selfUrl, timeoutMs, 'self-hosted model');
        return { source: 'self', url: selfUrl, buffer };
    } catch (err) {
        selfError = errorMessage(err);
    }

    try {
        const buffer = await fetchModelBuffer(fetchFn, CDN_MODEL_URL, timeoutMs, 'cdn model');
        return { source: 'cdn', url: CDN_MODEL_URL, buffer, selfError };
    } catch (err) {
        throw new Error(`Model load failed. self: ${selfError}; cdn: ${errorMessage(err)}`);
    }
}

export interface ResolvedTrackingAssets {
    wasm: ResolvedWasm;
    model: ResolvedModel;
}

/** Resolve WASM base and model in parallel. */
export async function resolveTrackingAssets(deps: ResolveDeps = {}): Promise<ResolvedTrackingAssets> {
    const [wasm, model] = await Promise.all([resolveWasmBase(deps), resolveModel(deps)]);
    return { wasm, model };
}
