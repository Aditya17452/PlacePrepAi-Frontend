import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Catches render errors so one broken widget does not blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The page hit an unexpected error. Your interview progress and tokens are saved on the server.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium"
              onClick={() => window.location.assign("/")}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
