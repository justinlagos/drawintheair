/**
 * ActivePlayerLock — primary-player identity lock (Phase 1, hand-only).
 *
 * WHY THIS EXISTS
 * ---------------
 * MediaPipe HandLandmarker returns up to N hands per frame, but it gives NO
 * stable person identity: the "best" hand it returns can flip between people
 * frame to frame. In a classroom (the active child plus teachers and other
 * children behind them) that makes the cursor jump between hands. See
 * docs/PRIMARY_PLAYER_LOCK_ARCHITECTURE.md.
 *
 * This module sits between raw multi-hand detection and the rest of the
 * pipeline. It picks exactly ONE hand to own the session and then *holds* that
 * identity: once locked, a closer/larger/clearer background hand can never
 * steal control. The lock is only cleared by an explicit reset() (teacher
 * "Change player", session end, or deliberate re-entry).
 *
 * It is intentionally pure (no React, no DOM, no MediaPipe imports) so it can
 * be unit-tested with synthetic frames. The caller summarises each detected
 * hand into a {@link HandSample} (see {@link summarizeHand}) and passes the
 * array to {@link ActivePlayerLock.update}, which returns the index of the
 * owned hand (or -1) plus a debug snapshot.
 *
 * STATE FLOW (brief contract):
 *   SEARCHING → CANDIDATE_DETECTED → PLAYER_LOCKED → TEMPORARILY_LOST
 *             → REACQUIRING → (RESET) → SEARCHING
 * RESET is an action (reset()), not a resting state; it returns to SEARCHING.
 *
 * Phase 2 will add Pose/Face body association to make reacquisition robust to
 * a different child stepping into the same spot. Phase 1 uses position + hand
 * scale + temporal continuity only, with conservative gates.
 */

export interface Vec2 {
    x: number;
    y: number;
}

/** One detected hand reduced to the signals the lock needs. */
export interface HandSample {
    /** Wrist (landmark 0), normalised 0..1, already mirrored for display. */
    wrist: Vec2;
    /** Index fingertip (landmark 8) — the interaction point. */
    indexTip: Vec2;
    /** Hand centre used for identity tracking (palm centroid). */
    centroid: Vec2;
    /** Hand size proxy (0..1), larger ≈ closer to camera. */
    scale: number;
}

export type LockState =
    | 'SEARCHING'
    | 'CANDIDATE_DETECTED'
    | 'PLAYER_LOCKED'
    | 'TEMPORARILY_LOST'
    | 'REACQUIRING';

export interface ActivePlayerLockConfig {
    /** A candidate must lead continuously for this long before locking. 500–800ms per brief. */
    lockStabilityMs: number;
    /** How long we hold the cursor and try to reacquire the same hand after it vanishes. */
    reacquireWindowMs: number;
    /** After this long without the owned hand, show the small "bring your hand back" nudge. */
    handBackPromptMs: number;
    /** Max normalised distance from the last-known point to accept a hand as the same identity (brief loss). */
    reacquireGate: number;
    /** Looser gate used after a longer absence — a returning child may raise their hand a little off. */
    reacquireGateLong: number;
    /** Relative hand-scale tolerance when reacquiring (0.5 = ±50%). */
    scaleTolerance: number;
    /** Max normalised distance to treat two frames' hands as the same track. */
    trackGate: number;
    /** Below this hand scale a hand is ignored as a lock candidate (too far / noise). */
    minScaleForCandidate: number;
    /** Scoring weights for choosing the initial leader. */
    centerWeight: number;
    scaleWeight: number;
    stabilityWeight: number;
    /** Hand scale treated as "100%" for the scale score (caps closeness dominance). */
    referenceScale: number;
}

export const DEFAULT_LOCK_CONFIG: ActivePlayerLockConfig = {
    lockStabilityMs: 650,
    reacquireWindowMs: 1500,
    handBackPromptMs: 800,
    reacquireGate: 0.2,
    reacquireGateLong: 0.34,
    scaleTolerance: 0.6,
    trackGate: 0.16,
    minScaleForCandidate: 0.05,
    centerWeight: 0.45,
    scaleWeight: 0.35,
    stabilityWeight: 0.2,
    referenceScale: 0.12,
};

