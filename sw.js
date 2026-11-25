// Kings of Cups (game-sliding-cups) service worker — makes the game playable offline.
// Releases bump VERSION via node tools/release.js (matches package.json); old caches are deleted when the new worker activates.
// SHELL must list every <script src> in index.html (tests/version.test.js checks), so the first install works offline.
const VERSION = 'sc-19.3.0';
const CODE = ['src/core/config.js', 'src/data/levels.js', 'src/data/kinds.js', 'src/core/rng.js', 'src/core/physics.js', 'src/core/modes.js',
  'src/core/ults.js', 'src/core/game.js', 'src/core/flow.js', 'src/core/profile.js',
  'src/app/storage.js', 'src/app/i18n.js', 'src/app/sfx.js', 'src/app/stage.js', 'src/app/sprites.js', 'src/app/draw.js', 'src/app/fx.js',
  'src/app/tutor.js', 'src/app/renderer.js', 'src/app/input.js', 'src/app/ui.js', 'src/app/tune.js', 'src/app/main.js'];
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', ...CODE.map(f => './' + f)];

self.addEventListener('install', e => {               // cache: 'reload' skips the HTTP cache, so a new version never precaches an old file
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || req.url.endsWith('/index.html') || req.url.endsWith('/sw.js');
  const isCode = /\/src\/.*\.js(\?|$)/.test(req.url);
  if (isPage || isCode) {                            // page and game code: network first (and refresh the cache), cache when offline — page and code always come from the same place
    e.respondWith(fetch(req.url, { cache: 'no-store' }).then(res =>   // no-store: bypass the HTTP cache (GitHub Pages caches 10 min; the home-screen app kept getting old builds)
       { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: isCode }).then(r => r || (isPage ? caches.match('./index.html') : Response.error()))));
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
