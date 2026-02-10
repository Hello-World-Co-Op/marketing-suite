import { Component, Suspense, lazy, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Route-based code splitting - each page loads on demand
const LaunchPage = lazy(() => import('@/pages/LaunchPage'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));

// Loading fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="animate-pulse text-white text-lg">Loading...</div>
    </div>
  );
}

// ErrorBoundary component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center text-white">
            <h1 className="text-2xl mb-4">Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 rounded">Refresh Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Marketing Suite App
 * Public-facing marketing pages - no authentication required
 * Routes: / (Launch Page), /privacy-policy
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LaunchPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
