export type MessageCardVariant = 'success' | 'info' | 'warning';

export interface MessageCardOptions {
    text: string;
    variant?: MessageCardVariant;
    durationMs?: number;
}

const COPY_BANK = [
    'Nice one',
    'Great job',
    'Keep going',
    'You\u2019re getting it',
    'Almost there',
    'Brilliant',
];

let lastCopyIndex = -1;

export function getRandomMessageCopy(): string {
    if (COPY_BANK.length === 0) return 'Nice one';
    let idx = 0;
    do {
        idx = Math.floor(Math.random() * COPY_BANK.length);
    } while (idx === lastCopyIndex && COPY_BANK.length > 1);
    lastCopyIndex = idx;
    return COPY_BANK[idx];
}

type OverlayElements = {
    container: HTMLDivElement;
    card: HTMLDivElement;
    text: HTMLDivElement;
};

let elements: OverlayElements | null = null;
let hideTimeout: number | null = null;
let exitTimeout: number | null = null;
let failsafeTimeout: number | null = null;
let activeToastId = 0;
let showTimestamp = 0;

const DEFAULT_DURATION_MS = 1000;
const FAILSAFE_EXTRA_MS = 500;

const clearTimers = () => {
    if (hideTimeout !== null) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    if (exitTimeout !== null) {
        clearTimeout(exitTimeout);
        exitTimeout = null;
    }
    if (failsafeTimeout !== null) {
        clearTimeout(failsafeTimeout);
        failsafeTimeout = null;
    }
};

export function registerMessageCardOverlay(container: HTMLDivElement, card: HTMLDivElement, text: HTMLDivElement): void {
    elements = { container, card, text };
}

export function unregisterMessageCardOverlay(): void {
    clearTimers();
    if (elements) {
        elements.card.classList.remove('visible', 'hiding');
        elements.container.style.display = 'none';
    }
    elements = null;
}

const setPlacement = (): void => {
    if (!elements) return;
    const { card } = elements;
    card.classList.remove('message-card--top-right');
    card.classList.add('message-card--top-center');

    const hudElements = Array.from(document.querySelectorAll('[data-hud-anchor="top"]')) as HTMLElement[];
    if (hudElements.length === 0) return;

    const cardRect = card.getBoundingClientRect();
    const overlaps = hudElements.some((el) => {
        const rect = el.getBoundingClientRect();
        return !(
            rect.right < cardRect.left ||
            rect.left > cardRect.right ||
            rect.bottom < cardRect.top ||
            rect.top > cardRect.bottom
        );
    });

    if (overlaps) {
        card.classList.remove('message-card--top-center');
        card.classList.add('message-card--top-right');
    }
};

const forceHide = (): void => {
    if (!elements) return;
    const { card, container } = elements;
    card.classList.remove('visible', 'hiding');
    container.style.display = 'none';
};

const hideMessageCard = (toastId: number): void => {
    if (!elements || toastId !== activeToastId) return;
    const { card, container } = elements;
    card.classList.remove('visible');
    card.classList.add('hiding');
    exitTimeout = window.setTimeout(() => {
        if (!elements || toastId !== activeToastId) return;
        card.classList.remove('hiding');
        container.style.display = 'none';
    }, 130);
};

export function showMessageCard({ text, variant = 'info', durationMs = DEFAULT_DURATION_MS }: MessageCardOptions): void {
    if (!elements) return;
    const { container, card, text: textEl } = elements;

    activeToastId += 1;
    const toastId = activeToastId;
    showTimestamp = Date.now();

    clearTimers();
    container.style.display = 'flex';
    card.classList.remove('hiding', 'visible');
    card.classList.remove('variant-success', 'variant-info', 'variant-warning');
    card.classList.add(`variant-${variant}`);
    textEl.textContent = text;

    void card.offsetWidth;
    setPlacement();
    card.classList.add('visible');

    const duration = Math.min(Math.max(durationMs, 900), 1200);
    hideTimeout = window.setTimeout(() => {
        hideMessageCard(toastId);
    }, duration);

    // Failsafe: force hide if still visible after duration + 500ms
    failsafeTimeout = window.setTimeout(() => {
        if (!elements) return;
        // Verify this toast is still the active one
        if (toastId !== activeToastId) return;
        // Check if still showing
        if (Date.now() - showTimestamp >= duration) {
            forceHide();
        }
    }, duration + FAILSAFE_EXTRA_MS);
}
