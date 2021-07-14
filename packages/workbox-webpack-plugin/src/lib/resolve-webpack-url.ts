/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

/**
 * Resolves a url in the way that webpack would (with string concatenation)
 *
 * Use publicPath + filePath instead of url.resolve(publicPath, filePath) see:
 * https://webpack.js.org/configuration/output/#output-publicpath
 *
 * @function resolveWebpackURL
 * @param {string} publicPath The publicPath value from webpack's compilation.
 * @param {Array<string>} paths File paths to join
 * @return {string} Joined file path
 *
 * @private
 */
export function resolveWebpackURL(publicPath: string, ...paths: Array<string>): string {
  // This is a change in webpack v5.
  // See https://github.com/jantimon/html-webpack-plugin/pull/1516
  if (publicPath === 'auto') {
    return paths.join('');
  } else {
    return [publicPath, ...paths].join('');
  }
}
