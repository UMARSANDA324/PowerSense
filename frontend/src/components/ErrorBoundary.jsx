import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // You can also log error to an external service here
    // console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white p-6">
          <div className="max-w-3xl w-full bg-red-50 border border-red-200 rounded-2xl p-6">
            <h2 className="text-xl font-black text-red-700 mb-2">Unexpected error</h2>
            <p className="text-sm text-red-600 mb-4">An error occurred while rendering the app. Details are shown below.</p>
            <pre className="text-xs text-red-800 bg-white p-3 rounded overflow-auto" style={{whiteSpace: 'pre-wrap'}}>
              {this.state.error && this.state.error.toString()}
              {this.state.info && "\n" + (this.state.info.componentStack || "")}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
