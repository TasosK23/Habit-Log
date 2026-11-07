// Network-first for the app itself (always the latest version when online),
// cache-first for fonts, so the app keeps its look offline too.
const CACHE = 'habit-log-shell';
const FONTS = 'habit-log-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }

  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json')) return; // update checks always go to the network
  e.respondWith(
    fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(r, copy));
        }
        return res;
      })
      .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
  );
});
