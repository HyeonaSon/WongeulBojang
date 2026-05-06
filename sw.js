const CACHE = 'wongeul-v1';

const FILES = [
  '/',
  '/index.html',
  '/css/reset.css',
  '/css/tokens.css',
  '/css/style.css',
  '/js/utils.js',
  '/js/storage.js',
  '/js/app.js',
  '/js/home.js',
  '/js/editor.js',
  '/js/archive.js',
  '/fonts/NanumMyeongjo-Regular.ttf',
  '/fonts/NanumMyeongjo-Bold.ttf',
  '/fonts/NanumMyeongjo-ExtraBold.ttf',
];

// 설치 — 파일 캐시
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// 활성화 — 오래된 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 가로채기 — 캐시 우선
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).catch(() => caches.match('/index.html'));
    })
  );
});
