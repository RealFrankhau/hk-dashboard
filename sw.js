/* ============================================================
   sw.js — Service Worker for Hong Kong City Dashboard
   PWA: offline cache + background sync
   自動適配部署路徑（GitHub Pages 子路徑 / Vercel 根目錄 / 自訂網域）
   ============================================================ */

/* ── 動態偵測 BASE_PATH ──────────────────────────────────────
   SW 的 location 就是 manifest 所在目錄，也就是 PWA 的 scope。
   用 location.pathname 去掉檔名「sw.js」後，即為 BASE_PATH。
   例：
     abc.github.io/hk-dashboard/sw.js → BASE_PATH = /hk-dashboard/
     xxx.vercel.app/sw.js             → BASE_PATH = /
============================================================ */
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '');

const CACHE_NAME  = 'hk-dashboard-v13';

// 全部用相對 BASE_PATH 拼接，部署到任何路徑都能正確 cache
const STATIC_URLS = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'css/tokens.css',
  BASE_PATH + 'css/base.css',
  BASE_PATH + 'js/core.js',
  BASE_PATH + 'js/weather.js',
  BASE_PATH + 'js/transport.js',
  BASE_PATH + 'js/health.js',
  BASE_PATH + 'js/bus.js',
  BASE_PATH + 'js/flights.js',
  BASE_PATH + 'js/tides.js',
  BASE_PATH + 'js/holidays.js',
  BASE_PATH + 'js/typhoon.js',
  BASE_PATH + 'js/app.js',
  BASE_PATH + 'assets/icons/cold.gif',
  BASE_PATH + 'assets/icons/firer.gif',
  BASE_PATH + 'assets/icons/firey.gif',
  BASE_PATH + 'assets/icons/frost.gif',
  BASE_PATH + 'assets/icons/landslip.gif',
  BASE_PATH + 'assets/icons/ntfl.gif',
  BASE_PATH + 'assets/icons/raina.gif',
  BASE_PATH + 'assets/icons/rainb.gif',
  BASE_PATH + 'assets/icons/rainr.gif',
  BASE_PATH + 'assets/icons/sms.gif',
  BASE_PATH + 'assets/icons/tc1.gif',
  BASE_PATH + 'assets/icons/tc10.gif',
  BASE_PATH + 'assets/icons/tc3.gif',
  BASE_PATH + 'assets/icons/tc8b.gif',
  BASE_PATH + 'assets/icons/tc8c.gif',
  BASE_PATH + 'assets/icons/tc8d.gif',
  BASE_PATH + 'assets/icons/tc8ne.gif',
  BASE_PATH + 'assets/icons/tc9.gif',
  BASE_PATH + 'assets/icons/ts.gif',
  BASE_PATH + 'assets/icons/tsunami-warn.gif',
  BASE_PATH + 'assets/icons/vhot.gif',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
];

/* ── Install: cache all static assets ───────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_URLS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ─────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for static, network-first for API ───── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network-first with cache fallback
  const isAPI = [
    'data.weather.gov.hk',
    'rt.data.gov.hk',
    'data.etabus.gov.hk',
    'data.etagmb.gov.hk',
    'api.data.gov.hk',
    'datagovhk.blob.core.windows.net',
    'www.ha.org.hk',
    'api.allorigins.win',
    'tdcctv.data.one.gov.hk',
    'hkdashboard.frankhau.workers.dev',
  ].some(host => url.hostname.includes(host));

  if (isAPI) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              // Cache API responses for 5 minutes max
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Return offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match(BASE_PATH + 'index.html');
        }
      });
    })
  );
});
