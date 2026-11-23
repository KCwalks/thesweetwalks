/* SweetWalks service worker: network-first, cache only a home-page fallback for offline. */
var CACHE = "sweetwalks-v1123d";
var OFFLINE_URL = "/";

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll([OFFLINE_URL]);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key !== CACHE;
      }).map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response && response.ok && (url.pathname === "/" || url.pathname === "/index.html")) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(OFFLINE_URL, copy);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});
