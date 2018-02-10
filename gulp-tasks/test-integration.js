const gulp = require('gulp');
const oneLine = require('common-tags').oneLine;
const glob = require('glob');
const seleniumAssistant = require('selenium-assistant');
const path = require('path');
const clearRequire = require('clear-require');

const constants = require('./utils/constants');
const logHelper = require('../infra/utils/log-helper');
const testServer = require('../infra/testing/test-server');

const runFiles = (filePaths) => {
  // Mocha can't be run multiple times, which we need for NODE_ENV.
  // More info: https://github.com/mochajs/mocha/issues/995
  clearRequire.all();
  const Mocha = require('mocha');

  return new Promise((resolve, reject) => {
    const mocha = new Mocha({
      retries: process.env.TRAVIS ? 2 : 1,
      timeout: 3 * 60 * 1000,
    });

    for (const filePath of filePaths) {
      mocha.addFile(filePath);
    }

    // Run the tests.
    mocha.run(function(failureCount) {
      if (failureCount > 0) {
        return reject(`${failureCount} tests failed.`);
      }
      resolve();
    });
  });
};

const runIntegrationTestSuite = async (testPath, nodeEnv, seleniumBrowser,
                                       webdriver) => {
  logHelper.log(oneLine`
    Running Integration test on ${logHelper.highlight(testPath)}
    with NODE_ENV '${nodeEnv}'
    and browser '${logHelper.highlight(seleniumBrowser.getPrettyName())}'
  `);

  const options = [];
  if (global.cliOptions.grep) {
    options.push('--grep', global.cliOptions.grep);
  }
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.NODE_ENV = nodeEnv;

  try {
    global.__workbox = {
      webdriver,
      seleniumBrowser,
      server: testServer,
    };

    const testFiles = glob.sync(path.posix.join(__dirname, '..', testPath,
      '*.js'));

    testServer.reset();
    await runFiles(testFiles);

    process.env.NODE_ENV = originalNodeEnv;
  } catch (err) {
    process.env.NODE_ENV = originalNodeEnv;

    logHelper.error(err);
    throw new Error(
      `[Workbox Error Msg] 'gulp test-integration' discovered errors.`);
  }
};

const runIntegrationForBrowser = async (browser) => {
  const packagesToTest = glob.sync(`test/${global.packageOrStar}/integration`);

  for (const buildKey of Object.keys(constants.BUILD_TYPES)) {
    const webdriver = await browser.getSeleniumDriver();
    // Safari Tech Preview can take a long time when working with SW APIs
    webdriver.manage().timeouts().setScriptTimeout(2 * 60 * 1000);

    for (const packageToTest of packagesToTest) {
      const nodeEnv = constants.BUILD_TYPES[buildKey];
      try {
        await runIntegrationTestSuite(packageToTest, nodeEnv, browser,
          webdriver);
      } catch (error) {
        await seleniumAssistant.killWebDriver(webdriver);
        throw error;
      }
    }

    await seleniumAssistant.killWebDriver(webdriver);
  }
};

gulp.task('test-integration', async () => {
  if (process.platform === 'win32') {
    logHelper.warn(`Skipping integration tests on Windows.`);
    return;
  }

  logHelper.log(`Downloading browsers......`);
  const expiration = 24;
  await seleniumAssistant.downloadLocalBrowser('chrome', 'stable', expiration);
  await seleniumAssistant.downloadLocalBrowser('chrome', 'beta', expiration);
  await seleniumAssistant.downloadLocalBrowser('firefox', 'stable', expiration);
  await seleniumAssistant.downloadLocalBrowser('firefox', 'beta', expiration);

  const packagesToTest = glob.sync(`test/${global.packageOrStar}/integration`);
  if (packagesToTest.length === 0) {
    return;
  }

  await testServer.start();

  try {
    const localBrowsers = seleniumAssistant.getLocalBrowsers();
    for (const localBrowser of localBrowsers) {
      switch (localBrowser.getId()) {
        case 'chrome':
        case 'firefox':
          if (localBrowser.getReleaseName() !== 'unstable') {
            // await runIntegrationForBrowser(localBrowser);
          }
          break;
        case 'safari':
          if (localBrowser.getReleaseName() === 'beta') {
            await runIntegrationForBrowser(localBrowser);
          }
          break;
        default:
          logHelper.warn(oneLine`
            Skipping integration tests for ${localBrowser.getPrettyName()}.
          `);
      }
    }
    await testServer.stop();
  } catch (err) {
    await testServer.stop();
    throw err;
  }

  // TODO Saucelabs browsers for latest - 1 browser
  // TODO Saucelabs browsers for latest - 2 browser
});
