import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any render-time throw unmounts the whole React tree and the
 * user is left staring at a blank white page with nothing in the UI to explain
 * it — which is how both the missing-env crash and the redirect loop presented.
 * A boundary turns those into a readable screen and a recovery action.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook an error reporter in here when one is available; until then the
    // console is the only record, so keep the component stack with it.
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div className="space-y-1">
            <h1 className="text-xl font-bold font-display">Something went wrong</h1>
            <p className="text-muted-foreground text-sm">
              This page hit an unexpected error. Reloading usually clears it — if
              it keeps happening, please report it.
            </p>
          </div>

          {import.meta.env.DEV && (
            <pre className="text-left text-xs bg-muted text-muted-foreground rounded-lg p-3 overflow-auto max-h-48">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
          )}

          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
