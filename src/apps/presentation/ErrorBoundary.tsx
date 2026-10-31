import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Nothing in this app's window ever catches a render-time exception on its
// own — React's default behavior is to unmount the whole subtree, which (with
// no boundary anywhere above it) makes the entire presentation window vanish
// with no explanation. A malformed or older-shaped `.deck` file making it
// past `parsePresentationFile`'s validation is the most likely way to hit
// this (see the normalization added there), but this boundary is the actual
// backstop: whatever throws during render, the user gets an explicit,
// actionable error instead of a window that silently disappeared.
export class PresentationErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Presentation app crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-300 p-8">
          <AlertTriangle size={28} className="text-rose-400" />
          <p className="text-sm font-bold text-rose-200">This presentation couldn't be displayed</p>
          <p className="text-xs text-slate-400 max-w-sm text-center">
            Something in it wasn't in a format this app could render. Your other saved presentations aren't affected.
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Start a new presentation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
