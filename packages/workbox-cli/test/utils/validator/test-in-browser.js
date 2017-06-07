const querystring = require('querystring');
const seleniumAssistant = require('selenium-assistant');
const fs = require('fs');
const path = require('path');
const url = require('url');

const getSeleniumBrowser = () => {
  if (process.platform !== 'win32') {
    console.log('Running in Chrome stable.');
    return seleniumAssistant.getLocalBrowser('chrome', 'stable');
  }

  if (!process.env['SAUCELABS_USERNAME'] ||
    !process.env['SAUCELABS_ACCESS_KEY']) {
    console.warn('Skipping SauceLabs tests due to no credentials in environment');
    return null;
  }

  console.log('Running in a windows Windows Environment, using SauceLabs.');

  const SAUCELABS_USERNAME = process.env['SAUCELABS_USERNAME'];
  const SAUCELABS_ACCESS_KEY = process.env['SAUCELABS_ACCESS_KEY'];
  seleniumAssistant.setSaucelabsDetails(SAUCELABS_USERNAME, SAUCELABS_ACCESS_KEY);
  return seleniumAssistant.startSaucelabsConnect()
  .then(() => {
    return seleniumAssistant.getSauceLabsBrowser('chrome', 'latest');
  });
};

const testInBrowser = (baseTestUrl, fileManifestOutput, swDest, exampleProject) => {
  const assistantBrowser = getSeleniumBrowser();
  if (!assistantBrowser) {
    return Promise.resolve();
  }

  let globalDriver;

  const performCleanup = (err) => {
    console.log('Performing cleanup of selenium browser...');
    return seleniumAssistant.stopSaucelabsConnect()
    .then(() => {
      if (!globalDriver) {
        return;
      }

      return seleniumAssistant.killWebDriver(globalDriver);
    })
    .catch(() => {})
    .then(() => {
      if (err) {
        return Promise.reject(err);
      }

      return Promise.resolve();
    });
  };

  return assistantBrowser.getSeleniumDriver()
  .then((browserDriver) => {
    globalDriver = browserDriver;
  })
  .then(() => {
    const urlFriendlyDest = querystring.escape(swDest);
    console.log(`Opening URL in browser: ${baseTestUrl}/index.html?sw=${urlFriendlyDest}`);
    return globalDriver.get(`${baseTestUrl}/index.html?sw=${urlFriendlyDest}`);
  })
  .then(() => {
    console.log('Waiting for browser to have window.__testresult set....');
    return globalDriver.wait(() => {
      return globalDriver.executeScript(() => {
        return typeof window.__testresult !== 'undefined';
      });
    });
  })
  .then(() => {
    console.log('Getting window.__testresult from browser....');
    return globalDriver.executeScript(() => {
      return window.__testresult;
    });
  })
  .then((testResult) => {
    console.log('Retrieved test results from the browser...');
    if (!testResult.entries) {
        throw new Error(`Bad test results from mocha: '${JSON.stringify(testResult)}'`);
      }

      const entries = testResult.entries;
      entries.length.should.equal(fileManifestOutput.length);

      const pathnames = entries.map((entry) => {
        return url.parse(entry).pathname;
      });

      fileManifestOutput.forEach((details) => {
        try {
          fs.statSync(path.join(exampleProject, details.url));
        } catch (err) {
          throw new Error(`The path '${details.url}' from the manifest doesn't seem valid.`);
        }

        const expectedFileIndex = pathnames.indexOf(details.url);
        if (expectedFileIndex === -1) {
          console.log(entries);
          console.log('Problem file: ', details.url);
          throw new Error(`Unexpected file in manifest (2): '${details.url}'`);
        }

        pathnames.splice(expectedFileIndex, 1);

        (typeof details.revision).should.equal('string');
        details.revision.length.should.be.gt(0);
      });

      pathnames.length.should.equal(0);
  })
  .then(performCleanup, performCleanup);
};

module.exports = testInBrowser;
