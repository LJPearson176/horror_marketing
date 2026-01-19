import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[1000] bg-black text-red-500 font-mono p-8 overflow-auto flex flex-col items-center justify-center text-left">
                    <h1 className="text-4xl font-bold mb-4 border-b border-red-800 pb-2 w-full max-w-2xl">SYSTEM CRITICAL FAILURE</h1>
                    <div className="bg-red-900/10 border border-red-900 p-6 rounded max-w-2xl w-full">
                        <h2 className="text-xl mb-2 text-red-400">Error Details:</h2>
                        <pre className="whitespace-pre-wrap break-words text-sm bg-black/50 p-4 rounded mb-4 text-red-300">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <h2 className="text-xl mb-2 text-red-400">Component Stack:</h2>
                        <pre className="whitespace-pre-wrap break-words text-xs bg-black/50 p-4 rounded text-red-800/80">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
