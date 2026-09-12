import { Component, type ReactNode } from "react";
import { FlowButton } from "./flow-button";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("PRANGARA display error:", error, errorInfo);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fatal-error">
          <h1>The workspace needs to reload</h1>
          <p>
            A display error interrupted the page. Your submitted engine data has
            not been changed.
          </p>
          <FlowButton
            text="Reload workspace"
            onClick={() => window.location.reload()}
          />
        </div>
      );
    return this.props.children;
  }
}
