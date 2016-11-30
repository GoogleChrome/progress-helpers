/* global goog, expect */

describe('sw-precaching Test Revisioned Caching', function() {
  beforeEach(function() {
    return window.goog.swUtils.cleanState()
    .then(() => {
      return new Promise((resolve, reject) => {
        // TODO: Move to constants
        const req = indexedDB.deleteDatabase('sw-precaching');
        req.onsuccess = function() {
          resolve();
        };
        req.onerror = function() {
          reject();
        };
        req.onblocked = function() {
          console.log('Database delete blocked.');
        };
      });
    });
  });

  after(function() {
    // return window.goog.swUtils.cleanState();
  });

  const testFileSet = (iframe, fileSet) => {
    return window.caches.keys()
    .then((cacheNames) => {
      cacheNames.length.should.equal(1);
      return window.caches.open(cacheNames[0]);
    })
    .then((cache) => {
      return cache.keys();
    })
    .then((cachedResponses) => {
      cachedResponses.length.should.equal(fileSet.length);

      fileSet.forEach((assetAndHash) => {
        let matchingResponse = null;
        cachedResponses.forEach((cachedResponse) => {
          let desiredPath = assetAndHash;
          if (typeof assetAndHash !== 'string') {
            desiredPath = assetAndHash.path;
          }

          if (cachedResponse.url.indexOf(desiredPath) !== -1) {
            matchingResponse = cachedResponse;
            return;
          }
        });

        expect(matchingResponse).to.exist;
      });
    })
    .then(() => {
      const promises = fileSet.map((assetAndHash) => {
        let url = assetAndHash;
        if (typeof assetAndHash === 'object') {
          url = assetAndHash.path;
        }

        return iframe.contentWindow.fetch(url);
      });
      return Promise.all(promises);
    })
    .then((cachedResponses) => {
      let responses = {};
      const promises = cachedResponses.map((cachedResponse) => {
        return cachedResponse.text()
        .then((bodyText) => {
          responses[cachedResponse.url] = bodyText;
        });
      });
      return Promise.all(promises)
      .then(() => {
        return responses;
      });
    });
  };

  const compareCachedAssets = function(beforeData, afterData) {
    /**
     Object.keys(step2Responses).forEach((urlKey) => {
       if (step2Responses[urlKey] === step1Responses[urlKey]) {
         console.log(step2Responses[urlKey], step1Responses[urlKey]);
       }
     });
     */
    afterData.cacheList.forEach((afterAssetAndHash) => {
      if (typeof assetAndHash === 'string') {
        afterAssetAndHash = {path: afterAssetAndHash, revision: afterAssetAndHash};
      }

      let matchingBeforeAssetAndHash = null;
      beforeData.cacheList.forEach((beforeAssetAndHash) => {
        if (typeof beforeAssetAndHash === 'string') {
          beforeAssetAndHash = {path: beforeAssetAndHash, revision: beforeAssetAndHash};
        }

        if (beforeAssetAndHash.path === afterAssetAndHash.path) {
          matchingBeforeAssetAndHash = beforeAssetAndHash;
        }
      });

      if (!matchingBeforeAssetAndHash) {
        return;
      }

      let pathToCheck = afterAssetAndHash.path;
      if (pathToCheck.indexOf('http') !== 0) {
        pathToCheck = new URL(pathToCheck, location.origin).toString();
      }

      const beforeResponseBody = beforeData.cachedResponses[pathToCheck];
      const afterResponseBody = afterData.cachedResponses[pathToCheck];

      if (matchingBeforeAssetAndHash.revision === afterAssetAndHash.revision) {
        // The request should be the same
        beforeResponseBody.should.equal(afterResponseBody);
      } else {
        // The request should be different
        beforeResponseBody.should.not.equal(afterResponseBody);
      }
    });
  };

  it('should cache and fetch files', function() {
    return window.goog.swUtils.activateSW('data/basic-cache/basic-cache-sw.js')
    .then((iframe) => {
      return testFileSet(iframe, goog.__TEST_DATA['set-1']['step-1']);
    })
    .then((step1Responses) => {
      return window.goog.swUtils.activateSW('data/basic-cache/basic-cache-sw-2.js')
      .then((iframe) => {
        return testFileSet(iframe, goog.__TEST_DATA['set-1']['step-2']);
      })
      .then((step2Responses) => {
        compareCachedAssets({
          cacheList: goog.__TEST_DATA['set-1']['step-1'],
          cachedResponses: step1Responses,
        }, {
          cacheList: goog.__TEST_DATA['set-1']['step-2'],
          cachedResponses: step2Responses,
        });
      });
    });
  });
});
