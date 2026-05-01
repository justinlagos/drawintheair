/**
 * Toast Service — Lightweight overlay, no React rerenders
 *
 * - Single DOM node, positioned top-center with safe margins
 * - CSS transitions for enter/exit (transform + opacity only)
 * - pointer-events: none
 * - One toast visible at a time, others queued
 * - No layout shift
 *
 * Usage:
 *   import { showToast } from './toastService';
 *   showToast('Nice one! 🎉', 'success', 2000);
 */

export type ToastVariant = 'success' | 'info' | 'warning';

interface QueuedToast {
    message: string;
    variant: ToastVariant;
    durationMs: number;
}

/** Motivation copy bank — rotated randomly. Plain words (no emoji) per the
 *  bright Kid-UI design language — visual feedback comes from the toast
 *  styling itself, not pictographic clutter inside the message. */
const MOTIVATION_BANK = [
    'Nice one!',
    'Great match!',
    'Keep going!',
    "You're doing well!",
    'Almost there!',
    'Level up!',
    'Awesome!',
    'Way to go!',
    'Super!',
    'Fantastic!',
];

let _lastMotivationIndex = -1;

/** Get a random motivation message (non-repeating) */
export function getRandomMotivation(): string {
    let idx: number;
    do {
        idx = Math.floor(Math.random() * MOTIVATION_BANK.length);
    } while (idx === _lastMotivationIndex && MOTIVATION_BANK.length > 1);
    _lastMotivationIndex = idx;
    return MOTIVATION_BANK[idx];
}

class ToastService {
    private container: HTMLDivElement | null = null;
    private label: HTMLDivElement | null = null;
    private queue: QueuedToast[] = [];
    private isShowing = false;
    private hideTimeout: number | null = null;
    private classTimeout: number | null = null;

    private ensureContainer(): void {
        if (this.container) return;

        const container = document.createElement('div');
        container.id = 'toast-overlay';
        container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 500;
      pointer-events: none;
      display: flex;
      justify-content: center;
      padding-top: max(env(safe-area-inset-top, 16px), 16px);
    `;

        const label = document.createElement('div');
        label.className = 'game-toast';
        // Bright Kid-UI styling: cream pill, charcoal text, soft drop shadow.
        // Variant border colour is set per-toast in show() below.
        label.style.cssText = `
      pointer-events: none;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      border-radius: 9999px;
      background: #FFFFFF;
      border: 2px solid rgba(108, 63, 164, 0.18);
      font-family: 'Fredoka', 'Baloo 2', system-ui, sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: #3F4052;
      box-shadow: 0 6px 20px rgba(108, 63, 164, 0.16), 0 2px 4px rgba(108, 63, 164, 0.08);
      white-space: nowrap;
      transform: translateY(-20px);
      opacity: 0;
      transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
      will-change: transform, opacity;
    `;

        container.appendChild(label);
        document.body.appendChild(container);

        this.container = container;
        this.label = label;
    }

    show(message: string, variant: ToastVariant = 'success', durationMs = 2000): void {
        if (this.isShowing) {
            // Queue it if something is already visible
            this.queue.push({ message, variant, durationMs });
            return;
        }

        this.ensureContainer();
        if (!this.label) return;

        this.isShowing = true;

        // Set variant border colour — kid-bright tokens.
        // success → meadow green, warning → sunshine, info → aqua
        const borderColor = variant === 'success' ? 'rgba(126, 217, 87, 0.65)'
            : variant === 'warning' ? 'rgba(255, 216, 77, 0.75)'
                : 'rgba(85, 221, 224, 0.65)';
        this.label.style.borderColor = borderColor;

        // Set content
        this.label.textContent = message;

        // Force reflow, then animate in
        void this.label.offsetWidth;
        this.label.style.transform = 'translateY(0)';
        this.label.style.opacity = '1';

        // Schedule hide
        if (this.hideTimeout !== null) clearTimeout(this.hideTimeout);
        if (this.classTimeout !== null) clearTimeout(this.classTimeout);

        this.hideTimeout = window.setTimeout(() => {
            this.hide();
        }, durationMs);
    }

    private hide(): void {
        if (!this.label) {
            this.isShowing = false;
            return;
        }

        // Animate out
        this.label.style.transform = 'translateY(-10px)';
        this.label.style.opacity = '0';
        this.label.style.transitionDuration = '140ms';

        this.classTimeout = window.setTimeout(() => {
            // Reset transition duration
            if (this.label) {
                this.label.style.transitionDuration = '180ms';
            }
            this.isShowing = false;

            // Process queue
            if (this.queue.length > 0) {
                const next = this.queue.shift()!;
                this.show(next.message, next.variant, next.durationMs);
            }
        }, 150);
    }
}

const toastService = new ToastService();

/** Show a toast notification. Only one visible at a time; others queued. */
export function showToast(message: string, variant: ToastVariant = 'success', durationMs = 2000): void {
    toastService.show(message, variant, durationMs);
}
