/**
 * Analytics Consent Utility
 *
 * Minimal consent status checker for analytics beacons.
 * Reads the `analytics_consent` localStorage key and respects
 * the Do Not Track (DNT) browser signal.
 *
 * SSR-safe: returns 'pending' when `window` is not available
 * (e.g., during Vite pre-rendering via entry-prerender.tsx).
 */

export type ConsentStatus = 'granted' | 'denied' | 'pending';

const CONSENT_KEY = 'analytics_consent';

function isDNTEnabled(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const dnt =
    navigator.doNotTrack ||
    (window as unknown as { doNotTrack?: string }).doNotTrack ||
    (navigator as unknown as { msDoNotTrack?: string }).msDoNotTrack;
  return dnt === '1' || dnt === 'yes';
}

export function getConsentStatus(): ConsentStatus {
  if (typeof window === 'undefined') return 'pending'; // SSR safety
  if (isDNTEnabled()) return 'denied';
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === 'granted' || stored === 'denied') return stored;
  return 'pending';
}
