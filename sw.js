// Service worker minimal : rend journal-admin.html installable en PWA.
// Ne met volontairement pas en cache /api/* pour ne jamais afficher de
// contenu périmé — le contenu du journal doit toujours venir du réseau.

const SHELL_CACHE = 'journal-shell-v1';
const SHELL_FILES = [
  '/journal-admin.html',
  '/manifest.json',
  '/icons/journal-icon-192.png',
  '/icons/journal-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Jamais de cache pour l'API : toujours du frais.
  if (url.pathname.startsWith('/api/')) return;

  // Network-first pour le shell, fallback cache si offline.
  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
