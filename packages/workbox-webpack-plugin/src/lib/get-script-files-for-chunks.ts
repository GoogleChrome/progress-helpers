/*
  Copyright 2019 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import upath from 'upath';
import {Compilation, WebpackError} from 'webpack-v5';

import {resolveWebpackURL} from './resolve-webpack-url';

export function getScriptFilesForChunks(compilation: Compilation, chunkNames: Array<string>): Array<string> {
  const {chunks} = compilation.getStats().toJson({chunks: true});
  const {publicPath} = compilation.options.output;
  const scriptFiles = new Set<string>();

  for (const chunkName of chunkNames) {
    const chunk = chunks!.find((chunk) => chunk.names?.includes(chunkName));
    if (chunk) {
      for (const file of chunk?.files ?? []) {
        // See https://github.com/GoogleChrome/workbox/issues/2161
        if (upath.extname(file) === '.js') {
          scriptFiles.add(resolveWebpackURL(publicPath as string, file));
        }
      }
    } else {
      compilation.warnings.push(new WebpackError(`${chunkName} was provided to ` +
        `importScriptsViaChunks, but didn't match any named chunks.`));
    }
  }

  if (scriptFiles.size === 0) {
    compilation.warnings.push(new WebpackError(`There were no assets matching ` +
        `importScriptsViaChunks: [${chunkNames}].`));
  }

  return Array.from(scriptFiles);
}