export interface ActivePlayerLockSnapshot {
    state: LockState;
    /** Index into the frame's samples array that owns the session, or -1. */
    ownedIndex: number;
    /** How many plausible candidate hands were seen this frame. */
    candidateCount: number;
    /** Last owned hand size (for debug). */
    ownedScale: number | null;
    /** Last known owned interaction point — held during brief loss. */
    heldPoint: Vec2 | null;
    /** 0..1 confidence in the current lock. */
    confidence: number;
    /** True once the owned hand has been gone long enough to nudge the child. */
    needsHandBackPrompt: boolean;
    /** Internal identity id of the owned track (debug). */
    trackId: number | null;
    /** ms since the owned hand was last seen, or null while present. */
    msSinceLost: number | null;
}

interface Track {
    id: number;
    centroid: Vec2;
    indexTip: Vec2;
    scale: number;
    velocity: Vec2;
    firstSeen: number;
    lastSeen: number;
    sampleIndex: number; // index into the current frame's samples
}

interface OwnedIdentity {
    trackId: number;
    centroid: Vec2;
    indexTip: Vec2;
    scale: number;
    velocity: Vec2;
    lastSeen: number;
}

const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Reduce a hand's 21 normalised landmarks to a {@link HandSample}.
 * Uses wrist (0), index tip (8) and middle-finger MCP (9) for a scale proxy,
 * and a small palm centroid for identity tracking. Returns null if the hand
 * is malformed.
 */
export function summarizeHand(landmarks: ReadonlyArray<{ x: number; y: number }>): HandSample | null {
    if (!landmarks || landmarks.length < 13) return null;
    const wrist = { x: landmarks[0].x, y: landmarks[0].y };
    const indexTip = { x: landmarks[8].x, y: landmarks[8].y };
    const middleMcp = landmarks[9];
    const scale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
    // Palm centroid: wrist + the four finger MCPs (5,9,13,17).
    const mcpIdx = [5, 9, 13, 17];
    let cx = wrist.x;
    let cy = wrist.y;
    for (const i of mcpIdx) {
        cx += landmarks[i].x;
        cy += landmarks[i].y;
    }
    const centroid = { x: cx / 5, y: cy / 5 };
    return { wrist, indexTip, centroid, scale };
}

export class ActivePlayerLock {
    private config: ActivePlayerLockConfig;
    private state: LockState = 'SEARCHING';
    private tracks: Track[] = [];
    private nextTrackId = 1;
    private owned: OwnedIdentity | null = null;

    /** The track that has been leading the candidate race, and since when. */
    private leaderTrackId: number | null = null;
    private leaderSince = 0;
    /** -Infinity = no wave pending (sentinel chosen so `now` can legitimately be 0). */
    private waveAcceptedAt = Number.NEGATIVE_INFINITY;
    private lastSnapshot: ActivePlayerLockSnapshot = {
        state: 'SEARCHING',
        ownedIndex: -1,
        candidateCount: 0,
        ownedScale: null,
        heldPoint: null,
        confidence: 0,
        needsHandBackPrompt: false,
        trackId: null,
        msSinceLost: null,
    };

    constructor(config: Partial<ActivePlayerLockConfig> = {}) {
        this.config = { ...DEFAULT_LOCK_CONFIG, ...config };
    }

