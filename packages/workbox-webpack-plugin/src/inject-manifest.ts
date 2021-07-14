/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

// @ts-ignore - TODO get typescript version of `workbox-build`
import {escapeRegExp} from 'workbox-build/build/lib/escape-regexp';
// @ts-ignore - TODO get typescript version of `workbox-build`
import {replaceAndUpdateSourceMap} from 'workbox-build/build/lib/replace-and-update-source-map';
// @ts-ignore - TODO get typescript version of `workbox-build`
import {validateWebpackInjectManifestOptions} from 'workbox-build/build/lib/validate-options';
import prettyBytes from 'pretty-bytes';
import stringify from 'fast-json-stable-stringify';
import upath from 'upath';
import webpack from 'webpack-v5';

import {CommonConfig} from './types';
import {getManifestEntriesFromCompilation} from './lib/get-manifest-entries-from-compilation';
import {getSourcemapAssetName} from './lib/get-sourcemap-asset-name';
import {relativeToOutputPath} from './lib/relative-to-output-path';

// Used to keep track of swDest files written by *any* instance of this plugin.
// See https://github.com/GoogleChrome/workbox/issues/2181
const _generatedAssetNames = new Set<string>();

// SingleEntryPlugin in v4 was renamed to EntryPlugin in v5.
const SingleEntryPlugin = webpack.EntryPlugin || webpack.SingleEntryPlugin;

// webpack v4/v5 compatibility:
// https://github.com/webpack/webpack/issues/11425#issuecomment-686607633
const {RawSource} = webpack.sources || require('webpack-sources');

interface InjectManifestConfig extends CommonConfig {
  swSrc?: string;
  compileSrc?: boolean;
  injectionPoint?: string;
  webpackCompilationPlugins?: Array<webpack.WebpackPluginInstance>;
}

/**
 * This class supports compiling a service worker file provided via `swSrc`,
 * and injecting into that service worker a list of URLs and revision
 * information for precaching based on the webpack asset pipeline.
 *
 * Use an instance of `InjectManifest` in the
 * [`plugins` array](https://webpack.js.org/concepts/plugins/#usage) of a
 * webpack config.
 *
 * @memberof module:workbox-webpack-plugin
 */
export default class InjectManifest {
  private config: InjectManifestConfig;
  private alreadyCalled: boolean;
  // eslint-disable-next-line jsdoc/newline-after-description
  /**
   * Creates an instance of InjectManifest.
   *
   * @param {Object} config The configuration to use.
   *
   * @param {string} config.swSrc An existing service worker file that will be
   * compiled and have a precache manifest injected into it.
   *
   * @param {Array<module:workbox-build.ManifestEntry>} [config.additionalManifestEntries]
   * A list of entries to be precached, in addition to any entries that are
   * generated as part of the build configuration.
   *
   * @param {Array<string>} [config.chunks] One or more chunk names whose corresponding
   * output files should be included in the precache manifest.
   *
   * @param {boolean} [config.compileSrc=true] When `true` (the default), the
   * `swSrc` file will be compiled by webpack. When `false`, compilation will
   * not occur (and `webpackCompilationPlugins` can't be used.) Set to `false`
   * if you want to inject the manifest into, e.g., a JSON file.
   *
   * @param {RegExp} [config.dontCacheBustURLsMatching] Assets that match this will be
   * assumed to be uniquely versioned via their URL, and exempted from the normal
   * HTTP cache-busting that's done when populating the precache. (As of Workbox
   * v6, this option is usually not needed, as each
   * [asset's metadata](https://github.com/webpack/webpack/issues/9038) is used
   * to determine whether it's immutable or not.)
   *
   * @param {Array<string|RegExp>} [config.exclude=[/\.map$/, /^manifest.*\.js$]]
   * One or more specifiers used to exclude assets from the precache manifest.
   * This is interpreted following
   * [the same rules](https://webpack.js.org/configuration/module/#condition)
   * as `webpack`'s standard `exclude` option.
   *
   * @param {Array<string>} [config.excludeChunks] One or more chunk names whose
   * corresponding output files should be excluded from the precache manifest.
   *
   * @param {Array<string|RegExp>} [config.include]
   * One or more specifiers used to include assets in the precache manifest.
   * This is interpreted following
   * [the same rules](https://webpack.js.org/configuration/module/#condition)
   * as `webpack`'s standard `include` option.
   *
   * @param  {string} [config.injectionPoint='self.__WB_MANIFEST'] The string to
   * find inside of the `swSrc` file. Once found, it will be replaced by the
   * generated precache manifest.
   *
   * @param {Array<module:workbox-build.ManifestTransform>} [config.manifestTransforms]
   * One or more functions which will be applied sequentially against the
   * generated manifest. If `modifyURLPrefix` or `dontCacheBustURLsMatching` are
   * also specified, their corresponding transformations will be applied first.
   *
   * @param {number} [config.maximumFileSizeToCacheInBytes=2097152] This value can be
   * used to determine the maximum size of files that will be precached. This
   * prevents you from inadvertently precaching very large files that might have
   * accidentally matched one of your patterns.
   *
   * @param {string} [config.mode] If set to 'production', then an optimized service
   * worker bundle that excludes debugging info will be produced. If not explicitly
   * configured here, the `mode` value configured in the current `webpack`
   * compilation will be used.
   *
   * @param {object<string, string>} [config.modifyURLPrefix] A mapping of prefixes
   * that, if present in an entry in the precache manifest, will be replaced with
   * the corresponding value. This can be used to, for example, remove or add a
   * path prefix from a manifest entry if your web hosting setup doesn't match
   * your local filesystem setup. As an alternative with more flexibility, you can
   * use the `manifestTransforms` option and provide a function that modifies the
   * entries in the manifest using whatever logic you provide.
   *
   * @param {string} [config.swDest] The asset name of the
   * service worker file that will be created by this plugin. If omitted, the
   * name will be based on the `swSrc` name.
   *
   * @param {Array<Object>} [config.webpackCompilationPlugins] Optional `webpack`
   * plugins that will be used when compiling the `swSrc` input file.
   */
  constructor(config: InjectManifestConfig = {}) {
    this.config = config;
    this.alreadyCalled = false;
  }

