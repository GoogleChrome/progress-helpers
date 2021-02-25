/*
  Copyright 2019 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

const {expect} = require('chai');
const templateData = require('../../../infra/testing/server/template-data');
const {executeAsyncAndCatch} = require('../../../infra/testing/webdriver/executeAsyncAndCatch');
const {getLastWindowHandle} = require('../../../infra/testing/webdriver/getLastWindowHandle');
const {openNewTab} = require('../../../infra/testing/webdriver/openNewTab');
const {runUnitTests} = require('../../../infra/testing/webdriver/runUnitTests');
const {unregisterAllSWs} = require('../../../infra/testing/webdriver/unregisterAllSWs');
const {windowLoaded} = require('../../../infra/testing/webdriver/windowLoaded');


// Store local references of these globals.
const {webdriver, server, seleniumBrowser} = global.__workbox;

const testServerOrigin = server.getAddress();
const testPath = `${testServerOrigin}/test/workbox-window/static/`;

describe(`[workbox-window]`, function() {
  it(`passes all window unit tests`, async function() {
    await runUnitTests('/test/workbox-window/window/');
  });
});

describe(`[workbox-window] Workbox`, function() {
  beforeEach(async function() {
    templateData.assign({version: '1'});
    await webdriver.get(testPath);
    await windowLoaded();
  });

  afterEach(async function() {
    try {
      await unregisterAllSWs();
    } catch (error) {
      // no-op
    }
  });

  describe('register', () => {
    it(`registers a new service worker`, async function() {
      const result = await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-clients-claim.js.njk');
          await wb.register();

          const reg = await navigator.serviceWorker.getRegistration();
          const sw = reg.installing || reg.waiting || reg.active;

          cb({scriptURL: sw.scriptURL});
        } catch (error) {
          cb({error: error.stack});
        }
      });

      expect(result.scriptURL).to.equal(`${testPath}sw-clients-claim.js.njk`);
    });

    it(`reports all events for a new SW registration`, async function() {
      const result = await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-clients-claim.js.njk');
          await wb.register();

          const installedSpy = sinon.spy();
          const waitingSpy = sinon.spy();
          const activatedSpy = sinon.spy();
          const controllingSpy = sinon.spy();

          wb.addEventListener('installed', installedSpy);
          wb.addEventListener('waiting', waitingSpy);
          wb.addEventListener('controlling', controllingSpy);
          wb.addEventListener('activated', activatedSpy);

          wb.addEventListener('activated', () => {
            cb({
              isUpdate: installedSpy.args[0][0].isUpdate,
              installedSpyCallCount: installedSpy.callCount,
              waitingSpyCallCount: waitingSpy.callCount,
              controllingSpyCallCount: controllingSpy.callCount,
              activatedSpyCallCount: activatedSpy.callCount,
            });
          });
        } catch (error) {
          cb({error: error.stack});
        }
      });

      // Test for truthiness because some browsers structure clone
      // `undefined` to `null`.
      expect(result.isUpdate).to.not.be.ok;
      expect(result.installedSpyCallCount).to.equal(1);
      expect(result.activatedSpyCallCount).to.equal(1);
      expect(result.controllingSpyCallCount).to.equal(1);

      //  A new installation shouldn't enter the waiting phase.
      expect(result.waitingSpyCallCount).to.equal(0);
    });

    it(`reports all events for an updated SW registration`, async function() {
      const result = await executeAsyncAndCatch(async (cb) => {
        try {
          const wb1 = new Workbox('sw-clients-claim.js.njk?v=1');
          const redundantSpy = sinon.spy();
          wb1.addEventListener('redundant', redundantSpy);

          await wb1.register();
          await wb1.controlling;

          const wb2 = new Workbox('sw-clients-claim.js.njk?v=2');
          await wb2.register();

          const installedSpy = sinon.spy();
          const waitingSpy = sinon.spy();
          const activatedSpy = sinon.spy();
          const controllingSpy = sinon.spy();

          wb2.addEventListener('installed', installedSpy);
          wb2.addEventListener('waiting', waitingSpy);
          wb2.addEventListener('controlling', controllingSpy);
          wb2.addEventListener('activated', activatedSpy);

          wb2.addEventListener('activated', () => {
            cb({
              wb1IsUpdate: redundantSpy.args[0][0].isUpdate,
              wb2IsUpdate: installedSpy.args[0][0].isUpdate,
              installedSpyCallCount: installedSpy.callCount,
              waitingSpyCallCount: waitingSpy.callCount,
              controllingSpyCallCount: controllingSpy.callCount,
              activatedSpyCallCount: activatedSpy.callCount,
            });
          });
        } catch (error) {
          cb({error: error.stack});
        }
      });

      // Test for truthiness because some browsers structure clone
      // `undefined` to `null`.
      expect(result.wb1IsUpdate).to.not.be.ok;
      expect(result.wb2IsUpdate).to.equal(true);
      expect(result.installedSpyCallCount).to.equal(1);
      expect(result.waitingSpyCallCount).to.equal(0);
      expect(result.activatedSpyCallCount).to.equal(1);
      expect(result.controllingSpyCallCount).to.equal(1);
    });

    it(`reports all events for an external SW registration`, async function() {
      // Skip this test in Safari due to this flakiness issue:
      // https://github.com/GoogleChrome/workbox/issues/2150
      if (seleniumBrowser.getId() === 'safari') {
        this.skip();
      }

      const firstTab = await getLastWindowHandle();
      await webdriver.switchTo().window(firstTab);

      await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-clients-claim.js.njk');
          await wb.register();

          // Use a global variable so these are accessible to future
          // `executeAsyncAndCatch()` calls.
          self.__spies = {
            installedSpy: sinon.spy(),
            waitingSpy: sinon.spy(),
            activatedSpy: sinon.spy(),
            controllingSpy: sinon.spy(),
            externalInstalledSpy: sinon.spy(),
            externalActivatedSpy: sinon.spy(),
          };

          wb.addEventListener('installed', self.__spies.installedSpy);
          wb.addEventListener('waiting', self.__spies.waitingSpy);
          wb.addEventListener('controlling', self.__spies.controllingSpy);
          wb.addEventListener('activated', self.__spies.activatedSpy);
          wb.addEventListener('externalinstalled', self.__spies.externalInstalledSpy);
          wb.addEventListener('externalactivated', self.__spies.externalActivatedSpy);

          // Resolve this execution block once the SW is activated.
          wb.addEventListener('activated', () => cb());
        } catch (error) {
          cb({error: error.stack});
        }
      });

      // Update the version in sw.js to trigger a new installation.
      templateData.assign({version: '2'});

      await openNewTab(testPath);
      await windowLoaded();

      await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-clients-claim.js.njk');
          await wb.register();

          // Resolve this execution block once the SW has activated.
          wb.addEventListener('activated', () => cb());
        } catch (error) {
          cb({error: error.stack});
        }
      });

      // Close the second tab and switch back to the first tab before
      // executing the following block.
      await webdriver.close();
      await webdriver.switchTo().window(firstTab);

      const result = await executeAsyncAndCatch(async (cb) => {
        try {
          cb({
            installedSpyCallCount: self.__spies.installedSpy.callCount,
            waitingSpyCallCount: self.__spies.waitingSpy.callCount,
            activatedSpyCallCount: self.__spies.activatedSpy.callCount,
            controllingSpyCallCount: self.__spies.controllingSpy.callCount,
            externalInstalledSpyCallCount: self.__spies.externalInstalledSpy.callCount,
            externalActivatedSpyCallCount: self.__spies.externalActivatedSpy.callCount,
          });
        } catch (error) {
          cb({error: error.stack});
        }
      });

      expect(result.installedSpyCallCount).to.equal(1);
      expect(result.activatedSpyCallCount).to.equal(1);
      expect(result.controllingSpyCallCount).to.equal(1);
      expect(result.externalInstalledSpyCallCount).to.equal(1);
      expect(result.externalActivatedSpyCallCount).to.equal(1);

      // The waiting phase should have been skipped.
      expect(result.waitingSpyCallCount).to.equal(0);
    });

    it(`reports all events for existing installing SW registrattion`, async function() {
      await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-installed-on-message.js.njk');
          await wb.register();
          cb();
        } catch (error) {
          cb({error: error.stack});
        }
      });

      await openNewTab(testPath);
      await windowLoaded();

      const result = await executeAsyncAndCatch(async (cb) => {
        try {
          const wb = new Workbox('sw-installed-on-message.js.njk');

          const spies = {
            installedSpy: sinon.spy(),
          };

          wb.addEventListener('installed', spies.installedSpy);
          wb.addEventListener('activated', () => cb({
            installedSpyCallCount: spies.installedSpy.callCount,
          }));

          const registration = await wb.register();

          // Would prefer to do this but wb._sw !== registration.installing
          // await wb.messageSW({
          //   type: 'FINISH_INSTALL',
          // });

          if (registration.installing) {
            window.messageSW(registration.installing, {
              type: 'FINISH_INSTALL',
            });
          }
        } catch (error) {
          cb({error: error.stack});
        }
      });

      expect(result.installedSpyCallCount).to.equal(1);
    });
  });
});
