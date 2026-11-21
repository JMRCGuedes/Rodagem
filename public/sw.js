// Service worker do Rodagem.
// - Ficheiros estáticos (JS, CSS, fontes, ícones): guardados em cache para abrir mais depressa.
// - Páginas: sempre pedidas à rede (os dados mudam e dependem da sessão);
//   sem rede, mostra /offline.html.
const VERSAO = "rodagem-v1";
const OFFLINE = "/offline.html";
const PRECACHE = [OFFLINE, "/icon.svg", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSAO).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return res;
          })
      )
    );
  }
});
