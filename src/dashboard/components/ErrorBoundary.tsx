import * as React from "react";
import { type ReactNode } from "react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app">
          <div className="container">
            <Card>
              <CardHeader>
                <CardTitle>Something went wrong</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="subtle" style={{ marginBottom: 16 }}>
                  An error occurred while loading the dashboard.
                </p>
                {this.state.error && (
                  <pre
                    style={{
                      padding: 12,
                      background: "var(--muted)",
                      borderRadius: 6,
                      fontSize: 12,
                      overflow: "auto",
                      marginBottom: 16,
                    }}
                  >
                    {this.state.error.message}
                  </pre>
                )}
                <Button onClick={this.handleReload}>Reload page</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
