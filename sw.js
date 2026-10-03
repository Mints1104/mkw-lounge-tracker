// @ts-nocheck: the service worker globals aren't in this project's type libraries
// Keeps the app working without a connection, and starting faster: the OCR engine's files are kept
// instead of downloaded on every visit.

const CACHE = 'mogi-manager';
/** Libraries come from here, at fixed versions, so a kept copy stays good */
const CDN_HOSTS = ['cdn.jsdelivr.net'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
	else if (CDN_HOSTS.includes(url.hostname)) event.respondWith(cacheFirst(request));
});

/**
 * The app's own files: always the latest while online, the last ones seen while offline.
 * @param {Request} request
 */
async function networkFirst(request) {
	const cache = await caches.open(CACHE);
	try {
		const response = await fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' }));
		if (response.ok) await cache.put(request, response.clone());
		return response;
	}
	catch (err) {
		const kept = await cache.match(request);
		if (kept) return kept;
		throw err;
	}
}

/** @param {Request} request */
async function cacheFirst(request) {
	const cache = await caches.open(CACHE);
	const kept = await cache.match(request);
	if (kept) return kept;
	const response = await fetch(request);
	if (response.ok) await cache.put(request, response.clone());
	return response;
}
