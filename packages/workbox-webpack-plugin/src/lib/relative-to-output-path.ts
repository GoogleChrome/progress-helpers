/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import upath from 'upath';
import type {Compilation} from 'webpack-v5';

/**
 * @param {Object} compilation The webpack compilation.
 * @param {string} swDest The original swDest value.
 *
 * @return {string} If swDest was not absolute, the returns swDest as-is.
 * Otherwise, returns swDest relative to the compilation's output path.
 *
 * @private
 */
export function relativeToOutputPath(compilation: Compilation, swDest: string): string {
  // See https://github.com/jantimon/html-webpack-plugin/pull/266/files#diff-168726dbe96b3ce427e7fedce31bb0bcR38
  if (upath.resolve(swDest) === upath.normalize(swDest)) {
    return upath.relative(compilation.options.output.path!, swDest);
  }

  // Otherwise, return swDest as-is.
  return swDest;
}
