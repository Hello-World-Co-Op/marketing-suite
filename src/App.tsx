import { Suspense, lazy } from 'react';
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

/**
 * Marketing Suite App
 * Public-facing marketing pages - no authentication required
 * Routes: / (Launch Page), /privacy-policy
 */
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LaunchPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
