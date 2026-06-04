import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureError, type CaptureErrorOptions } from '../lib/observability';

/**
 * ErrorBoundary, top-level safety net.
 *
 * Wraps a subtree, catches render-time errors, reports them through
 * the observability layer (Sentry + in-memory health registry), and
 * shows a friendly fallback. NEVER shows stack traces, error
 * messages, or anything technical, this is a child-facing surface.
 *
 * Use the `scope` prop to tell observability which subsystem
 * crashed. Useful scopes: 'camera', 'tracker', 'gamemode',
 * 'classmode', 'insights', 'landing', 'onboarding'. Defaults to
 * 'boundary'.
 */
interface ErrorBoundaryProps {
    children: ReactNode;
    /** Optional override fallback. If omitted, the friendly default renders. */
    fallback?: ReactNode;
    /** Subsystem tag passed to Sentry as `scope`. */
    scope?: NonNullable<CaptureErrorOptions['scope']>;
    /** Optional callback that fires after the error has been reported. */
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    /** Friendly message override, keep it warm, never technical. */
    message?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Console log preserved for local dev, Sentry handles prod.
        console.error('Draw in the Air ErrorBoundary:', error, errorInfo);

        // Report through the observability layer. The scope tag lets us
        // see in Sentry which subsystem actually broke.
        try {
            captureError(error, {
                scope: this.props.scope ?? 'boundary',
                level: 'error',
                extras: {
                    // Trim the component stack to keep events small
                    // and avoid leaking deeply-nested file paths.
                    componentStack: (errorInfo.componentStack ?? '').slice(0, 1000),
                },
                fingerprint: [
                    this.props.scope ?? 'boundary',
                    error.name,
                    // Use the error message minus dynamic numbers so similar
                    // errors group together in Sentry.
                    (error.message || '').replace(/\d+/g, 'N').slice(0, 80),
                ],
            });
        } catch {
            // Reporting must never crash the fallback render.
        }

        if (this.props.onError) {
            try {
                this.props.onError(error, errorInfo);
            } catch {
                // ignore consumer errors
            }
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Friendly fallback. Notice: NO error.message, NO stack,
            // NO scope tag visible to the user. Just a warm nudge.
            const message =
                this.props.message ??
                "Something got stuck. Let's refresh and try again.";

            return (
                <div
                    role="alert"
                    aria-live="polite"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        background: '#010C24',
                        color: 'white',
                        padding: '2rem',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }} aria-hidden="true">🌈</div>
                    <h2 style={{ marginBottom: '1rem' }}>Oops!</h2>
                    <p style={{ marginBottom: '2rem', opacity: 0.85, maxWidth: 380 }}>
                        {message}
                    </p>
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        style={{
                            padding: '1rem 2rem',
                            fontSize: '1.1rem',
                            background: '#FFD93D',
                            border: 'none',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                            color: '#010C24',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Tiny wrapper that fixes a scope tag. Use for sub-tree boundaries
 * inside specific features so we can tell from Sentry whether the
 * camera, tracker, or class mode broke without inspecting stacks.
 *
 *   <ScopedErrorBoundary scope="camera">
 *     <CameraSurface />
 *   </ScopedErrorBoundary>
 */
export function ScopedErrorBoundary({
    scope,
    children,
    fallback,
    message,
}: {
    scope: NonNullable<CaptureErrorOptions['scope']>;
    children: ReactNode;
    fallback?: ReactNode;
    message?: string;
}) {
    return (
        <ErrorBoundary scope={scope} fallback={fallback} message={message}>
            {children}
        </ErrorBoundary>
    );
}
