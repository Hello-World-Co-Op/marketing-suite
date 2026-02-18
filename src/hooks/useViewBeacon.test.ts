import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewBeacon } from './useViewBeacon';
import { getConsentStatus } from '@/utils/consent';

// ============================================================
// Mock consent module
// ============================================================

vi.mock('@/utils/consent', () => ({
  getConsentStatus: vi.fn(),
}));

const mockGetConsentStatus = getConsentStatus as ReturnType<typeof vi.fn>;

// ============================================================
// Setup and Teardown
// ============================================================

const mockFetch = vi.fn();
const mockSendBeacon = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  mockSendBeacon.mockReturnValue(true);
  vi.stubGlobal('fetch', mockFetch);
  vi.stubEnv('VITE_ORACLE_BRIDGE_URL', 'http://test-oracle:8787');

  // Mock navigator.sendBeacon
  Object.defineProperty(navigator, 'sendBeacon', {
    value: mockSendBeacon,
    writable: true,
    configurable: true,
  });

  // Ensure visibilityState starts as 'visible'
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore visibilityState
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

// ============================================================
// Tests
// ============================================================

describe('useViewBeacon', () => {
  // Test 1: view beacon fires when consent is granted (AC1, AC3)
  it('fires view beacon on mount with slug and referrer when consent is granted', () => {
    mockGetConsentStatus.mockReturnValue('granted');

    renderHook(() => useViewBeacon('test-post'));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-oracle:8787/api/blog/views',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"slug":"test-post"'),
      }),
    );

    // Body should include referrer field
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body).toHaveProperty('slug', 'test-post');
    expect(body).toHaveProperty('referrer');
    // Should NOT include read_time_seconds in the page-load beacon
    expect(body).not.toHaveProperty('read_time_seconds');
  });

  // Test 2: view beacon does NOT fire when consent is denied (AC3)
  it('does NOT fire view beacon when consent is denied', () => {
    mockGetConsentStatus.mockReturnValue('denied');

    renderHook(() => useViewBeacon('test-post'));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Test 3: view beacon does NOT fire when consent is pending (AC3)
  it('does NOT fire view beacon when consent is pending', () => {
    mockGetConsentStatus.mockReturnValue('pending');

    renderHook(() => useViewBeacon('test-post'));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Test 4: view beacon does NOT fire when slug is undefined (AC6)
  it('does NOT fire view beacon when slug is undefined', () => {
    mockGetConsentStatus.mockReturnValue('granted');

    renderHook(() => useViewBeacon(undefined));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Test 5: sendBeacon called when visibility changes to hidden (AC2, AC5)
  it('calls sendBeacon with read_time_seconds when visibility changes to hidden', () => {
    mockGetConsentStatus.mockReturnValue('granted');

    renderHook(() => useViewBeacon('test-post'));

    // Simulate some time passing (the hook uses Date.now())
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    expect(mockSendBeacon).toHaveBeenCalledWith(
      'http://test-oracle:8787/api/blog/views',
      expect.any(Blob),
    );
  });

  // Test 6: fetch failure is swallowed silently (AC4)
  it('swallows fetch failure silently without errors', () => {
    mockGetConsentStatus.mockReturnValue('granted');
    mockFetch.mockRejectedValue(new Error('network error'));

    // Should not throw or log
    expect(() => {
      renderHook(() => useViewBeacon('test-post'));
    }).not.toThrow();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // Test 7: read time beacon not sent if consent denied at send time (AC3)
  it('does NOT send read time beacon if consent is denied at send time', () => {
    // Consent granted at mount time
    mockGetConsentStatus.mockReturnValue('granted');

    renderHook(() => useViewBeacon('test-post'));

    // Consent changes to denied before tab hidden
    mockGetConsentStatus.mockReturnValue('denied');

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // sendBeacon should NOT be called since consent is now denied
    expect(mockSendBeacon).not.toHaveBeenCalled();
  });

  // Test 8: read time beacon uses XHR fallback when sendBeacon unavailable (AC2)
  it('falls back to XMLHttpRequest when sendBeacon is not available', () => {
    mockGetConsentStatus.mockReturnValue('granted');

    // Remove sendBeacon
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const mockXhrSend = vi.fn();
    const mockXhrOpen = vi.fn();
    const mockXhrSetRequestHeader = vi.fn();
    const MockXHR = vi.fn(() => ({
      open: mockXhrOpen,
      setRequestHeader: mockXhrSetRequestHeader,
      send: mockXhrSend,
    }));
    vi.stubGlobal('XMLHttpRequest', MockXHR);

    renderHook(() => useViewBeacon('test-post'));

    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockXhrOpen).toHaveBeenCalledWith('POST', 'http://test-oracle:8787/api/blog/views', false);
    expect(mockXhrSetRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(mockXhrSend).toHaveBeenCalled();

    // Verify the payload contains slug and read_time_seconds
    const payload = JSON.parse(mockXhrSend.mock.calls[0][0] as string);
    expect(payload).toHaveProperty('slug', 'test-post');
    expect(payload).toHaveProperty('read_time_seconds');
  });
});
