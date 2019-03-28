/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import {pluginEvents} from '../models/pluginEvents.mjs';
import {pluginUtils} from '../utils/pluginUtils.mjs';
import {WorkboxError} from './WorkboxError.mjs';
import {assert} from './assert.mjs';
import {executeQuotaErrorCallbacks} from './quota.mjs';
import {getFriendlyURL} from './getFriendlyURL.mjs';
import {logger} from './logger.mjs';
import '../_version.mjs';


/**
 * Wrapper around cache.put().
 *
 * Will call `cacheDidUpdate` on plugins if the cache was updated, using
 * `matchOptions` when determining what the old entry is.
 *
 * @param {Object} options
 * @param {string} options.cacheName
 * @param {Request} options.request
 * @param {Response} options.response
 * @param {Event} [options.event]
 * @param {Array<Object>} [options.plugins=[]]
 * @param {Object} [options.matchOptions]
 *
 * @private
 * @memberof module:workbox-core
 */
const putWrapper = async ({
  cacheName,
  request,
  response,
  event,
  plugins = [],
  matchOptions,
} = {}) => {
  if (process.env.NODE_ENV !== 'production') {
    if (request.method && request.method !== 'GET') {
      throw new WorkboxError('attempt-to-cache-non-get-request', {
        url: getFriendlyURL(request.url),
        method: request.method,
      });
    }
  }

  const effectiveRequest = await _getEffectiveRequest({
    plugins, request, mode: 'write'});

  if (!response) {
    if (process.env.NODE_ENV !== 'production') {
      logger.error(`Cannot cache non-existent response for ` +
        `'${getFriendlyURL(effectiveRequest.url)}'.`);
    }

    throw new WorkboxError('cache-put-with-no-response', {
      url: getFriendlyURL(effectiveRequest.url),
    });
  }

  let responseToCache = await _isResponseSafeToCache({
    response, event, plugins, request: effectiveRequest});

  if (!responseToCache) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Response '${getFriendlyURL(effectiveRequest.url)}' will ` +
      `not be cached.`, responseToCache);
    }
    return;
  }

  const cache = await caches.open(cacheName);

  const updatePlugins = pluginUtils.filter(
      plugins, pluginEvents.CACHE_DID_UPDATE);

  let oldResponse = updatePlugins.length > 0 ?
      await matchWrapper({cacheName, matchOptions, request: effectiveRequest}) :
      null;

  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`Updating the '${cacheName}' cache with a new Response for ` +
      `${getFriendlyURL(effectiveRequest.url)}.`);
  }

  try {
    await cache.put(effectiveRequest, responseToCache);
  } catch (error) {
    // See https://developer.mozilla.org/en-US/docs/Web/API/DOMException#exception-QuotaExceededError
    if (error.name === 'QuotaExceededError') {
      await executeQuotaErrorCallbacks();
    }
    throw error;
  }

  for (let plugin of updatePlugins) {
    await plugin[pluginEvents.CACHE_DID_UPDATE].call(plugin, {
      cacheName,
      event,
      oldResponse,
      newResponse: responseToCache,
      request: effectiveRequest,
    });
  }
};

/**
 * This is a wrapper around cache.match().
 *
 * @param {Object} options
 * @param {string} options.cacheName Name of the cache to match against.
 * @param {Request} options.request The Request that will be used to look up
 *     cache entries.
 * @param {Event} [options.event] The event that propted the action.
 * @param {Object} [options.matchOptions] Options passed to cache.match().
 * @param {Array<Object>} [options.plugins=[]] Array of plugins.
 * @return {Response} A cached response if available.
 *
 * @private
 * @memberof module:workbox-core
 */
const matchWrapper = async ({
  cacheName,
  request,
  event,
  matchOptions,
  plugins = [],
}) => {
  const cache = await caches.open(cacheName);

  const effectiveRequest = await _getEffectiveRequest({
    plugins, request, mode: 'read'});

  let cachedResponse = await cache.match(effectiveRequest, matchOptions);
  if (process.env.NODE_ENV !== 'production') {
    if (cachedResponse) {
      logger.debug(`Found a cached response in '${cacheName}'.`);
    } else {
      logger.debug(`No cached response found in '${cacheName}'.`);
    }
  }

  for (const plugin of plugins) {
    if (pluginEvents.CACHED_RESPONSE_WILL_BE_USED in plugin) {
      cachedResponse = await plugin[pluginEvents.CACHED_RESPONSE_WILL_BE_USED]
          .call(plugin, {
            cacheName,
            event,
            matchOptions,
            cachedResponse,
            request: effectiveRequest,
          });
      if (process.env.NODE_ENV !== 'production') {
        if (cachedResponse) {
          assert.isInstance(cachedResponse, Response, {
            moduleName: 'Plugin',
            funcName: pluginEvents.CACHED_RESPONSE_WILL_BE_USED,
            isReturnValueProblem: true,
          });
        }
      }
    }
  }

  return cachedResponse;
};

/**
 * This method will call cacheWillUpdate on the available plugins (or use
 * status === 200) to determine if the Response is safe and valid to cache.
 *
 * @param {Object} options
 * @param {Request} options.request
 * @param {Response} options.response
 * @param {Event} [options.event]
 * @param {Array<Object>} [options.plugins=[]]
 * @return {Promise<Response>}
 *
 * @private
 * @memberof module:workbox-core
 */
const _isResponseSafeToCache = async ({request, response, event, plugins}) => {
  let responseToCache = response;
  let pluginsUsed = false;
  for (let plugin of plugins) {
    if (pluginEvents.CACHE_WILL_UPDATE in plugin) {
      pluginsUsed = true;
      responseToCache = await plugin[pluginEvents.CACHE_WILL_UPDATE]
          .call(plugin, {
            request,
            response: responseToCache,
            event,
          });

      if (process.env.NODE_ENV !== 'production') {
        if (responseToCache) {
          assert.isInstance(responseToCache, Response, {
            moduleName: 'Plugin',
            funcName: pluginEvents.CACHE_WILL_UPDATE,
            isReturnValueProblem: true,
          });
        }
      }

      if (!responseToCache) {
        break;
      }
    }
  }

  if (!pluginsUsed) {
    if (process.env.NODE_ENV !== 'production') {
      if (!responseToCache.status === 200) {
        if (responseToCache.status === 0) {
          logger.warn(`The response for '${request.url}' is an opaque ` +
            `response. The caching strategy that you're using will not ` +
            `cache opaque responses by default.`);
        } else {
          logger.debug(`The response for '${request.url}' returned ` +
          `a status code of '${response.status}' and won't be cached as a ` +
          `result.`);
        }
      }
    }
    responseToCache = responseToCache.status === 200 ? responseToCache : null;
  }

  return responseToCache ? responseToCache : null;
};