  /**
   * @param {Object} [compiler] default compiler object passed from webpack
   *
   * @private
   */
  propagateWebpackConfig(compiler: webpack.Compiler): void {
    // Because this.config is listed last, properties that are already set
    // there take precedence over derived properties from the compiler.
    this.config = Object.assign({
      mode: compiler.options.mode,
      // Use swSrc with a hardcoded .js extension, in case swSrc is a .ts file.
      swDest: upath.parse(this.config.swSrc!).name + '.js',
    }, this.config);
  }

  /**
   * @param {Object} [compiler] default compiler object passed from webpack
   *
   * @private
   */
  apply(compiler: webpack.Compiler): void {
    this.propagateWebpackConfig(compiler);

    compiler.hooks.make.tapPromise(
        this.constructor.name,
        (compilation) => this.handleMake(compilation, compiler).catch(
            (error: webpack.WebpackError) => {
              compilation.errors.push(error)
            }),
    );

    // webpack v4/v5 compatibility:
    // https://github.com/webpack/webpack/issues/11425#issuecomment-690387207
    if (webpack.version.startsWith('4.')) {
      compiler.hooks.emit.tapPromise(
          this.constructor.name,
          (compilation) => this.addAssets(compilation).catch(
              (error: webpack.WebpackError) => {
                compilation.errors.push(error)
              }),
      );
    } else {
      const {PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER} = webpack.Compilation;
      // Specifically hook into thisCompilation, as per
      // https://github.com/webpack/webpack/issues/11425#issuecomment-690547848
      compiler.hooks.thisCompilation.tap(
          this.constructor.name, (compilation) => {
            compilation.hooks.processAssets.tapPromise({
              name: this.constructor.name,
              // TODO(jeffposnick): This may need to change eventually.
              // See https://github.com/webpack/webpack/issues/11822#issuecomment-726184972
              stage: PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER - 10,
            }, () => this.addAssets(compilation).catch(
                (error: webpack.WebpackError) => {
                  compilation.errors.push(error)
                }),
            );
          },
      );
    }
  }

  /**
   * @param {Object} compilation The webpack compilation.
   * @param {Object} parentCompiler The webpack parent compiler.
   *
   * @private
   */
  async performChildCompilation(compilation: webpack.Compilation, parentCompiler: webpack.Compiler): Promise<void> {
    const outputOptions = {
      path: parentCompiler.options.output.path,
      filename: this.config.swDest,
    };

    const childCompiler = compilation.createChildCompiler(
        this.constructor.name,
        outputOptions,
    );

    childCompiler.context = parentCompiler.context;
    childCompiler.inputFileSystem = parentCompiler.inputFileSystem;
    childCompiler.outputFileSystem = parentCompiler.outputFileSystem;

    if (Array.isArray(this.config.webpackCompilationPlugins)) {
      for (const plugin of this.config.webpackCompilationPlugins) {
        plugin.apply(childCompiler);
      }
    }

    new SingleEntryPlugin(
        parentCompiler.context,
        this.config.swSrc!,
        this.constructor.name,
    ).apply(childCompiler);

    await new Promise<void>((resolve, reject) => {
      childCompiler.runAsChild((error, _entries, childCompilation) => {
        if (error) {
          reject(error);
        } else {
          compilation.warnings = compilation.warnings.concat(
              childCompilation?.warnings ?? []);
          compilation.errors = compilation.errors.concat(
              childCompilation?.errors ?? []);

          resolve();
        }
      });
    });
  }

  /**
   * @param {Object} compilation The webpack compilation.
   * @param {Object} parentCompiler The webpack parent compiler.
   *
   * @private
   */
  addSrcToAssets(compilation: webpack.Compilation, parentCompiler: webpack.Compiler): void {
    // TODO - readFileSync doesn't exist in webpack v5?
    // @ts-ignore
    const source = parentCompiler.inputFileSystem.readFileSync(
        this.config.swSrc!).toString();
    compilation.emitAsset(this.config.swDest!, new RawSource(source));
  }

