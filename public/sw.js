self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Um fetch handler simples e direto permite a instalacao como PWA sem causar problemas de cache agressivo em desenvolvimento
  event.respondWith(fetch(event.request));
});
