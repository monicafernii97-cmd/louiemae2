import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to an error reporting service in production
        if (process.env.NODE_ENV === 'production') {
            // Could send to Sentry, LogRocket, etc.
        }
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-cream">
                    <div className="max-w-md text-center p-8">
                        <div className="text-6xl mb-4">🌿</div>
                        <h1 className="font-serif text-2xl text-earth mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-earth/60 mb-6">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        <div className="space-x-4">
                            <button
                                onClick={this.handleReload}
                                className="bg-earth text-cream px-6 py-3 text-xs uppercase tracking-widest hover:bg-bronze transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="border border-earth text-earth px-6 py-3 text-xs uppercase tracking-widest hover:bg-earth hover:text-cream transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details className="mt-8 text-left text-sm text-earth/50">
                                <summary className="cursor-pointer hover:text-earth">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 p-4 bg-earth/5 overflow-auto text-xs">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
