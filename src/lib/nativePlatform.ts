import { Capacitor } from '@capacitor/core';

/** True when running inside Capacitor (iOS / Android) */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/**
 * Unregister all service workers and clear caches to prevent stale UI/assets.
 */
export async function clearServiceWorkersAndCaches(logPrefix = '[App]'): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const reg of registrations) {
    await reg.unregister();
    console.log(`${logPrefix} Unregistered service worker:`, reg.scope);
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
      console.log(`${logPrefix} Cleared cache:`, name);
    }
  }
}

/**
 * Unregister all service workers when running inside a native shell.
 * Service workers conflict with Capacitor's WebView and cause stale caching.
 */
export async function disableServiceWorkersInNative(): Promise<void> {
  if (!isNativeApp()) return;
  await clearServiceWorkersAndCaches('[Native]');
}

