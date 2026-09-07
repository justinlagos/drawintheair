/**
 * WP2B.3 (DIA-020): the hand tracking runtime must load from our own
 * origin first and fall back to the public CDNs only when the self-hosted
 * copy is unreachable. These tests pin the fallback order with a fake
 * fetch so no network or browser is needed.
 */
import { describe, it, expect } from 'vitest';
import {
    resolveWasmBase,
    resolveModel,
    resolveTrackingAssets,
    selfHostedWasmBaseUrl,
    selfHostedModelUrl,
    CDN_WASM_BASE_URL,
    CDN_MODEL_URL,
    MIN_MODEL_BYTES,
    WASM_PROBE_FILENAME,
    TASKS_VISION_VERSION,
} from '../src/core/trackingAssets';

const ORIGIN = 'https://drawintheair.com';
const SELF_WASM = selfHostedWasmBaseUrl(ORIGIN);
const SELF_PROBE = `${SELF_WASM}/${WASM_PROBE_FILENAME}`;
const SELF_MODEL = selfHostedModelUrl(ORIGIN);

type Reply =
    | { kind: 'ok'; bytes?: number; contentType?: string }
    | { kind: 'status'; status: number }
    | { kind: 'html' }
    | { kind: 'network-error' }
    | { kind: 'hang' };

function makeResponse(reply: Reply): Response {
    if (reply.kind === 'status') {
        return new Response('nope', { status: reply.status });
    }
    if (reply.kind === 'html') {
        return new Response('<!doctype html><title>SPA</title>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        });
    }
    const bytes = reply.kind === 'ok' ? (reply.bytes ?? MIN_MODEL_BYTES) : 0;
    return new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { 'content-type': (reply.kind === 'ok' && reply.contentType) || 'application/octet-stream' },
    });
}

/** Fake fetch: routes by URL, records the order of calls. */
function fakeFetch(routes: Record<string, Reply>) {
    const calls: string[] = [];
    const fetchFn = ((input: RequestInfo | URL): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        calls.push(url);
        const reply = routes[url];
        if (!reply) return Promise.reject(new Error(`unexpected fetch: ${url}`));
        if (reply.kind === 'network-error') return Promise.reject(new TypeError('Failed to fetch'));
        if (reply.kind === 'hang') return new Promise(() => { /* never resolves */ });
        return Promise.resolve(makeResponse(reply));
    }) as typeof fetch;
    return { fetchFn, calls };
}

describe('trackingAssets constants', () => {
    it('pins the self-hosted path to the installed tasks-vision version', () => {
        expect(SELF_WASM).toBe(`${ORIGIN}/mediapipe/${TASKS_VISION_VERSION}/wasm`);
        expect(SELF_MODEL).toBe(`${ORIGIN}/mediapipe/${TASKS_VISION_VERSION}/hand_landmarker.task`);
        expect(CDN_WASM_BASE_URL).toContain(`@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`);
        expect(CDN_MODEL_URL).toBe(
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        );
    });
});

