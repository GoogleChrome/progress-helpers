/* eslint-env worker, serviceworker */
/* global goog */

/* eslint-disable max-len */
importScripts(
  '../node_modules/sw-routing/build/sw-routing.min.js',
  '../node_modules/sw-runtime-caching/build/sw-runtime-caching.min.js',
  '../node_modules/sw-broadcast-cache-update/build/sw-broadcast-cache-update.min.js'
);
/* eslint-enable max-len */

// Have the service worker take control as soon as possible.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

const requestWrapper = new goog.runtimeCaching.RequestWrapper({
  cacheName: 'text-files',
  behaviors: [
    new goog.broadcastCacheUpdate.Behavior({channelName: 'cache-updates'}),
  ],
});

const route = new goog.routing.RegExpRoute({
  regExp: /\.txt$/,
  handler: new goog.runtimeCaching.StaleWhileRevalidate({requestWrapper}),
});

const router = new goog.routing.Router();
router.registerRoute({route});
router.setDefaultHandler({handler: new goog.runtimeCaching.NetworkFirst()});
