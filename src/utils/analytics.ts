/**
 * Analytics Tracking Utility
 *
 * Supports multiple analytics providers:
 * - PostHog
 * - Google Analytics (gtag)
 * - Custom backend endpoint
 */

// Type-safe property value types for analytics
type AnalyticsPropertyValue = string | number | boolean | null | undefined | Date;
type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

type GtagFunction = (command: string, targetOrEvent: string, config?: AnalyticsProperties) => void;

declare global {
  interface Window {
    gtag?: GtagFunction;
    posthog?: {
      capture: (event: string, properties?: AnalyticsProperties) => void;
      identify: (userId: string, properties?: AnalyticsProperties) => void;
      setPersonPropertiesForFlags: (properties: AnalyticsProperties) => void;
    };
  }
}

export interface AnalyticsEvent {
  event: string;
  properties?: AnalyticsProperties;
}

/**
 * Track an analytics event
 */
export function trackEvent(event: string, properties?: AnalyticsProperties): void {
  const eventData = {
    ...properties,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('Analytics Event:', event, eventData);
  }

  // PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(event, eventData);
  }

  // Google Analytics (gtag)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, eventData);
  }

  // Custom backend endpoint (optional)
  sendToBackend(event, eventData);
}

/**
 * Track form submission
 */
export function trackFormSubmit(formType: string, success: boolean, errorMessage?: string): void {
  trackEvent('form_submit', {
    form_type: formType,
    success,
    error_message: errorMessage,
  });
}

/**
 * Track email verification
 */
export function trackEmailVerification(success: boolean, errorMessage?: string): void {
  trackEvent('email_verification', {
    success,
    error_message: errorMessage,
  });
}

/**
 * Send event to custom backend endpoint
 */
async function sendToBackend(event: string, data: AnalyticsProperties): Promise<void> {
  const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;

  if (!analyticsEndpoint) {
    return;
  }

  try {
    await fetch(analyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        user_id: getUserId(),
      }),
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to send analytics to backend:', error);
    }
  }
}

/**
 * Get or create anonymous user ID for tracking
 */
function getUserId(): string {
  const USER_ID_KEY = 'analytics_user_id';

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Identify user (call after email verification)
 */
export function identifyUser(email: string): void {
  const userId = getUserId();

  // PostHog
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.identify(userId, {
      email: email,
      email_domain: email.split('@')[1],
    });
  }

  // Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID as string, {
      user_id: userId,
    });
  }
}
