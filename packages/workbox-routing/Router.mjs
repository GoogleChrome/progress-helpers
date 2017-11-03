/*
 Copyright 2017 Google Inc. All Rights Reserved.
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

import {
  assert,
  logger,
  WorkboxError,
  getFriendlyURL,
} from 'workbox-core/_private.mjs';

import normalizeHandler from './utils/normalizeHandler.mjs';
import './_version.mjs';

/**
 * The Router takes one or more [Routes]{@link Route} and passes each fetch
 * event through it's routing logic to determine the appropriate way to respond
 * with a Request.
 *
 * If no route matches a given a request, the Router will use a "default"
 * handler if one is defined.
 *
 * Should any of the Route's throw an error, you can define a "catch" handler to
 * gracefully deal with these issues and respond with a Request.
 *
 * If a request matches multiple routes, precedence will be given to the
 * **earliest** registered route.
 *
 * @memberof module:workbox-routing
 */
class Router {
  /**
   * Constructs a new `Router` instance, without any registered routes.
   */
  constructor() {
    // _routes will contain a mapping of HTTP method name ('GET', etc.) to an
    // array of all the corresponding Route instances that are registered.
    this._routes = new Map();
  }

  /**
   * Apply the routing rules to a FetchEvent object to get a Response from an
   * appropriate handler.
   *
   * @param {FetchEvent} event The event passed in to a `fetch` handler.
   * @return {Promise<Response>|undefined} Returns a promise for a response,
   * taking the registered routes into account. If there was no matching route
   * and there's no `defaultHandler`, then returns undefined.
   */
  handleRequest(event) {
    if (process.env.NODE_ENV !== 'production') {
      assert.isInstance(event, FetchEvent, {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'handleRequest',
        paramName: 'event',
      });
    }

    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) {
      if (process.env.NODE_ENV !== 'production') {
        logger.debug(
          `Workbox Router only supports URLs that start with 'http'.`);
      }
      return;
    }

    let handler = null;
    let params = null;
    let debugMessages = [];

    const result = this._findHandlerAndParams(event, url);
    handler = result.handler;
    params = result.params;
    const route = result.route;
    if (process.env.NODE_ENV !== 'production') {
      if (handler) {
        debugMessages.push([
          `Found a route to handle this request:`, route,
        ]);

        if (params) {
          debugMessages.push([
            `Passing the following params to the route's handler:`, params,
          ]);
        }
      }
    }

    // If we don't have a handler because there was no matching route, then
    // fall back to defaultHandler if that's defined.
    if (!handler && this._defaultHandler) {
      if (process.env.NODE_ENV !== 'production') {
        debugMessages.push(`Failed to find a matching route. Falling ` +
          `back to the default handler.`);
      }
      handler = this._defaultHandler;
    }

    if (!handler) {
      if (process.env.NODE_ENV !== 'production') {
        // No handler so Workbox will do nothing. If logs is set of debug
        // i.e. verbose, we should print out this information.
        logger.debug(`No route found for: ${getFriendlyURL(url)}`);
      }
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      // We have a handler, meaning Workbox is going to handle the route.
      // print the routing details to the console.
      logger.groupCollapsed(`Router is responding to: ${getFriendlyURL(url)}`);
      debugMessages.forEach((msg) => {
        if (Array.isArray(msg)) {
          logger.log(...msg);
        } else {
          logger.log(msg);
        }
      });

      // The Request and Response objects contains a great deal of information,
      // hide it under a group in case developers want to see it.
      logger.groupCollapsed(`View request details here.`);
      logger.unprefixed.log(event.request);
      logger.groupEnd();

      logger.groupEnd();
    }

