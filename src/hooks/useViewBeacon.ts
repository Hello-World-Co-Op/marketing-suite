/**
 * useViewBeacon Hook
 *
 * Fires analytics beacons for blog post views:
 * 1. Page-load beacon: POST /api/blog/views with { slug, referrer }
 * 2. Page-exit beacon: POST /api/blog/views with { slug, read_time_seconds }
 *    via navigator.sendBeacon (XHR fallback)
 *
 * All beacons are fire-and-forget. Failures are silently ignored.
 * Beacons only fire when analytics consent is 'granted'.
 * Read time tracks only active reading time (pauses when tab is hidden).
 */

import { useEffect, useRef } from 'react';
import { getConsentStatus } from '@/utils/consent';

function getOracleBridgeUrl(): string {
  return import.meta.env.VITE_ORACLE_BRIDGE_URL || 'http://localhost:8787';
}

function sendReadTimeBeacon(slug: string, elapsedSeconds: number): void {
  if (!slug) return;
  if (getConsentStatus() !== 'granted') return;

  const url = `${getOracleBridgeUrl()}/api/blog/views`;
  const payload = JSON.stringify({
    slug,
    read_time_seconds: Math.round(elapsedSeconds),
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
  } else {
    // Fallback for environments where sendBeacon is not available
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, false); // sync XHR
    xhr.setRequestHeader('Content-Type', 'application/json');
    try {
      xhr.send(payload);
    } catch {
      // Intentionally silent
    }
  }
}

export function useViewBeacon(slug: string | undefined): void {
  const activeSecondsRef = useRef<number>(0);
  const lastVisibleRef = useRef<number>(Date.now());

  // Page-load view beacon
  useEffect(() => {
    if (!slug) return;
    if (getConsentStatus() !== 'granted') return;

    const oracleBridgeUrl = getOracleBridgeUrl();
    const referrer = document.referrer || '';

    // Fire-and-forget — do NOT await or handle the response in UI
    fetch(`${oracleBridgeUrl}/api/blog/views`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, referrer }),
    }).catch(() => {
      // Intentionally silent — view beacon failure must not affect UX
    });
  }, [slug]);

  // Read time tracking + visibility change beacon
  useEffect(() => {
    if (!slug) return;

    // Reset tracking state for this slug
    activeSecondsRef.current = 0;
    lastVisibleRef.current = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Accumulate time since last visible
        const elapsed = (Date.now() - lastVisibleRef.current) / 1000;
        activeSecondsRef.current += elapsed;

        // Send read time beacon (consent checked at send time)
        sendReadTimeBeacon(slug, activeSecondsRef.current);
      } else if (document.visibilityState === 'visible') {
        // Reset last visible timestamp
        lastVisibleRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // On unmount (SPA navigation), accumulate remaining time and send beacon
      const elapsed = (Date.now() - lastVisibleRef.current) / 1000;
      activeSecondsRef.current += elapsed;
      sendReadTimeBeacon(slug, activeSecondsRef.current);
    };
  }, [slug]);
}
