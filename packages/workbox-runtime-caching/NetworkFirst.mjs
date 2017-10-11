/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import {_private} from 'workbox-core';
import core from 'workbox-core';

const defaultPlugin = {
  cacheWillUpdate: ({request, response}) => {
    if (response.ok || response.status === 0) {
      return response;
    }
    return null;
  },
};

/**
 * An implementation of a [network first](https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook/#network-falling-back-to-cache)
 * request strategy.
 *
 * By default, `NetworkFirst` will cache responses with a 200 status code as
 * well as [opaque responses](http://stackoverflow.com/q/39109789), which are
 * cross-origin responses which don't support
 * [CORS]((https://enable-cors.org/)).
 *
 * @memberof module:workbox-runtime-caching
 */
class NetworkFirst {
  /**
   * @param {Object} options
   * @param {string} options.cacheName Cache name to store and retrieve
   * requests. Defaults to cache names provided by `workbox-core`.
   * @param {string} options.plugins Workbox plugins you may want to use in
   * conjunction with this caching strategy.
   * @param {number} options.networkTimeoutSeconds If set, any requests that
   * fail to respond within this timeout will be treated as a failed network
   * request and the request will fallback to the cache. This option is meant
   * to combat "[lie-fi](https://developers.google.com/web/fundamentals/performance/poor-connectivity/#lie-fi)"
   * scenarios.
   */
  constructor(options = {}) {
    this._cacheName =
      _private.cacheNames.getRuntimeName(options.cacheName);

    if (options.plugins) {
      let isUsingCacheWillUpdate = false;
      for (let plugin of options.plugins) {
        if (plugin.cacheWillUpdate) {
          isUsingCacheWillUpdate = true;
          break;
        }
      }
      this._plugins = isUsingCacheWillUpdate ?
        options.plugins : [defaultPlugin, ...options.plugins];
    } else {
      // No plugins passed in so just use default plug.
      this._plugins = [defaultPlugin];
    }

    this._networkTimeoutSeconds = options.networkTimeoutSeconds;
    if (process.env.NODE_ENV !== 'production') {
      if (this._networkTimeoutSeconds) {
        core.assert.isType(this._networkTimeoutSeconds, 'number', {
          moduleName: 'workbox-runtime-caching',
          className: 'NetworkFirst',
          funcName: 'constructor',
          paramName: 'networkTimeoutSeconds',
        });
      }
    }
  }

  /**
   * Handle the provided fetch event.
   *
   * @param {FetchEvent} event
   * @return {Promise<Response>}
   */
  async handle(event) {
    if (process.env.NODE_ENV !== 'production') {
      // TODO: Switch to core.assert
      // core.assert.isInstance({event}, FetchEvent);
    }

    const promises = [];
    let timeoutId;

    if (this._networkTimeoutSeconds) {
      promises.push(new Promise((resolve) => {
        const onNetworkTimeout = () => {
          resolve(this._respondFromCache(event.request));
        };

        timeoutId = setTimeout(
          onNetworkTimeout,
          this._networkTimeoutSeconds * 1000,
        );
      }));
    }

    const networkPromise = _private.fetchWrapper.fetch(
      event.request,
      this._plugins
    )
    .then((response) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response) {
        return this._respondFromCache(event.request);
      }

      // Keep the service worker alive while we put the request in the cache
      const responseClone = response.clone();
      event.waitUntil(
        _private.cacheWrapper.put(
          this._cacheName,
          event.request,
          responseClone,
          this._plugins
        )
      );

      return response;
    }, () => this._respondFromCache(event.request));

    promises.push(networkPromise);

    return Promise.race(promises);
  }

  /**
   * Used if the network timeouts or fails to make the request.
   *
   * @param {Request} request The fetchEvent request to match in the cache
   * @return {Promise<Response>}
   *
   * @private
   */
  _respondFromCache(request) {
    return _private.cacheWrapper.match(
      this._cacheName,
      request,
      null,
      this._plugins
    );
  }
}

export default NetworkFirst;
