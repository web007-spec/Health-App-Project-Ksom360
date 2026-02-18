import { Capacitor } from '@capacitor/core';

/** True when running inside Capacitor (iOS / Android) */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Unregister all service workers when running inside a native shell.
 * Service workers conflict with Capacitor's WebView and cause stale caching.
 */
export async function disableServiceWorkersInNative(): Promise<void> {
  if (!isNativeApp()) return;
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    await reg.unregister();
    console.log('[Native] Unregistered service worker:', reg.scope);
  }

  // Clear all caches to prevent stale assets
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
      console.log('[Native] Cleared cache:', name);
    }
  }
}
