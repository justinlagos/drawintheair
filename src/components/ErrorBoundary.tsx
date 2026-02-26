import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
        // eslint-disable-next-line no-console
        console.error('Draw in the Air ErrorBoundary:', error, errorInfo);
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
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

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        background: '#010C24',
                        color: 'white',
                        padding: '2rem',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😢</div>
                    <h2 style={{ marginBottom: '1rem' }}>Oops! Something went wrong</h2>
                    <p style={{ marginBottom: '2rem', opacity: 0.8 }}>
                        Let&apos;s try that again.
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
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
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