  /**
   * @param {Object} compilation The webpack compilation.
   * @param {Object} parentCompiler The webpack parent compiler.
   *
   * @private
   */
  async handleMake(compilation: webpack.Compilation, parentCompiler: webpack.Compiler): Promise<void> {
    try {
      this.config = validateWebpackInjectManifestOptions(this.config);
    } catch (error) {
      throw new Error(`Please check your ${this.constructor.name} plugin ` +
        `configuration:\n${error.message}`);
    }

    this.config.swDest = relativeToOutputPath(compilation, this.config.swDest!);
    _generatedAssetNames.add(this.config.swDest);

    if (this.config.compileSrc) {
      await this.performChildCompilation(compilation, parentCompiler);
    } else {
      this.addSrcToAssets(compilation, parentCompiler);
      // This used to be a fatal error, but just warn at runtime because we
      // can't validate it easily.
      if (Array.isArray(this.config.webpackCompilationPlugins) &&
          this.config.webpackCompilationPlugins.length > 0) {
        compilation.warnings.push(new webpack.WebpackError('compileSrc is false, so the ' +
          'webpackCompilationPlugins option will be ignored.'));
      }
    }
  }

  /**
   * @param {Object} compilation The webpack compilation.
   *
   * @private
   */
  async addAssets(compilation: webpack.Compilation): Promise<void> {
    // See https://github.com/GoogleChrome/workbox/issues/1790
    if (this.alreadyCalled) {
      const warningMessage = `${this.constructor.name} has been called ` +
        `multiple times, perhaps due to running webpack in --watch mode. The ` +
        `precache manifest generated after the first call may be inaccurate! ` +
        `Please see https://github.com/GoogleChrome/workbox/issues/1790 for ` +
        `more information.`;

      if (!compilation.warnings.some((warning) => warning instanceof Error &&
            warning.message === warningMessage)) {
        compilation.warnings.push(new webpack.WebpackError(warningMessage));
      }
    } else {
      this.alreadyCalled = true;
    }

    const config = Object.assign({}, this.config);

    // Ensure that we don't precache any of the assets generated by *any*
    // instance of this plugin.
    // @ts-ignore - TODO webpack v5 doesn't accept functions? possibly?
    config.exclude!.push(({asset}) => _generatedAssetNames.has(asset.name));

    // See https://webpack.js.org/contribute/plugin-patterns/#monitoring-the-watch-graph
    const absoluteSwSrc = upath.resolve(this.config.swSrc);
    compilation.fileDependencies.add(absoluteSwSrc);

    const swAsset = compilation.getAsset(config.swDest!);
    const swAssetString = swAsset!.source.source().toString();

    const globalRegexp = new RegExp(escapeRegExp(config.injectionPoint), 'g');
    const injectionResults = swAssetString.match(globalRegexp);

    if (!injectionResults) {
      throw new Error(`Can't find ${config.injectionPoint} in your SW source.`);
    }
    if (injectionResults.length !== 1) {
      throw new Error(`Multiple instances of ${config.injectionPoint} were ` +
          `found in your SW source. Include it only once. For more info, see ` +
          `https://github.com/GoogleChrome/workbox/issues/2681`);
    }

    const {size, sortedEntries} = await getManifestEntriesFromCompilation(
        compilation, config);

    let manifestString = stringify(sortedEntries);
    if (this.config.compileSrc &&
      // See https://github.com/GoogleChrome/workbox/issues/2729
      // (TODO: Switch to ?. once our linter supports it.)
      !(compilation.options &&
        compilation.options.devtool === 'eval-cheap-source-map' &&
        compilation.options.optimization &&
        compilation.options.optimization.minimize)
    ) {
      // See https://github.com/GoogleChrome/workbox/issues/2263
      manifestString = manifestString.replace(/"/g, `'`);
    }

    const sourcemapAssetName = getSourcemapAssetName(
        compilation, swAssetString, config.swDest!);

    if (sourcemapAssetName) {
      _generatedAssetNames.add(sourcemapAssetName);
      const sourcemapAsset = compilation.getAsset(sourcemapAssetName);
      const {source, map} = await replaceAndUpdateSourceMap({
        jsFilename: config.swDest,
        originalMap: JSON.parse(sourcemapAsset!.source.source().toString()),
        originalSource: swAssetString,
        replaceString: manifestString,
        searchString: config.injectionPoint,
      });

      compilation.updateAsset(sourcemapAssetName, new RawSource(map));
      compilation.updateAsset(config.swDest!, new RawSource(source));
    } else {
      // If there's no sourcemap associated with swDest, a simple string
      // replacement will suffice.
      compilation.updateAsset(config.swDest!, new RawSource(
          swAssetString.replace(config.injectionPoint!, manifestString)));
    }

    if (compilation.getLogger) {
      const logger = compilation.getLogger(this.constructor.name);
      logger.info(`The service worker at ${config.swDest} will precache
        ${sortedEntries.length} URLs, totaling ${prettyBytes(size)}.`);
    }
  }
}
