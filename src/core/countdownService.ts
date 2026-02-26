type CountdownState = {
    active: boolean;
    startedAt: number;
    endsAt: number;
};

const state: CountdownState = {
    active: false,
    startedAt: 0,
    endsAt: 0,
};

const listeners = new Set<() => void>();

export const DEFAULT_COUNTDOWN_MS = 3000;
export const GO_DISPLAY_MS = 250;

const notify = () => {
    listeners.forEach((listener) => listener());
};

export function startCountdown(durationMs: number = DEFAULT_COUNTDOWN_MS): number {
    const now = Date.now();
    state.active = true;
    state.startedAt = now;
    state.endsAt = now + durationMs;
    notify();
    return state.endsAt;
}

export function getCountdownState(): CountdownState {
    return { ...state };
}

export function isCountdownActive(now: number = Date.now()): boolean {
    return state.active && now < state.endsAt;
}

export function isCountdownVisible(now: number = Date.now()): boolean {
    if (!state.active) return false;
    return now < state.endsAt + GO_DISPLAY_MS;
}

export function subscribeCountdown(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function clearCountdown(): void {
    state.active = false;
    state.startedAt = 0;
    state.endsAt = 0;
    notify();
}
