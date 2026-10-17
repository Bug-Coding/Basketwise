const CACHE_NAME = 'basketwise-v1';
const CORE_ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './styles.css', './grocery.css', './simple-accessible.css',
  './comment-review.css', './feedback-round2.css', './glass-ui.css',
  './catalog.js', './app.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
  './images/milk.jpg', './images/eggs.jpg', './images/bread.jpg', './images/rice.jpg',
  './images/tomatoes.jpg', './images/potatoes.jpg', './images/bananas.jpg', './images/oil.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
