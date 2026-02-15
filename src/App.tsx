import { Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import { Suspense, lazy } from 'react';

// Pre-rendered routes are imported directly (not lazy) to avoid hydration
// mismatches between SSR (synchronous) and client (async with Suspense).
// This ensures SEO-critical pages hydrate instantly without a loading fallback.
import LaunchPage from '@/pages/LaunchPage';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import BlogLanding from '@/pages/blog/BlogLanding';

// Non-SEO routes use lazy loading with Suspense
const Register = lazy(() => import('@/pages/Register'));
const BlogPost = lazy(() => import('@/pages/blog/BlogPost'));

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
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LaunchPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route
              path="/signup"
              element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                  <Register />
                </Suspense>
              }
            />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/blog" element={<BlogLanding />} />
            <Route
              path="/blog/:slug"
              element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900">Loading...</div>}>
                  <BlogPost />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;