    setConfig(config: Partial<ActivePlayerLockConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Clear the active player — held cursor, candidate history and identity —
     * and return to SEARCHING. This is the teacher "Change player" action and
     * the session-end / deliberate-re-entry path. The next player must wave and
     * remain stable before a new lock is acquired.
     */
    reset(now: number = Date.now()): void {
        this.state = 'SEARCHING';
        this.owned = null;
        this.tracks = [];
        this.leaderTrackId = null;
        this.leaderSince = 0;
        this.waveAcceptedAt = Number.NEGATIVE_INFINITY;
        this.lastSnapshot = {
            state: 'SEARCHING',
            ownedIndex: -1,
            candidateCount: 0,
            ownedScale: null,
            heldPoint: null,
            confidence: 0,
            needsHandBackPrompt: false,
            trackId: null,
            msSinceLost: null,
        };
        void now;
    }

    /**
     * Signal that a valid start wave was just accepted. While unlocked, this
     * lets the current best candidate lock immediately rather than waiting out
     * the full stability window — "the child who waves becomes the player".
     */
    notifyWaveAccepted(now: number = Date.now()): void {
        this.waveAcceptedAt = now;
    }

    getSnapshot(): ActivePlayerLockSnapshot {
        return this.lastSnapshot;
    }

    getOwnedIndex(): number {
        return this.lastSnapshot.ownedIndex;
    }

    getState(): LockState {
        return this.state;
    }

    /**
     * Advance the lock by one frame.
     * @param samples one entry per detected hand (already mirrored / normalised)
     * @param now monotonic-ish timestamp in ms
     */
    update(samples: ReadonlyArray<HandSample>, now: number = Date.now()): ActivePlayerLockSnapshot {
        this.matchTracks(samples, now);

        const candidateCount = this.tracks.filter(
            (t) => t.scale >= this.config.minScaleForCandidate,
        ).length;

        if (this.owned) {
            this.updateLocked(now, candidateCount);
        } else {
            this.updateSearching(now, candidateCount);
        }

        return this.lastSnapshot;
    }

    // ---------------------------------------------------------------------
    // Frame-to-frame identity tracking (nearest-neighbour within a gate)
    // ---------------------------------------------------------------------
    private matchTracks(samples: ReadonlyArray<HandSample>, now: number): void {
        const prev = this.tracks;
        const next: Track[] = [];
        const usedPrev = new Set<number>();

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            // Find the nearest previous track within the gate that is not taken.
            let bestIdx = -1;
            let bestDist = this.config.trackGate;
            for (let j = 0; j < prev.length; j++) {
                if (usedPrev.has(j)) continue;
                const d = dist(prev[j].centroid, s.centroid);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = j;
                }
            }

            if (bestIdx >= 0) {
                const p = prev[bestIdx];
                usedPrev.add(bestIdx);
                const dt = Math.max(1, now - p.lastSeen);
                next.push({
                    id: p.id,
                    centroid: s.centroid,
                    indexTip: s.indexTip,
                    scale: s.scale,
                    velocity: {
                        x: (s.centroid.x - p.centroid.x) / dt,
                        y: (s.centroid.y - p.centroid.y) / dt,
                    },
                    firstSeen: p.firstSeen,
                    lastSeen: now,
                    sampleIndex: i,
                });
            } else {
                next.push({
                    id: this.nextTrackId++,
                    centroid: s.centroid,
                    indexTip: s.indexTip,
                    scale: s.scale,
                    velocity: { x: 0, y: 0 },
                    firstSeen: now,
                    lastSeen: now,
                    sampleIndex: i,
                });
            }
        }

