import React from "react";
// Using CSS symbols instead of Font Awesome
const icons = {
  warning: "⚠️",
  refresh: "⟲",
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100">
          <div className="text-center p-8 max-w-md">
            <span className="text-6xl text-error mx-auto mb-4 block">
              {icons.warning}
            </span>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-base-content/70 mb-6">
              The application encountered an unexpected error. This might be due
              to a temporary issue.
            </p>

            {import.meta.env.DEV && (
              <details className="mb-4 text-left bg-base-200 p-4 rounded">
                <summary className="cursor-pointer font-semibold">
                  Error Details
                </summary>
                <pre className="text-xs mt-2 overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary w-full"
              >
                <span className="mr-2">{icons.refresh}</span>
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline w-full"
              >
                Reload Page
              </button>
            </div>

            {this.state.retryCount > 2 && (
              <p className="text-xs text-base-content/50 mt-4">
                If the problem persists, please contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
