const CACHE = "printmotive-v1";
const ASSETS = ["/", "/index.html", "/style.css", "/script.js", "https://i.ibb.co/bjF4RcPT/logo-192-192.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
