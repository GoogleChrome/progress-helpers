/*
  Copyright 2017 Google Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const errors = require('./errors');

/**
 * Given a set of options that configures `sw-toolbox`'s behavior, convert it
 * into a string that would configure equivalent `workbox-sw` behavior.
 *
 * @param {Object} options See
 *        https://googlechrome.github.io/sw-toolbox/api.html#options
 * @return {string} A JSON string representing the equivalent options.
 *
 * @private
 */
function getOptionsString(options) {
  const cacheOptions = options.cache || {};
  // Start with a base of a few properties that need to be renamed, as well
  // as copying over all the other source properties as-is.
  const effectiveOptions = Object.assign({
    cacheName: cacheOptions.name,
  }, options);

  // Only create the cacheExpiration object if either maxEntries or
  // maxAgeSeconds is set.
  if (cacheOptions.maxEntries || cacheOptions.maxAgeSeconds) {
    effectiveOptions.cacheExpiration =
      Object.assign(effectiveOptions.cacheExpiration || {}, {
        maxEntries: cacheOptions.maxEntries,
        maxAgeSeconds: cacheOptions.maxAgeSeconds,
      });
  }

  // Everything should be copied to the corresponding new option names at this
  // point, so set the old-style `cache` property to undefined so that it
  // doesn't show up in the JSON output.
  effectiveOptions.cache = undefined;

  // JSON.stringify() will automatically omit any properties that are set to
  // undefined values.
  return JSON.stringify(effectiveOptions, null, 2);
}

module.exports = (runtimeCaching) => {
  runtimeCaching = runtimeCaching || [];
  return runtimeCaching.map((entry) => {
    const method = entry.method || 'GET';

    if (!entry.urlPattern) {
      throw new Error(errors['urlPattern-is-required']);
    }

    if (!entry.handler) {
      throw new Error(errors['handler-is-required']);
    }

    // TODO: Figure out our ExpressRoute story.
    // In the meantime, we only support RegExp routes.
    if (!(entry.urlPattern instanceof RegExp)) {
      throw new Error(errors['only-regexp-routes-supported']);
    }

    if (typeof entry.handler === 'string') {
      // In v3, the strategies are exposed as their class names, and start with
      // uppercase letters. We can maintain support for the old handleName
      // config by capitalizing the first letter.
      const handlerClass = entry.handler.charAt(0).toUpperCase() +
        entry.handler.substring(1);

      const optionsString = getOptionsString(entry.options || {});

      const strategyString =
        `new workbox.strategies.${handlerClass}(${optionsString})`;

      return `workbox.routing.registerRoute(` +
        `new workbox.routing.RegExpRoute(` +
        `${entry.urlPattern}, ${strategyString}, '${method}'));\n`;
    } else if (typeof entry.handler === 'function') {
      return `workbox.routing.registerRoute(` +
        `new workbox.routing.RegExpRoute(` +
        `${entry.urlPattern}, ${entry.handler}, '${method}'));\n`;
    }
  }).filter((entry) => Boolean(entry)); // Remove undefined map() return values.
};
