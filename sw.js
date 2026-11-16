// Casa — lucrătorul de serviciu: ține aplicația pe dispozitiv.
//  • Pagina (codul aplicației) se servește din copia locală. O versiune nouă de pe internet NU se aplică singură:
//    aplicația te anunță, iar copia locală se schimbă doar când apeși „Actualizează”.
//  • Bibliotecile, fonturile și iconițele se păstrează local după prima folosire → merge și fără internet.
//  • Nimic altceva nu e atins: cererile către scriptul vostru Google trec direct.
const CACHE = 'casa-app-v1';
const SHELL = './';
const LOCAL = /\/(vendor|icons)\/|manifest\.webmanifest$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(SHELL, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(SHELL)) || fetch(req).then((r) => { if (r.ok) c.put(SHELL, r.clone()); return r; })));
    return;
  }
  if (LOCAL.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
  }
});

self.addEventListener('message', (e) => {
  if (e.data?.type !== 'update') return;
  e.waitUntil((async () => {
    let ok = false;
    try {
      const r = await fetch(new Request(SHELL, { cache: 'reload' }));
      if (r.ok) { await (await caches.open(CACHE)).put(SHELL, r); ok = true; }
    } catch { ok = false; }
    e.source?.postMessage({ type: 'updated', ok });
  })());
});
