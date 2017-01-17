/* eslint-env worker, serviceworker */
/* global goog */

/* eslint-disable max-len */
// Import the helper libraries into our service worker's global scope.
importScripts(
  // This provides the goog.routing.* interfaces.
  '../node_modules/sw-routing/build/sw-routing.js',
  // This provides the goog.runtimeCaching.* interfaces.
  '../node_modules/sw-runtime-caching/build/sw-runtime-caching.js',
  // This provides the goog.cacheExpiration.* interfaces.
  '../node_modules/sw-cacheable-response-behavior/build/sw-cacheable-response-behavior.js'
);
/* eslint-enable max-len */

// Have the service worker take control as soon as possible.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Configure a RequestWrapper to use a specific cache and only cache responses
// that have a status code of 200 or 404.
const httpbinRequestWrapper = new goog.runtimeCaching.RequestWrapper({
  cacheName: 'httpbin',
  behaviors: [
    new goog.cacheableResponse.Behavior({
      statuses: [200, 404],
    }),
  ],
});

// Create a route to match all requests for https://httpbin.org/status/ URLs.
// Anything that matches those requests will be handled using a
// stale-while-revalidate policy, with caching behavior determined by the
// httpbinRequestWrapper we just created.
const httpbinRoute = new goog.routing.RegExpRoute({
  regExp: new RegExp('^https://httpbin.org/status/'),
  handler: new goog.runtimeCaching.StaleWhileRevalidate({
    requestWrapper: httpbinRequestWrapper,
  }),
});

// Finally, set up our router, registering both the textFilesRoute and also
// a default handler to match all other requests, using a network first policy.
const router = new goog.routing.Router();
router.registerRoute({route: httpbinRoute});
router.setDefaultHandler({handler: new goog.runtimeCaching.NetworkFirst()});
