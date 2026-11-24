/* Hoop Agent — service worker: rende il gioco installabile e giocabile anche offline.
   Strategia "prima la rete": con internet si usano sempre i file aggiornati,
   senza internet si gioca con la copia salvata sul telefono. */
'use strict';

const CACHE = 'hoop-agent-v39';
const APP = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './names.js', './nations.js', './events.js', './events_extra.js', './traits.js', './tuning.js', './records_data.js', './art.js', './game.js',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !font) return;
  e.respondWith(
    // cache: 'no-cache' chiede sempre al sito se il file è cambiato (niente copie vecchie di 10 minuti)
    fetch(font ? e.request : e.request.url, font ? undefined : { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
