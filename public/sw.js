/*
 * NAERA Convoyage — service worker (V2 « hors connexion léger », multi-portails).
 * - Pages : réseau d'abord, copie en cache des écrans de mission consultés
 *   (listes et fiches de chaque portail) pour les relire si la connexion tombe.
 *   Seules les réponses 200 sont gardées (jamais un 401/403) ; le cache est
 *   vidé à la déconnexion et au changement de profil.
 * - Ressources statiques versionnées (/_next/static) : cache d'abord.
 * - Jamais de cache pour l'API, les Server Actions ou les requêtes non GET.
 */
const VERSION = "naera-v2";
const PAGES_CACHE = `${VERSION}-pages`;
const STATIC_CACHE = `${VERSION}-static`;
const MAX_PAGES = 40;

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · NAERA</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,sans-serif;background:#f4f5f7;color:#0e1116;text-align:center;padding:24px}@media(prefers-color-scheme:dark){body{background:#0a0b0f;color:#eef1f6}}p{color:#667085;max-width:320px}</style></head><body><main><h1>Hors connexion</h1><p>Cette page n'a pas encore été consultée sur cet appareil. Les missions déjà ouvertes restent disponibles.</p></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

const CACHEABLE_PAGES = [
  /^\/(admin|pro|client)\/missions$/,
  /^\/(admin|pro|client|driver)\/missions\/[0-9a-f-]{36}$/,
  /^\/(admin|pro|client|driver)$/,
];

function isCacheablePage(url) {
  return CACHEABLE_PAGES.some((pattern) => pattern.test(url.pathname));
}

async function trimCache(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((key) => cache.delete(key)));
}

async function networkFirstPage(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.status === 200 && !response.redirected && isCacheablePage(url)) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(url.pathname, response.clone());
      await trimCache(cache);
    }
    return response;
  } catch {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(url.pathname);
    return cached || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirstStatic(request));
  }
});
