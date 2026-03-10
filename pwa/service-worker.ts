import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { matchPrecache } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Cache assets (JS, CSS, Images)
registerRoute(
    ({ request }) => request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image',
    new CacheFirst({
        cacheName: 'static-assets',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
            }),
        ],
    })
);

// Offline fallback
const OFFLINE_URL = '/offline.html';
const networkOnly = new NetworkOnly();
const navigationRoute = new NavigationRoute(async (params) => {
    try {
        return await networkOnly.handle(params);
    } catch (error) {
        return matchPrecache(OFFLINE_URL);
    }
});

registerRoute(navigationRoute);

(self as any).addEventListener('message', (event: any) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        (self as any).skipWaiting();
    }
});
