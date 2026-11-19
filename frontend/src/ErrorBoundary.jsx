import { Component } from "react";
import { useLocation } from "react-router";
import { pageIdentity } from "./lib/pagePaths";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-6">
          <div role="alert" className="alert alert-error max-w-md">
            <span>Something went wrong on this page.</span>
            <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  // A new page starts without the last page's error; a detail page moving to its canonical address is the same page.
  return <ErrorBoundary key={pageIdentity(location.pathname)}>{children}</ErrorBoundary>;
}
