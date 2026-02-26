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

/** Motivation copy bank — rotated randomly */
const MOTIVATION_BANK = [
    'Nice one! 🌟',
    'Great match! ✨',
    'Keep going! 💪',
    'You\'re doing well! ⭐',
    'Almost there! 🔥',
    'Level up! 🚀',
    'Awesome! 🎯',
    'Way to go! 🎉',
    'Super! 🌈',
    'Fantastic! 💫',
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
        label.style.cssText = `
      pointer-events: none;
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 22px;
      border-radius: 9999px;
      background: linear-gradient(145deg, rgba(30,26,60,0.92) 0%, rgba(18,14,45,0.88) 100%);
      border: 1.5px solid rgba(255,255,255,0.12);
      font-size: 0.95rem;
      font-weight: 600;
      color: rgba(255,255,255,0.95);
      white-space: nowrap;
      transform: translateY(-20px);
      opacity: 0;
      transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
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

        // Set variant border color
        const borderColor = variant === 'success' ? 'rgba(0,245,212,0.4)'
            : variant === 'warning' ? 'rgba(255,217,61,0.4)'
                : 'rgba(79,172,254,0.4)';
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
