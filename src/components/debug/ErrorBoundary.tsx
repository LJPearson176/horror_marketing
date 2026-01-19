import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface Props {
    children: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary:${this.props.name}] caught error:`, error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Html fullscreen style={{ pointerEvents: 'auto', zIndex: 9999 }}>
                    <div style={{
                        padding: '2rem',
                        backgroundColor: '#330000',
                        color: '#ff3333',
                        border: '2px solid red',
                        fontFamily: 'monospace',
                        width: '100%',
                        height: '100%',
                        overflow: 'auto'
                    }}>
                        <h1>CRITICAL FAILURE: {this.props.name || 'Component'}</h1>
                        <h2>{this.state.error?.toString()}</h2>
                        <details style={{ whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo?.componentStack}
                        </details>
                    </div>
                </Html>
            );
        }

        return this.props.children;
    }
}
