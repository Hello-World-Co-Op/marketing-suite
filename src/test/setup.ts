import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock i18next for all tests
vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, defaultValue?: string) => defaultValue || `${ns || 'common'}:${key}`,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) =>
    children || i18nKey || null,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Browser-only mocks — skip when running in Node environment (e.g., SSR tests)
if (typeof window !== 'undefined') {
  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    value: MockIntersectionObserver,
    writable: true,
  });

  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
}
