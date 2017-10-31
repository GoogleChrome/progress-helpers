importScripts('/__WORKBOX/buildFile/workbox-core');

console.log(workbox);

importScripts('/__WORKBOX/buildFile/workbox-precaching');

/* globals workbox */

workbox.precaching.precache([
  {
    url: 'styles/index.css',
    revision: '1',
  }, {
    url: 'index.html',
    revision: '1',
  },
]);

workbox.precaching.addRoute();

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
