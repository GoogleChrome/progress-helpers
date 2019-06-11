/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

module.exports = {
  babelPresetEnvTargets: ['chrome >= 56'],
  cleanupOutdatedCaches: false,
  clientsClaim: false,
  globFollow: true,
  globIgnores: ['**/node_modules/**/*'],
  globPatterns: ['**/*.{js,css,html}'],
  globStrict: true,
  importWorkboxFrom: 'cdn',
  injectionPoint: 'self.__WB_INJECTED_MANIFEST',
  inlineWorkboxRuntime: false,
  maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
  mode: 'production',
  navigateFallback: undefined,
  navigationPreload: false,
  offlineGoogleAnalytics: false,
  purgeOnQuotaError: true,
  skipWaiting: false,
  sourcemap: true,
};
