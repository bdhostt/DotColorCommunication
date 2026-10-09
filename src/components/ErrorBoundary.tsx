import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
interface Props {
    children: ReactNode;
}
interface State {
    hasError: boolean;
    error: Error | null;
}
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };
    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    private handleReload = () => {
        window.location.reload();
    };
    public render() {
        if (this.state.hasError) {
            return (<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-200 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <AlertTriangle className="w-7 h-7"/>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred. Please reload the page."}
            </p>
            <button type="button" onClick={this.handleReload} className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer">
              <RefreshCw className="w-4 h-4"/>
              <span>Reload Page</span>
            </button>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