/**
 * This checks the list of plugins for the cacheKeyWillBeUsed callback, and
 * executes any of those callbacks found in sequence. The final `Request` object
 * returned by the last plugin is treated as the cache key for cache reads
 * and/or writes.
 *
 * @param {Object} options
 * @param {Request} options.request
 * @param {string} options.mode
 * @param {Array<Object>} [options.plugins=[]]
 * @return {Promise<Request>}
 *
 * @private
 * @memberof module:workbox-core
 */
const _getEffectiveRequest = async ({request, mode, plugins}) => {
  const cacheKeyWillBeUsedPlugins = pluginUtils.filter(
      plugins, pluginEvents.CACHE_KEY_WILL_BE_USED);

  let effectiveRequest = request;
  for (const plugin of cacheKeyWillBeUsedPlugins) {
    effectiveRequest = await plugin[pluginEvents.CACHE_KEY_WILL_BE_USED].call(
        plugin, {mode, request: effectiveRequest});

    if (typeof effectiveRequest === 'string') {
      effectiveRequest = new Request(effectiveRequest);
    }

    if (process.env.NODE_ENV !== 'production') {
      assert.isInstance(effectiveRequest, Request, {
        moduleName: 'Plugin',
        funcName: pluginEvents.CACHE_KEY_WILL_BE_USED,
        isReturnValueProblem: true,
      });
    }
  }

  return effectiveRequest;
};

export const cacheWrapper = {
  put: putWrapper,
  match: matchWrapper,
};
