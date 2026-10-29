/*
 * Home Base service worker. Keeps the pages you need in an emergency
 * (dashboard, preparedness, service providers) readable without a
 * connection. Everything else, including the Vault and every file, always
 * goes to the network and is never stored here.
 */
const VERSION = "v1";
const PAGES = `hb-pages-${VERSION}`;
const STATIC = `hb-static-${VERSION}`;
const OFFLINE_URL = "/offline";
const SAVED = [/^\/home$/, /^\/preparedness(\/[^/]+)?$/, /^\/providers(\/[^/]+)?$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("hb-") && k !== PAGES && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode !== "navigate") return;
  const save = SAVED.some((re) => re.test(url.pathname));
  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // Only keep real pages: a redirect to sign-in or an error is not worth saving.
        if (save && res.ok && !res.redirected && res.type === "basic") {
          const cache = await caches.open(PAGES);
          await cache.put(url.pathname, res.clone());
        }
        return res;
      } catch {
        const cached = save ? await caches.match(url.pathname, { cacheName: PAGES }) : undefined;
        return cached ?? (await caches.match(OFFLINE_URL, { cacheName: STATIC })) ?? Response.error();
      }
    })(),
  );
});
