/* Duo · fonctionnement hors réseau.
   La page de l'app est chargée en priorité depuis GitHub quand il y a du réseau (toujours la dernière version),
   et depuis la copie gardée sur l'appareil quand il n'y en a pas. */
const CACHE = "duo-v3";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function fromNetwork(req, c, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    fetch(req, { cache: "no-store" }).then(r => { clearTimeout(t); if (r && r.ok) { c.put(req, r.clone()); res(r); } else rej(new Error("bad")); }).catch(err => { clearTimeout(t); rej(err); });
  });
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (isPage) {
      try { return await fromNetwork(req, c, 4000); }
      catch (_) { return hit || c.match("./index.html"); }
    }
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
