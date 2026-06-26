/* روي (RAWI) — Service Worker
 * استراتيجية: App Shell (Cache-First للأصول الثابتة) + Network-First لطلبات البيانات.
 * يوفّر العمل دون اتصال (Offline Caching) ويقلّل القراءات المتكررة. */
const CACHE = 'rawi-shell-v1';
const SHELL = [
  './rawi.html',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './assets/icons/sprite.svg',
  './assets/brand/logo-mark.svg',
  './assets/brand/app-icon.svg',
  './assets/illustrations/welcome.svg',
  './assets/illustrations/empty-feed.svg',
  './assets/illustrations/empty-search.svg',
  './assets/illustrations/offline.svg',
  './assets/patterns/arabesque.svg',
  './assets/patterns/geometric.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // لا نتدخل في طلبات Firebase / Google APIs (لتفادي مشاكل المصادقة)
  if (/firebase|googleapis|gstatic|google\.com/.test(url.host)) return;

  // الأصول الثابتة: Cache-First
  if (url.origin === location.origin && /\.(svg|css|js|png|webp|woff2?|html|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./rawi.html')))
    );
    return;
  }

  // غير ذلك: Network-First مع رجوع للكاش
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
