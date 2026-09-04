/**
 * BYZCARD service worker — offline support without PWA installation.
 * Strategy:
 *   - navigations: network-first, falling back to the cached page, then "/"
 *   - hashed build assets (/_next/static): cache-first (immutable)
 *   - other same-origin GETs: network-first with cache fallback
 *   - /api/* is NEVER cached (wallet signing responses are no-store)
 */

// Bump deliberately whenever shipped shell/branding assets change: activation
// drops every older cache, so clients can never keep serving stale branding.
const CACHE_NAME = "byzcard-v3";
const APP_SHELL = ["/", "/create", "/card", "/s"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((path) =>
            fetch(path, { cache: "no-cache" })
              .then((response) => {
                if (response.ok) return cache.put(path, response);
                return undefined;
              })
              .catch(() => undefined),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    if (cacheKey !== "/") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, url.pathname));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(networkFirst(request, request));
});
