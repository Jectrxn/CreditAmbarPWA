/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: any;
};

export const STATIC_CACHE_NAME = 'creditambar-static-v1';
export const IMAGE_CACHE_NAME = 'creditambar-images-v1';
export const FONT_CACHE_NAME = 'creditambar-fonts-v1';
export const OFFLINE_FALLBACK_URL = '/index.html';

export interface ServiceWorkerInitOptions {
  self: any;
  precacheAndRoute: typeof precacheAndRoute;
  cleanupOutdatedCaches: typeof cleanupOutdatedCaches;
  registerRoute: typeof registerRoute;
  clientsClaim: typeof clientsClaim;
}

export function initServiceWorker(options: ServiceWorkerInitOptions) {
  const swSelf = options.self;

  // 1. Take control of existing uncontrolled clients immediately
  swSelf.skipWaiting?.();
  options.clientsClaim();

  // 2. Precache build assets from Workbox manifest
  if (swSelf.__WB_MANIFEST) {
    options.precacheAndRoute(swSelf.__WB_MANIFEST);
  }
  options.cleanupOutdatedCaches();

  // 3. Offline Navigation Fallback: serve /index.html on app reloads while offline
  try {
    const handler = createHandlerBoundToURL(OFFLINE_FALLBACK_URL);
    const navigationRoute = new NavigationRoute(handler, {
      denylist: [/^\/api\//, /^\/auth\//],
    });
    options.registerRoute(navigationRoute);
  } catch {
    // Fallback if createHandlerBoundToURL cannot bind outside manifest context
    const fallbackNavigationRoute = new NavigationRoute(async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match(OFFLINE_FALLBACK_URL);
      if (cachedResponse) return cachedResponse;
      return fetch(OFFLINE_FALLBACK_URL);
    });
    options.registerRoute(fallbackNavigationRoute);
  }

  // 4. Runtime Caching: Images (icons, logos, wallpapers) with CacheFirst strategy
  options.registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
      cacheName: IMAGE_CACHE_NAME,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // 5. Runtime Caching: Web Fonts with CacheFirst strategy
  options.registerRoute(
    ({ request }) => request.destination === 'font',
    new CacheFirst({
      cacheName: FONT_CACHE_NAME,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
      ],
    })
  );

  // 6. Runtime Caching: Static CSS & JS Assets with StaleWhileRevalidate strategy
  options.registerRoute(
    ({ request }) =>
      request.destination === 'style' || request.destination === 'script',
    new StaleWhileRevalidate({
      cacheName: STATIC_CACHE_NAME,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
        }),
      ],
    })
  );
}

// Auto-initialize when running directly in browser Service Worker context
if (
  typeof self !== 'undefined' &&
  typeof (self as any).skipWaiting === 'function' &&
  typeof (self as any).importScripts === 'function'
) {
  precacheAndRoute(self.__WB_MANIFEST || []);
  initServiceWorker({
    self,
    precacheAndRoute,
    cleanupOutdatedCaches,
    registerRoute,
    clientsClaim,
  });
}
