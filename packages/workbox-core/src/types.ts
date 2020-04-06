/*
  Copyright 2019 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import './_version.js';


/**
 * Options passed to a `RouteMatchCallback` function.
 */
export interface RouteMatchCallbackOptions {
  url: URL;
  request: Request;
  event?: ExtendableEvent;
}

/**
 * The "match" callback is used to determine if a `Route` should apply for a
 * particular URL and request. When matching occurs in response to a fetch
 * event from the client, the `event` object is also supplied. However, since
 * the match callback can be invoked outside of a fetch event, matching logic
 * should not assume the `event` object will always be available.
 * If the match callback returns a truthy value, the matching route's
 * `RouteHandlerCallback` will be invoked immediately. If the value returned
 * is a non-empty array or object, that value will be set on the handler's
 * `options.params` argument.
 */
export interface RouteMatchCallback {
  (options: RouteMatchCallbackOptions): any;
}

/**
 * Options passed to a `RouteHandlerCallback` function.
 */
export interface RouteHandlerCallbackOptions {
  request: Request | string;
  url?: URL;
  params?: string[] | {[paramName: string]: any};
  event?: ExtendableEvent;
}

/**
 * The "handler" callback is invoked whenever a `Router` matches a URL/Request
 * to a `Route` via its `RouteMatchCallback`. This handler callback should
 * return a `Promise` that resolves with a `Response`.
 *
 * If a non-empty array or object is returned by the `RouteMatchCallback` it
 * will be passed in as this handler's `options.params` argument.
 */
export interface RouteHandlerCallback {
  (options: RouteHandlerCallbackOptions): Promise<Response>;
}

/**
 * An object with a `handle` method of type `RouteHandlerCallback`.
 *
 * A `Route` object can be created with either an `RouteHandlerCallback`
 * function or this `RouteHandler` object. The benefit of the `RouteHandler`
 * is it can be extended (as is done by the `workbox-strategies` package).
 */
export interface RouteHandlerObject {
  handle: RouteHandlerCallback;
}

/**
 * Either a `RouteHandlerCallback` or a `RouteHandlerObject`.
 * Most APIs in `workbox-routing` that accept route handlers take either.
 */
export type RouteHandler = RouteHandlerCallback | RouteHandlerObject;

export interface HandlerWillStartCallbackParam {
  request: Request;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface HandlerWillStartCallback {
  (param: HandlerWillStartCallbackParam): Promise<void | null | undefined>;
}

export interface CacheDidUpdateCallbackParam {
  cacheName: string;
  oldResponse?: Response | null;
  newResponse: Response;
  request: Request;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface CacheDidUpdateCallback {
  (param: CacheDidUpdateCallbackParam): Promise<void | null | undefined>;
}

export interface CacheKeyWillBeUsedCallbackParam {
  request: Request;
  mode: string;
  params?: any;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface CacheKeyWillBeUsedCallback {
  (param: CacheKeyWillBeUsedCallbackParam): Promise<Request | string>;
}

export interface CacheWillUpdateCallbackParam {
  response: Response;
  request: Request;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface CacheWillUpdateCallback {
  (param: CacheWillUpdateCallbackParam): Promise<Response | void | null | undefined>;
}

export interface CachedResponseWillBeUsedCallbackParam {
  cacheName: string;
  request: Request;
  matchOptions?: CacheQueryOptions;
  cachedResponse?: Response;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface CachedResponseWillBeUsedCallback {
  (param: CachedResponseWillBeUsedCallbackParam): Promise<Response | void | null | undefined>;
}

export interface FetchDidFailCallbackParam {
  originalRequest: Request;
  error: Error;
  request: Request;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface FetchDidFailCallback {
  (param: FetchDidFailCallbackParam): Promise<void | null | undefined>;
}

export interface FetchDidSucceedCallbackParam {
  request: Request;
  response: Response;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface FetchDidSucceedCallback {
  (param: FetchDidSucceedCallbackParam): Promise<Response>;
}

export interface RequestWillFetchCallbackParam {
  request: Request;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface RequestWillFetchCallback {
  (param: RequestWillFetchCallbackParam): Promise<Request>;
}

export interface HandlerWillRespondCallbackParam {
  request: Request;
  response: Response;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface HandlerWillRespondCallback {
  (param: HandlerWillRespondCallbackParam): Promise<Response>;
}

export interface HandlerDidRespondCallbackParam {
  request: Request;
  response?: Response;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface HandlerDidRespondCallback {
  (param: HandlerDidRespondCallbackParam): Promise<void | null | undefined>;
}

export interface HandlerDidCompleteCallbackParam {
  request: Request;
  response?: Response;
  error?: Error;
  event?: ExtendableEvent;
  state?: {[prop: string]: any};
}

export interface HandlerDidCompleteCallback {
  (param: HandlerDidCompleteCallbackParam): Promise<void | null | undefined>;
}

/**
 * An object with optional lifecycle callback properties for the fetch and
 * cache operations.
 */
export interface WorkboxPlugin {
  handlerWillStart?: HandlerWillStartCallback;
  cacheDidUpdate?: CacheDidUpdateCallback;
  cacheKeyWillBeUsed?: CacheKeyWillBeUsedCallback;
  cacheWillUpdate?: CacheWillUpdateCallback;
  cachedResponseWillBeUsed?: CachedResponseWillBeUsedCallback;
  fetchDidFail?: FetchDidFailCallback;
  fetchDidSucceed?: FetchDidSucceedCallback;
  requestWillFetch?: RequestWillFetchCallback;
  handlerWillRespond?: HandlerWillRespondCallback;
  handlerDidRespond?: HandlerDidRespondCallback;
  handlerDidComplete?: HandlerDidCompleteCallback;
}

export interface WorkboxPluginCallbackParam {
  handlerWillStart: HandlerWillStartCallbackParam;
  cacheDidUpdate: CacheDidUpdateCallbackParam;
  cacheKeyWillBeUsed: CacheKeyWillBeUsedCallbackParam;
  cacheWillUpdate: CacheWillUpdateCallbackParam;
  cachedResponseWillBeUsed: CachedResponseWillBeUsedCallbackParam;
  fetchDidFail: FetchDidFailCallbackParam;
  fetchDidSucceed: FetchDidSucceedCallbackParam;
  requestWillFetch: RequestWillFetchCallbackParam;
  handlerWillRespond: HandlerWillRespondCallbackParam;
  handlerDidRespond: HandlerDidRespondCallbackParam;
  handlerDidComplete: HandlerDidCompleteCallbackParam;
}
