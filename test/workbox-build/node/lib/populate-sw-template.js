/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const errors = require('../../../../packages/workbox-build/src/lib/errors');

describe(`[workbox-build] lib/populate-sw-template.js`, function() {
  const MODULE_PATH = '../../../../packages/workbox-build/src/lib/populate-sw-template';

  it(`should throw an error if templating fails`, async function() {
    const populateSWTemplate = proxyquire(MODULE_PATH, {
      'lodash.template': () => {
        throw new Error();
      },
    });

    try {
      await populateSWTemplate({});
      throw new Error('Unexpected success.');
    } catch (error) {
      expect(error.message).to.have.string(errors['populating-sw-tmpl-failed']);
    }
  });

  it(`should pass the expected options to the template using mostly defaults`, function() {
    const runtimeCachingPlaceholder = 'runtime-caching-placeholder';
    const swTemplate = 'template';
    const precacheOptionsString = '{}';
    const nodeModulesPath = '/dummy/path';

    const innerStub = sinon.stub().returns('');
    const outerStub = sinon.stub().returns(innerStub);
    const populateSWTemplate = proxyquire(MODULE_PATH, {
      'lodash.template': outerStub,
      'path': {
        posix: {
          resolve: () => nodeModulesPath,
        },
      },
      './runtime-caching-converter': () => runtimeCachingPlaceholder,
      '../templates/sw-template': swTemplate,
    });

    populateSWTemplate({});

    expect(outerStub.alwaysCalledWith(swTemplate)).to.be.true;
    expect(innerStub.args[0]).to.eql([{
      cacheId: undefined,
      cleanupOutdatedCaches: undefined,
      clientsClaim: undefined,
      importScripts: undefined,
      manifestEntries: undefined,
      modulePathPrefix: undefined,
      navigateFallback: undefined,
      navigateFallbackBlacklist: undefined,
      navigateFallbackWhitelist: undefined,
      navigationPreload: undefined,
      nodeModulesPath,
      offlineAnalyticsConfigString: undefined,
      precacheOptionsString,
      runtimeCaching: runtimeCachingPlaceholder,
      skipWaiting: undefined,
    }]);
  });

  it(`should pass the expected options to the template`, function() {
    const cacheId = 'test-cache-id';
    const cleanupOutdatedCaches = true;
    const clientsClaim = true;
    const directoryIndex = 'index.html';
    const handleFetch = true;
    const ignoreURLParametersMatching = [/a/, /b/];
    const importScripts = ['test.js'];
    const manifestEntries = [{url: '/path/to/index.html', revision: '1234'}];
    const modulePathPrefix = 'testing';
    const navigateFallback = '/shell.html';
    const navigateFallbackBlacklist = [/another-test/];
    const navigateFallbackWhitelist = [/test/];
    const navigationPreload = true;
    const offlineGoogleAnalytics = true;
    const offlineAnalyticsConfigString = '{}';
    const runtimeCaching = [];
    const runtimeCachingPlaceholder = 'runtime-caching-placeholder';
    const skipWaiting = true;
    const swTemplate = 'template';
    const precacheOptionsString = '{\n  "directoryIndex": "index.html",\n  "ignoreURLParametersMatching": [/a/, /b/]\n}';
    const nodeModulesPath = '/dummy/path';

    // There are two stages in templating: creating the active template function
    // from an initial string, and passing variables to that template function
    // to get back a final, populated template string.
    // We need to stub out both of those steps to test the full flow.
    const templatePopulationStub = sinon.stub().returns('');
    const templateCreationStub = sinon.stub().returns(templatePopulationStub);
    const populateSWTemplate = proxyquire(MODULE_PATH, {
      'lodash.template': templateCreationStub,
      'path': {
        posix: {
          resolve: () => nodeModulesPath,
        },
      },
      './runtime-caching-converter': () => runtimeCachingPlaceholder,
      '../templates/sw-template': swTemplate,
    });

    populateSWTemplate({
      cacheId,
      cleanupOutdatedCaches,
      clientsClaim,
      directoryIndex,
      handleFetch,
      ignoreURLParametersMatching,
      importScripts,
      manifestEntries,
      modulePathPrefix,
      navigateFallback,
      navigateFallbackBlacklist,
      navigateFallbackWhitelist,
      navigationPreload,
      offlineGoogleAnalytics,
      runtimeCaching,
      skipWaiting,
    });

    expect(templateCreationStub.alwaysCalledWith(swTemplate)).to.be.true;
    expect(templatePopulationStub.args[0]).to.eql([{
      cacheId,
      cleanupOutdatedCaches,
      clientsClaim,
      importScripts,
      manifestEntries,
      modulePathPrefix,
      navigateFallback,
      navigateFallbackBlacklist,
      navigateFallbackWhitelist,
      navigationPreload,
      nodeModulesPath,
      offlineAnalyticsConfigString,
      runtimeCaching: runtimeCachingPlaceholder,
      precacheOptionsString,
      skipWaiting,
    }]);
  });

  it(`should handle a complex offlineGoogleAnalytics value when populating the template`, function() {
    const runtimeCachingPlaceholder = 'runtime-caching-placeholder';
    const swTemplate = 'template';
    const precacheOptionsString = '{}';
    const offlineGoogleAnalytics = {
      parameterOverrides: {
        cd1: 'offline',
      },
      hitFilter: (params) => {
        // Comments are stripped.
        params.set('cm1', params.get('qt'));
      },
    };
    const offlineAnalyticsConfigString = `{\n\tparameterOverrides: {\n\t\tcd1: 'offline'\n\t},\n\thitFilter: (params) => {\n        \n        params.set('cm1', params.get('qt'));\n      }\n}`;
    const nodeModulesPath = '/dummy/path';

    const innerStub = sinon.stub().returns('');
    const outerStub = sinon.stub().returns(innerStub);
    const populateSWTemplate = proxyquire(MODULE_PATH, {
      'lodash.template': outerStub,
      'path': {
        posix: {
          resolve: () => nodeModulesPath,
        },
      },
      './runtime-caching-converter': () => runtimeCachingPlaceholder,
      '../templates/sw-template': swTemplate,
    });

    populateSWTemplate({offlineGoogleAnalytics});

    expect(outerStub.alwaysCalledWith(swTemplate)).to.be.true;
    expect(innerStub.args[0]).to.eql([{
      cacheId: undefined,
      cleanupOutdatedCaches: undefined,
      clientsClaim: undefined,
      importScripts: undefined,
      manifestEntries: undefined,
      modulePathPrefix: undefined,
      navigateFallback: undefined,
      navigateFallbackBlacklist: undefined,
      navigateFallbackWhitelist: undefined,
      navigationPreload: undefined,
      nodeModulesPath,
      offlineAnalyticsConfigString,
      precacheOptionsString,
      runtimeCaching: runtimeCachingPlaceholder,
      skipWaiting: undefined,
    }]);
  });
});