describe('resolveWasmBase', () => {
    it('uses own origin when the loader probe succeeds', async () => {
        const { fetchFn, calls } = fakeFetch({ [SELF_PROBE]: { kind: 'ok', bytes: 10, contentType: 'text/javascript' } });
        const r = await resolveWasmBase({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('self');
        expect(r.baseUrl).toBe(SELF_WASM);
        expect(r.selfError).toBeUndefined();
        expect(calls).toEqual([SELF_PROBE]);
    });

    it('falls back to the CDN on a network error', async () => {
        const { fetchFn } = fakeFetch({ [SELF_PROBE]: { kind: 'network-error' } });
        const r = await resolveWasmBase({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.baseUrl).toBe(CDN_WASM_BASE_URL);
        expect(r.selfError).toContain('Failed to fetch');
    });

    it('falls back to the CDN on a non-200 status', async () => {
        const { fetchFn } = fakeFetch({ [SELF_PROBE]: { kind: 'status', status: 404 } });
        const r = await resolveWasmBase({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('HTTP 404');
    });

    it('treats an HTML 200 (SPA catch-all rewrite) as a miss', async () => {
        const { fetchFn } = fakeFetch({ [SELF_PROBE]: { kind: 'html' } });
        const r = await resolveWasmBase({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('text/html');
    });

    it('falls back to the CDN when the probe hangs past the timeout', async () => {
        const { fetchFn } = fakeFetch({ [SELF_PROBE]: { kind: 'hang' } });
        const r = await resolveWasmBase({ fetch: fetchFn, origin: ORIGIN, timeoutMs: 20 });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('Timeout');
    });
});

describe('resolveModel', () => {
    it('uses the self-hosted model and never touches the CDN when it loads', async () => {
        const { fetchFn, calls } = fakeFetch({ [SELF_MODEL]: { kind: 'ok' } });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('self');
        expect(r.url).toBe(SELF_MODEL);
        expect(r.buffer.byteLength).toBe(MIN_MODEL_BYTES);
        expect(calls).toEqual([SELF_MODEL]);
    });

    it('tries own origin first, then the CDN, on a network error', async () => {
        const { fetchFn, calls } = fakeFetch({
            [SELF_MODEL]: { kind: 'network-error' },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.url).toBe(CDN_MODEL_URL);
        expect(r.selfError).toContain('Failed to fetch');
        expect(calls).toEqual([SELF_MODEL, CDN_MODEL_URL]);
    });

    it('falls back on a non-200 status', async () => {
        const { fetchFn, calls } = fakeFetch({
            [SELF_MODEL]: { kind: 'status', status: 500 },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(calls).toEqual([SELF_MODEL, CDN_MODEL_URL]);
    });

    it('rejects an HTML page masquerading as the model', async () => {
        const { fetchFn } = fakeFetch({
            [SELF_MODEL]: { kind: 'html' },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('text/html');
    });

    it('rejects a body that is too small to be the model', async () => {
        const { fetchFn } = fakeFetch({
            [SELF_MODEL]: { kind: 'ok', bytes: 512 },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('too small');
    });

    it('throws with both reasons when own origin and the CDN both fail', async () => {
        const { fetchFn, calls } = fakeFetch({
            [SELF_MODEL]: { kind: 'status', status: 404 },
            [CDN_MODEL_URL]: { kind: 'network-error' },
        });
        await expect(resolveModel({ fetch: fetchFn, origin: ORIGIN })).rejects.toThrow(/self: .*HTTP 404.*cdn: .*Failed to fetch/);
        expect(calls).toEqual([SELF_MODEL, CDN_MODEL_URL]);
    });

    it('times out a hanging self-hosted fetch and falls back', async () => {
        const { fetchFn } = fakeFetch({
            [SELF_MODEL]: { kind: 'hang' },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveModel({ fetch: fetchFn, origin: ORIGIN, timeoutMs: 20 });
        expect(r.source).toBe('cdn');
        expect(r.selfError).toContain('Timeout');
    });
});

describe('resolveTrackingAssets', () => {
    it('resolves WASM and model independently (mixed sources are possible)', async () => {
        const { fetchFn } = fakeFetch({
            [SELF_PROBE]: { kind: 'ok', bytes: 10, contentType: 'text/javascript' },
            [SELF_MODEL]: { kind: 'status', status: 404 },
            [CDN_MODEL_URL]: { kind: 'ok' },
        });
        const r = await resolveTrackingAssets({ fetch: fetchFn, origin: ORIGIN });
        expect(r.wasm.source).toBe('self');
        expect(r.model.source).toBe('cdn');
    });

    it('is fully self-hosted when both CDN hosts are unreachable', async () => {
        const { fetchFn, calls } = fakeFetch({
            [SELF_PROBE]: { kind: 'ok', bytes: 10, contentType: 'text/javascript' },
            [SELF_MODEL]: { kind: 'ok' },
            [CDN_MODEL_URL]: { kind: 'network-error' },
        });
        const r = await resolveTrackingAssets({ fetch: fetchFn, origin: ORIGIN });
        expect(r.wasm.source).toBe('self');
        expect(r.model.source).toBe('self');
        expect(calls).not.toContain(CDN_MODEL_URL);
    });
});
