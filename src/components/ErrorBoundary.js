import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>We're having some technical difficulties. Please try again later.</p>
          {this.props.showReset && (
            <button 
              className="btn"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) {
                  this.props.onReset();
                }
              }}
            >
              Try Again
            </button>
          )}
          {this.state.error && this.props.showDetails && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
              <summary>Error Details</summary>
              <p>{this.state.error.toString()}</p>
              <p>{this.state.errorInfo?.componentStack}</p>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 