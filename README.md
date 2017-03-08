<!-- To make changes, edit templates/README.hbs, not README.md! -->
[![Travis Build Status][travis-image]][travis-url]
[![AppVeyor Build status][appveyor-image]][appveyor-url]
[![Dependency Status][dependency-image]][dependency-url]
[![Dev Dependency Status][dev-dependency-image]][dev-dependency-url]

# SW Helpers

## Contents

- [Ways to Use the Libraries](#ways-to-use-the-libraries)
- [Setting Up](#setting-up)
- [Using](#using)
- [The Libraries](#the-libraries)
  - [sw-appcache-behavior](#sw-appcache-behavior)
  - [sw-broadcast-cache-update](#sw-broadcast-cache-update)
  - [sw-build](#sw-build)
  - [sw-cache-expiration](#sw-cache-expiration)
  - [sw-cli](#sw-cli)
  - [sw-lib](#sw-lib)
  - [sw-offline-google-analytics](#sw-offline-google-analytics)
  - [sw-precaching](#sw-precaching)
  - [sw-routing](#sw-routing)
  - [sw-runtime-caching](#sw-runtime-caching)
- [External Contributions](#external-contributions)
- [License](#license)

The sw-helpers library is ...

## Ways to Use the Libraries

Despite the number of modules in this package, there are a number of approaches to using these tools which many be used separately or together in any number of combinations.

* **Basic caching strategies**: Use [sw-lib](.) to quickly implement one of the
  [standard caching strategies](.).
* **Build process**: Incorporate sw-helpers into your build process using
  [sw-build](.).
* **Command line**: Use a command line interface to generate a basic service
  worker and play around with the features of the library.
* **Go beyond the basics**: Implement more advanced capabilities and more
  sophisticated use cases using any of the other libraries, which are described
  below.

## Setting Up

Each module is installed separately using the command line [as listed below](#the-libraries). To use a particular module:

1. Install the module. For example:

   `npm install --save-dev sw-lib`
2. Copy the module and map files to your serving directory. To work properly these must be in the same directory as your service worker. For example:

   `cp node_modules/sw-lib/build/* app/`
3. Import the modules to your service worker file. For example:

   `importScripts('sw-lib.min.js');`

# Using

As listed under [The Libraries](#the-libraries), each module has an _About_ page with basic usage instructions and a _Demo_ directory with an example. The main page of the documentation is [here](https://googlechrome.github.io/sw-helpers/#main).

## The Libraries
### sw-appcache-behavior

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-appcache-behavior%22)][travis-url]

A service worker implementation of the behavior defined in a page&#x27;s App Cache manifest.

**Install**: `npm install --save-dev sw-appcache-behavior`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-appcache-behavior.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-appcache-behavior/demo)

### sw-background-sync-queue

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-background-sync-queue%22)][travis-url]

Queues failed requests and uses the Background Sync API to replay those requests at a later time when the network state has changed.

**Install**: `npm install --save-dev sw-background-sync-queue`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-background-sync-queue.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-background-sync-queue/demo)

### sw-broadcast-cache-update

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-broadcast-cache-update%22)][travis-url]

A helper library that uses the Broadcast Channel API to announce when two Response objects differ.

**Install**: `npm install --save-dev sw-broadcast-cache-update`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-broadcast-cache-update.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-broadcast-cache-update/demo)

### sw-build

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-build%22)][travis-url]

This module can be used to generate a file manifest or service worker, that can be used with sw-lib.

**Install**: `npm install --save-dev sw-build`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-build.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-build/demo)

### sw-cache-expiration

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-cache-expiration%22)][travis-url]

This library is still a work in progress and is not functional.

**Install**: `npm install --save-dev sw-cache-expiration`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-cache-expiration.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-cache-expiration/demo)

### sw-cacheable-response

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-cacheable-response%22)][travis-url]

This library takes a Response object and determines whether it&#x27;s cacheable, based on a specific configuration.

**Install**: `npm install --save-dev sw-cacheable-response`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-cacheable-response.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-cacheable-response/demo)

### sw-cli

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-cli%22)][travis-url]

A CLI tool to generate a service worker and a file manifest making use of the sw-lib module.

**Install**: `npm install --save-dev sw-cli`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-cli.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-cli/demo)

### sw-lib

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-lib%22)][travis-url]

A service worker library to make managing fetch requests and caching as easy as possible.

**Install**: `npm install --save-dev sw-lib`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-lib.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-lib/demo)

### sw-offline-google-analytics

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-offline-google-analytics%22)][travis-url]

A service worker helper library to retry offline Google Analytics requests when a connection is available.

**Install**: `npm install --save-dev sw-offline-google-analytics`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-offline-google-analytics.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-offline-google-analytics/demo)

### sw-precaching

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-precaching%22)][travis-url]

This library is still a work in progress and is not functional.

**Install**: `npm install --save-dev sw-precaching`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-precaching.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-precaching/demo)

### sw-routing

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-routing%22)][travis-url]

A service worker helper library to route request URLs to handlers.

**Install**: `npm install --save-dev sw-routing`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-routing.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-routing/demo)

### sw-runtime-caching

[![Build Status](https://travis-shields.appspot.com/shield/GoogleChrome/sw-helpers/master/PROJECT%3D%22sw-runtime-caching%22)][travis-url]

A service worker helper library that implements various runtime caching strategies.

**Install**: `npm install --save-dev sw-runtime-caching`

**Learn More**: [About](https://googlechrome.github.io/sw-helpers/reference-docs/stable/latest/module-sw-runtime-caching.html) •
                [Demo Code](https://github.com/GoogleChrome/sw-helpers/tree/master/packages/sw-runtime-caching/demo)


## External Contributions

Please read the [guide to contributing](https://googlechrome.github.io/sw-helpers/contributing.html)
prior to filing any pull requests.

## License

Copyright 2016 Google, Inc.

Licensed under the [Apache License, Version 2.0](LICENSE) (the "License");
you may not use this file except in compliance with the License. You may
obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[npm-url]: https://npmjs.org/package/sw-helpers
[npm-image]: https://badge.fury.io/js/sw-helpers.svg
[travis-url]: https://travis-ci.org/GoogleChrome/sw-helpers
[travis-image]: https://travis-ci.org/GoogleChrome/sw-helpers.svg?branch=master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/4ct8ph4d34c5ifnw?svg=true
[appveyor-url]: https://ci.appveyor.com/project/gauntface/sw-helpers
[dependency-url]: https://david-dm.org/GoogleChrome/sw-helpers/
[dependency-image]: https://david-dm.org/GoogleChrome/sw-helpers/status.svg
[dev-dependency-url]: https://david-dm.org/GoogleChrome/sw-helpers?type=dev
[dev-dependency-image]: https://david-dm.org/GoogleChrome/sw-helpers/dev-status.svg
