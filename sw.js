// Sliding Cups service worker — 離線可玩。
// 更新遊戲時用 node tools/release.js 同步更新版本（與 package.json 一致），舊快取會在新版啟用時清掉。
const VERSION = 'sc-9.1.2';
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
  if (isPage) {                                      // 頁面：有網路就拿最新版（並更新快取），沒網路用快取
    e.respondWith(fetch(req.url, { cache: 'no-store' }).then(res =>   // no-store：不吃瀏覽器 HTTP 快取（GitHub Pages 預設快取 10 分鐘，主畫面版會一直拿到舊版）
       { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (req.url.includes('/art/')) {            // 貼圖：先用快取（秒開、可離線），同時背景更新 → 換新圖後下次開啟就是新的
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  } else {                                           // 圖示等：快取優先，沒有才下載並存起來
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
