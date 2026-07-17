const CACHE_NAME = 'rebalance-v67';
const SHELL = ['./', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 크로스-오리진(시세 API 등)은 캐시하지 않고 통과
  if (url.origin !== self.location.origin) return;
  // weights.json은 캐시 완전 우회 — 항상 네트워크 최신본 (가족이 옛 추천을 보지 않도록)
  if (url.pathname.includes('weights.json')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // 캐시 히트: 즉시 반환하고 백그라운드에서 갱신
      if (cached) {
        fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      // 캐시 미스: 네트워크 요청 후 캐시 저장
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(CACHE_NAME).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
