// Forma na telefonu – service worker: aplikacijo shrani na telefon, da se odpre tudi brez interneta.
// Ob vsaki novi različici povečaj številko, da telefon naloži nove datoteke.
const CACHE = "forma-telefon-v3";
const SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./local.js", "./manifest.webmanifest",
  "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./lib/anthropic-sdk.mjs", "./lib/standardwebhooks.mjs", "./lib/stablelib-base64.mjs", "./lib/fast-sha256.mjs",
];
const FONTS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Pisave: iz shrambe, v ozadju osveži.
  if (FONTS.includes(url.origin)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  if (url.origin !== location.origin) return; // klici h Claudu gredo mimo

  // Aplikacija: najprej omrežje (nova različica); brez interneta ali pri slabem signalu (več kot 3 s) shranjena kopija.
  e.respondWith((async () => {
    const fromNet = fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    });
    const cached = await caches.match(req, { ignoreSearch: true });
    if (!cached) return fromNet.catch(() => caches.match("./index.html"));
    const slow = new Promise((resolve) => setTimeout(() => resolve(cached), 3000));
    return Promise.race([fromNet.catch(() => cached), slow]);
  })());
});
