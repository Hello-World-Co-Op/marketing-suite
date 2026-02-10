/**
 * Simple toast notification system for marketing-suite
 * Replaces @hwdao/state showSuccess/showError from the monolith
 * Uses native DOM manipulation to show temporary notifications
 */

type ToastType = 'success' | 'error';

const TOAST_DURATION = 5000;

function createToastContainer(): HTMLElement {
  const existing = document.getElementById('toast-container');
  if (existing) return existing;

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.className =
    'fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm';
  document.body.appendChild(container);
  return container;
}

function showToast(message: string, type: ToastType): void {
  const container = createToastContainer();

  const toast = document.createElement('div');
  toast.className = `
    px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
    transform transition-all duration-300 translate-x-full opacity-0
    ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}
  `.trim();
  toast.textContent = message;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  });

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, TOAST_DURATION);
}

export function showSuccess(message: string): void {
  showToast(message, 'success');
}

export function showError(message: string): void {
  showToast(message, 'error');
}
