import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showSuccess, showError } from './toast';

describe('toast notifications', () => {
  beforeEach(() => {
    // Clean up any existing toast containers
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();
  });

  it('showSuccess creates a toast element in the DOM', () => {
    showSuccess('Test success message');

    const container = document.getElementById('toast-container');
    expect(container).toBeTruthy();
    expect(container?.textContent).toContain('Test success message');
  });

  it('showError creates a toast element in the DOM', () => {
    showError('Test error message');

    const container = document.getElementById('toast-container');
    expect(container).toBeTruthy();
    expect(container?.textContent).toContain('Test error message');
  });

  it('toast container has proper ARIA attributes', () => {
    showSuccess('Accessible message');

    const container = document.getElementById('toast-container');
    expect(container?.getAttribute('role')).toBe('status');
    expect(container?.getAttribute('aria-live')).toBe('polite');
  });

  it('error toast has alert role', () => {
    showError('Error message');

    const container = document.getElementById('toast-container');
    const toast = container?.firstElementChild;
    expect(toast?.getAttribute('role')).toBe('alert');
  });

  it('success toast has status role', () => {
    showSuccess('Success message');

    const container = document.getElementById('toast-container');
    const toast = container?.firstElementChild;
    expect(toast?.getAttribute('role')).toBe('status');
  });

  it('multiple toasts can coexist', () => {
    showSuccess('First');
    showError('Second');
    showSuccess('Third');

    const container = document.getElementById('toast-container');
    expect(container?.children.length).toBe(3);
  });

  it('toasts auto-remove after timeout', async () => {
    vi.useFakeTimers();

    showSuccess('Temporary message');

    const container = document.getElementById('toast-container');
    expect(container?.children.length).toBe(1);

    // Advance past the toast duration (5000ms) + animation (300ms)
    vi.advanceTimersByTime(5300);

    expect(container?.children.length).toBe(0);

    vi.useRealTimers();
  });
});
