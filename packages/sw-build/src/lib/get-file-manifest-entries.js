const errors = require('./errors');
const filterFiles = require('./utils/filter-files');
const getCompositeDetails = require('./utils/get-composite-details');
const getFileDetails = require('./utils/get-file-details');
const getStringDetails = require('./utils/get-string-details');

/**
 * @typedef {Object} ManifestEntry
 * @property {String} url The URL to the asset in the manifest.
 * @property {String} revision The revision details for the file. This is a
 * hash generated by node based on the file contents.
 * @memberof module:sw-build
 */


/**
 * To get a list of files and revision details that can be used to ultimately
 * precache assets in a service worker.
 *
 * @param {Object} input
 * @param {Array<String>} input.staticFileGlobs Patterns used to select files to
 * include in the file entries.
 * @param {Array<String>} [input.globIgnores] Patterns used to exclude files
 * from the file entries.
 * @param {String} input.rootDirectory The directory run the glob patterns over.
 * @param {Object<String,Array|String>} [input.templatedUrls]
 * If a URL is rendered/templated on the server, its contents may not depend on
 * a single file. This maps URLs to a list of file names, or to a string
 * value, that uniquely determines each URL's contents.
 * @param {Object} [input.modifyUrlPrefix] An object consisting of key, value
 * string pairs where the key is the prefix to replace in a url and the
 * value is the replacement string.
 * @return {Array<ManifestEntry>} An array of ManifestEntries will include
 * a url and revision details for each file found.
 * @memberof module:sw-build
 */
const getFileManifestEntries = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(errors['invalid-get-manifest-entries-input']);
  }

  const staticFileGlobs = input.staticFileGlobs;
  const globIgnores = input.globIgnores ? input.globIgnores : [];
  const rootDirectory = input.rootDirectory;
  const templatedUrls = input.templatedUrls;

  if (typeof rootDirectory !== 'string' || rootDirectory.length === 0) {
    return Promise.reject(
      new Error(errors['invalid-root-directory']));
  }

  if (!staticFileGlobs || !Array.isArray(staticFileGlobs)) {
    return Promise.reject(
      new Error(errors['invalid-static-file-globs']));
  }

  if (!globIgnores || !Array.isArray(globIgnores)) {
    return Promise.reject(
      new Error(errors['invalid-glob-ignores']));
  }

  let validIgnores = true;
  globIgnores.forEach((pattern) => {
    if (typeof pattern !== 'string') {
      validIgnores = false;
    }
  });
  if (!validIgnores) {
    return Promise.reject(
      new Error(errors['invalid-glob-ignores']));
  }

  const fileSet = new Set();

  const fileDetails = staticFileGlobs.reduce((accumulated, globPattern) => {
    const globbedFileDetails = getFileDetails(
      rootDirectory, globPattern, globIgnores);
    globbedFileDetails.forEach((fileDetails) => {
      if (fileSet.has(fileDetails.file)) {
        return;
      }

      fileSet.add(fileDetails.file);
      accumulated.push(fileDetails);
    });
    return accumulated;
  }, []);

  // templatedUrls is optional.
  if (templatedUrls) {
    if (typeof templatedUrls !== 'object' || Array.isArray(templatedUrls)) {
      return Promise.reject(new Error(errors['invalid-templated-urls']));
    }

    for (let url of Object.keys(templatedUrls)) {
      if (fileSet.has(url)) {
        return Promise.reject(
          new Error(errors['templated-url-matches-glob']));
      }

      const dependencies = templatedUrls[url];
      if (Array.isArray(dependencies)) {
        const dependencyDetails = dependencies.reduce((previous, pattern) => {
          const globbedFileDetails = getFileDetails(
            rootDirectory, pattern, globIgnores);
          return previous.concat(globbedFileDetails);
        }, []);
        fileDetails.push(getCompositeDetails(url, dependencyDetails));
      } else if (typeof dependencies === 'string') {
        fileDetails.push(getStringDetails(url, dependencies));
      } else {
        return Promise.reject(
          new Error(errors['invalid-templated-urls']));
      }
    }
  }

  return Promise.resolve(filterFiles(fileDetails, input));
};

module.exports = getFileManifestEntries;