        this.tracks = next;
    }

    private findTrackById(id: number | null): Track | null {
        if (id === null) return null;
        return this.tracks.find((t) => t.id === id) ?? null;
    }

    // ---------------------------------------------------------------------
    // Locked branch: follow the owned identity, never switch to another hand.
    // ---------------------------------------------------------------------
    private updateLocked(now: number, candidateCount: number): void {
        const owned = this.owned!;

        // 1) Is the owned track still present this frame (continuity by id)?
        let matched = this.findTrackById(owned.trackId);

        // 2) If not, MediaPipe may have relabelled/dropped it — try to reacquire
        //    the SAME hand by predicted position + similar scale (conservative).
        if (!matched) {
            matched = this.reacquire(owned, now);
        }

        if (matched) {
            // Lock continues / re-established.
            owned.trackId = matched.id;
            owned.centroid = matched.centroid;
            owned.indexTip = matched.indexTip;
            owned.scale = matched.scale;
            owned.velocity = matched.velocity;
            owned.lastSeen = now;
            this.state = 'PLAYER_LOCKED';
            this.emit(matched.sampleIndex, candidateCount, owned, 1, false, null);
            return;
        }

        // 3) Owned hand not visible.
        const sinceLost = now - owned.lastSeen;

        if (sinceLost <= this.config.reacquireWindowMs) {
            // Brief drop — HOLD the cursor and keep the identity reserved, so a
            // background hand can't grab control while the player rests their
            // hand for a moment. A small nudge appears once the hold runs on.
            this.state = 'TEMPORARILY_LOST';
            const confidence = clamp01(1 - sinceLost / this.config.reacquireWindowMs);
            const needsPrompt = sinceLost > this.config.handBackPromptMs;
            this.emit(-1, candidateCount, owned, confidence, needsPrompt, sinceLost);
            return;
        }

        // 4) Gone past the hold window — the player has genuinely left. Drop the
        //    lock and AUTO-RECOVER by re-searching this same frame, so the next
        //    stable hand takes over without any manual "Change player" tap. The
        //    no-steal guarantee still holds whenever the owned hand is present
        //    (steps 1–3); it only relaxes once that hand is truly gone.
        this.owned = null;
        this.leaderTrackId = null;
        this.leaderSince = 0;
        this.updateSearching(now, candidateCount);
    }

    /**
     * Try to bind the owned identity to one of this frame's hands.
     *
     * We anchor on the LAST KNOWN position, not a velocity-extrapolated one: a
     * child who lowers their hand and raises it again returns near where they
     * left, and extrapolating a moving hand's velocity across a multi-second
     * gap throws the predicted point way off-screen (which previously left the
     * cursor permanently stuck in REACQUIRING). The gate widens after a longer
     * absence since a returning hand may reappear a little off. A scale gate
     * keeps a clearly different (much closer/farther) hand from being adopted.
     * Full identity robustness arrives with Pose association in Phase 2.
     */
    private reacquire(owned: OwnedIdentity, now: number): Track | null {
        const sinceLost = now - owned.lastSeen;
        const gate =
            sinceLost <= this.config.reacquireWindowMs
                ? this.config.reacquireGate
                : this.config.reacquireGateLong;
        const anchor = owned.centroid;
        let best: Track | null = null;
        let bestDist = gate;
        for (const t of this.tracks) {
            const d = dist(t.centroid, anchor);
            if (d > gate) continue;
            const scaleOk =
                owned.scale <= 0 ||
                Math.abs(t.scale - owned.scale) / owned.scale <= this.config.scaleTolerance;
            if (!scaleOk) continue;
            if (d < bestDist) {
                bestDist = d;
                best = t;
            }
        }
        return best;
    }

    // ---------------------------------------------------------------------
    // Searching branch: score candidates, lock the stable leader.
    // ---------------------------------------------------------------------
    private updateSearching(now: number, candidateCount: number): void {
        const candidates = this.tracks.filter((t) => t.scale >= this.config.minScaleForCandidate);

        if (candidates.length === 0) {
            this.leaderTrackId = null;
            this.leaderSince = 0;
            this.state = 'SEARCHING';
            this.emit(-1, candidateCount, null, 0, false, null);
            return;
        }

        // Pick the best-scoring candidate as the current leader.
        let leader = candidates[0];
        let bestScore = this.score(leader);
        for (let i = 1; i < candidates.length; i++) {
            const sc = this.score(candidates[i]);
            if (sc > bestScore) {
                bestScore = sc;
                leader = candidates[i];
            }
        }

        // Leader continuity: reset the stability timer if the leader changed.
        if (this.leaderTrackId !== leader.id) {
            this.leaderTrackId = leader.id;
            this.leaderSince = now;
        }

        const heldFor = now - this.leaderSince;
        const waveFresh = now - this.waveAcceptedAt <= this.config.lockStabilityMs;
        const stableEnough = heldFor >= this.config.lockStabilityMs;

        if (stableEnough || (waveFresh && heldFor >= 0)) {
            // Lock onto the leader.
            this.owned = {
                trackId: leader.id,
                centroid: leader.centroid,
                indexTip: leader.indexTip,
                scale: leader.scale,
                velocity: leader.velocity,
                lastSeen: now,
            };
            this.waveAcceptedAt = Number.NEGATIVE_INFINITY;
            this.state = 'PLAYER_LOCKED';
            this.emit(leader.sampleIndex, candidateCount, this.owned, 1, false, null);
            return;
        }

        // Still warming up — a candidate exists but is not yet stable.
        this.state = 'CANDIDATE_DETECTED';
        const confidence = clamp01(heldFor / this.config.lockStabilityMs);
        this.emit(-1, candidateCount, null, confidence, false, null);
    }

    private score(t: Track): number {
        const c = this.config;
        const centrality = 1 - clamp01(dist(t.centroid, { x: 0.5, y: 0.5 }) / 0.7);
        const scaleScore = clamp01(t.scale / c.referenceScale);
        const stability = clamp01((t.lastSeen - t.firstSeen) / c.lockStabilityMs);
        return c.centerWeight * centrality + c.scaleWeight * scaleScore + c.stabilityWeight * stability;
    }

    private emit(
        ownedIndex: number,
        candidateCount: number,
        owned: OwnedIdentity | null,
        confidence: number,
        needsHandBackPrompt: boolean,
        msSinceLost: number | null,
    ): void {
        this.lastSnapshot = {
            state: this.state,
            ownedIndex,
            candidateCount,
            ownedScale: owned ? owned.scale : null,
            heldPoint: owned ? owned.indexTip : null,
            confidence,
            needsHandBackPrompt,
            trackId: owned ? owned.trackId : null,
            msSinceLost,
        };
    }
}

/** App-wide singleton (one camera session = one active player). */
export const activePlayerLock = new ActivePlayerLock();
