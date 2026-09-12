/**
 * Service Worker registration and lifecycle management utility for SmartForge PWA (RNF-03).
 */

export interface SWRegistrationOptions {
  scope?: string;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Registers the Service Worker for offline support and asset caching.
 *
 * @param swUrl URL to the Service Worker file (defaults to '/sw.js')
 * @param options Registration options and callbacks
 * @returns ServiceWorkerRegistration or null if unsupported / failed
 */
export async function registerServiceWorker(
  swUrl = '/sw.js',
  options: SWRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  const { scope = '/', onSuccess, onUpdate, onError } = options;

  try {
    const registration = await navigator.serviceWorker.register(swUrl, { scope });

    if (registration.installing) {
      registration.installing.addEventListener('statechange', (event: Event) => {
        const target = event.target as ServiceWorker;
        if (target.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            onUpdate?.(registration);
          } else {
            onSuccess?.(registration);
          }
        }
      });
    }

    return registration;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
    return null;
  }
}

/**
 * Unregisters all registered service workers for the current scope.
 *
 * @returns Promise<boolean> True if unregistration succeeded or no SW registered
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const results = await Promise.all(registrations.map((reg) => reg.unregister()));
    return results.every(Boolean);
  } catch {
    return false;
  }
}