    const responsePromise = handler.handle({url, event, params});
    if (this._catchHandler) {
      responsePromise.catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          // Still include URL here as it will be async from the console group
          // and may not make sense without the URL
          logger.debug(`An error was thrown by the handler. Falling back ` +
            `to the catch handler.`);
          logger.groupCollapsed(`View thrown error here.`);
          logger.unprefixed.error(err);
          logger.groupEnd();
        }
        return this._catchHandler.handle({url, event, err});
      });
    }

    return responsePromise;
  }

  /**
   * Checks the incoming `event.request` against the registered routes, and if
   * there's a match, returns the corresponding handler along with any params
   * generated by the match.
   *
   * @param {FetchEvent} event
   * @param {URL} url
   * @return {Object} Returns an object with `handler` and `params` properties.
   * They are populated if a matching route was found or `undefined` otherwise.
   * @private
   */
  _findHandlerAndParams(event, url) {
    const routes = this._routes.get(event.request.method) || [];
    for (const route of routes) {
      let matchResult = route.match({url, event});
      if (matchResult) {
        if (Array.isArray(matchResult) && matchResult.length === 0) {
          // Instead of passing an empty array in as params, use undefined.
          matchResult = undefined;
        } else if (matchResult.constructor === Object &&
          Object.keys(matchResult).length === 0) {
          // Instead of passing an empty object in as params, use undefined.
          matchResult = undefined;
        }

        // Break out of the loop and return the appropriate values as soon as
        // we have a match.
        return {
          route,
          params: matchResult,
          handler: route.handler,
        };
      }
    }

    // If we didn't have a match, then return undefined values.
    return {handler: undefined, params: undefined};
  }

  /**
   * An optional `handler` that's called when no routes explicitly match the
   * incoming request.
   *
   * If the default is not provided, unmatched requests will go against the
   * network as if there were no service worker present.
   *
   * @param {function|module:workbox-runtime-caching.Handler} handler
   * This parameter can be either a function or an object with a `handle`
   * function. See the
   * [Handler interface]{@link module:workbox-routing.Route~handlerCallback}
   * for details.
   *
   * Either option should result in a `Response` object, which will be used to
   * respond to the `fetch` event.
   */
  setDefaultHandler(handler) {
    this._defaultHandler = normalizeHandler(handler);
  }

  /**
   * If a Route throws an error while handling a request, this `handler`
   * will be called and given a chance to provide a response.
   *
   * @param {function|module:workbox-runtime-caching.Handler} handler
   * This parameter can be either a function or an object with a `handle`
   * function. See the
   * [Handler interface]{@link module:workbox-routing.Route~handlerCallback}
   * for details.
   *
   * Either option should result in a `Response` that the `Route` can use to
   * handle the `fetch` event.
   */
  setCatchHandler(handler) {
    this._catchHandler = normalizeHandler(handler);
  }

  /**
   * Registers a route with the router.
   *
   * @param {module:workbox-routing.Route} route The route to register.
   */
  registerRoute(route) {
    if (process.env.NODE_ENV !== 'production') {
      assert.isType(route, 'object', {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'registerRoute',
        paramName: 'route',
      });

      assert.hasMethod(route, 'match', {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'registerRoute',
        paramName: 'route',
      });

      assert.isType(route.handler, 'object', {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'registerRoute',
        paramName: 'route',
      });

      assert.hasMethod(route.handler, 'handle', {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'registerRoute',
        paramName: 'route.handler',
      });

      assert.isType(route.method, 'string', {
        moduleName: 'workbox-routing',
        className: 'Router',
        funcName: 'registerRoute',
        paramName: 'route.method',
      });
    }

    if (!this._routes.has(route.method)) {
      this._routes.set(route.method, []);
    }

    // Give precedence to all of the earlier routes by adding this additional
    // route to the end of the array.
    this._routes.get(route.method).push(route);
  }

  /**
   * Unregisters a route with the router.
   *
   * @param {module:workbox-routing.Route} route The route to unregister.
   */
  unregisterRoute(route) {
    if (!this._routes.has(route.method)) {
      throw new WorkboxError(
        'unregister-route-but-not-found-with-method', {
          method: route.method,
        }
      );
    }

    const routeIndex = this._routes.get(route.method).indexOf(route);
    if (routeIndex > -1) {
      this._routes.get(route.method).splice(routeIndex, 1);
    } else {
      throw new WorkboxError('unregister-route-route-not-registered');
    }
  }
}

export {Router};
