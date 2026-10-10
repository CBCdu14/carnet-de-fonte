/* Carnet de Fonte : fonctionnement hors ligne.
   - Fichiers versionnés (_expo/static) : cache d'abord (ils ne changent jamais).
   - Le reste (page, manifest) : réseau d'abord, avec repli sur le cache après 3 s ou hors ligne,
     pour que les correctifs arrivent dès qu'il y a du réseau. */
const CACHE = 'cdf-v1';
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function put(req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.includes('/_expo/static/') || url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  e.respondWith(
    new Promise((resolve) => {
      let done = false;
      const fallback = () =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : undefined));
      const timer = setTimeout(() => {
        fallback().then((hit) => {
          if (hit && !done) {
            done = true;
            resolve(hit);
          }
        });
      }, 3000);
      fetch(req)
        .then((res) => {
          clearTimeout(timer);
          put(req, res);
          if (!done) {
            done = true;
            resolve(res);
          }
        })
        .catch(() => {
          clearTimeout(timer);
          fallback().then((hit) => {
            if (!done) {
              done = true;
              resolve(hit || new Response('Hors ligne', { status: 503 }));
            }
          });
        });
    }),
  );
});
