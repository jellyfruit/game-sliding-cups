// Kings of Cups (game-sliding-cups) service worker — makes the game playable offline.
// Releases bump VERSION via node tools/release.js (matches package.json); old caches are deleted when the new worker activates.
const VERSION = 'sc-16.3.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/sw.js');
  if (isPage) {                                      // page: network first (and refresh the cache), cache when offline
    e.respondWith(fetch(req.url, { cache: 'no-store' }).then(res =>   // no-store: bypass the HTTP cache (GitHub Pages caches 10 min; the home-screen app kept getting old builds)
       { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (req.url.includes('/art/')) {            // sprites: cache first (instant, offline) while refreshing in the background → new art shows on the next open
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  } else {                                           // icons etc.: cache first, fetch and store if missing
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
