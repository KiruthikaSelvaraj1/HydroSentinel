import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Simple error boundary for debugging
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a2e', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <pre style={{ color: '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ color: '#9ca3af', fontSize: '12px', marginTop: '10px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
