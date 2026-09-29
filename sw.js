/* 서비스 워커 — tools/build.py 가 tools/sw.template.js 로부터 생성함. 직접 수정하지 말 것. */
const VERSION = "f1945d82c0";
const CACHE = "de-guide-" + VERSION;
const DATA_URL = "data/guidebook.json";
const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "data/guidebook.json",
  "fonts/Pretendard-Bold.subset.woff2",
  "fonts/Pretendard-Regular.subset.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "img/cities/bremen.webp",
  "img/cities/giessen.webp",
  "img/cities/kassel.webp",
  "img/cities/muenchen.webp",
  "img/cities/nuernberg.webp",
  "img/cities/wuerzburg.webp",
  "img/country/germany.webp",
  "img/hotels/nuernberg.webp",
  "img/places/airbus.webp",
  "img/places/bmw.webp",
  "img/places/dlr.webp",
  "img/places/hbw.webp",
  "img/places/jlu.webp",
  "img/places/siemens.webp",
  "img/places/spacetech.webp",
  "img/places/tum.webp",
  "img/places/unibremen.webp",
  "img/route.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((u) => new Request(u, { cache: "reload" })))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("de-guide-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// 콘텐츠(JSON)는 캐시로 즉시 응답하고, 온라인이면 뒤에서 새 버전을 받아 바뀌었으면 알림
async function dataStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(DATA_URL);
  const network = fetch(request, { cache: "no-cache" }).then(async (res) => {
    if (!res.ok) return res;
    const fresh = await res.clone().text();
    const old = cached ? await cached.clone().text() : null;
    await cache.put(DATA_URL, res.clone());
    if (old !== null && old !== fresh) {
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.postMessage({ type: "DATA_UPDATED" }));
    }
    return res;
  }).catch(() => null);
  if (cached) return cached;
  const res = await network;
  return res || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부 링크(구글지도 등)는 관여하지 않음

  if (url.pathname.endsWith("/" + DATA_URL)) {
    event.respondWith(dataStaleWhileRevalidate(req));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("index.html").then((hit) => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
