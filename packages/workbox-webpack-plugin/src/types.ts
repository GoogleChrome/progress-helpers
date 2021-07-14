// @ts-ignore - TODO - use typescript version of workbox-build
import {ManifestEntry, ManifestTransform} from 'workbox-build';

export interface CommonConfig {
  additionalManifestEntries?: Array<ManifestEntry>;
  chunks?: Array<string>;
  dontCacheBustURLsMatching?: RegExp;
  exclude?: Array<string | RegExp>;
  excludeChunks?: Array<string>;
  include?: Array<string | RegExp>;
  manifestTransforms?: Array<ManifestTransform>;
  maximumFileSizeToCacheInBytes?: number;
  mode?: string;
  modifyURLPrefix?: Record<string, string>;
  swDest?: string;
}