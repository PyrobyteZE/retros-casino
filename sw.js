const CACHE_NAME = 'retros-casino-v41';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/js/settings.js',
  '/js/app.js',
  '/js/clicker.js',
  '/js/coinflip.js',
  '/js/slots.js',
  '/js/crash.js',
  '/js/blackjack.js',
  '/js/plinko.js',
  '/js/roulette.js',
  '/js/horses.js',
  '/js/lottery.js',
  '/js/loans.js',
  '/js/properties.js',
  '/js/crime.js',
  '/js/pets.js',
  '/js/stocks.js',
  '/js/crypto.js',
  '/js/companies.js',
  '/js/firebase.js',
  '/js/admin.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
