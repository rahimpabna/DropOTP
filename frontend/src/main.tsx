import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React UI error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f0f9f5] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl border border-rose-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-slate-900">Something went wrong</h2>
            <p className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 break-words text-left max-h-40 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-[#00674f] hover:bg-[#00503d] text-white font-bold text-sm rounded-xl shadow transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { DialogProvider } from './context/DialogContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DialogProvider>
        <App />
      </DialogProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

