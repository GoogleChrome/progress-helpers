const expect = require('chai').expect;
const path = require('path');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const errors = require('../../../packages/workbox-cli/src/lib/errors');

describe(`[workbox-cli] app.js`, function() {
  const MODULE_PATH = '../../../packages/workbox-cli/src/app';
  const PROXIED_CONFIG_FILE = path.resolve(process.cwd(), '/will/be/proxied');
  const PROXIED_ERROR = new Error('proxied error message');
  const PROXIED_CONFIG = {};
  const INVALID_CONFIG_FILE = '/does/not/exist';
  const UNKNOWN_COMMAND = 'unknown-command';
  const WORKBOX_BUILD_COMMANDS = [
    'generateSW',
    'injectManifest',
  ];
  const WORKBOX_BUILD_RETURN_VALUE = {
    size: 2,
    count: 1,
  };

  describe(`failures due to bad parameters`, function() {
    const app = require(MODULE_PATH);

    it(`should reject when both parameters are missing`, async function() {
      try {
        await app();
        throw new Error('Unexpected success.');
      } catch (error) {
        expect(error.message).to.have.string(errors['missing-command-param']);
      }
    });

    it(`should reject when the command parameter is missing and configFile is present`, async function() {
      try {
        await app(undefined, PROXIED_CONFIG_FILE);
        throw new Error('Unexpected success.');
      } catch (error) {
        expect(error.message).to.have.string(errors['missing-command-param']);
      }
    });

    it(`should reject when the command is unknown and configFile is present`, async function() {
      try {
        await app(UNKNOWN_COMMAND, PROXIED_CONFIG_FILE);
        throw new Error('Unexpected success.');
      } catch (error) {
        expect(error.message).to.have.string(errors['unknown-command']);
        expect(error.message).to.have.string(UNKNOWN_COMMAND);
      }
    });

    for (const command of WORKBOX_BUILD_COMMANDS) {
      it(`should reject when the command parameter is ${command} and configFile is missing`, async function() {
        try {
          await app(command);
          throw new Error('Unexpected success.');
        } catch (error) {
          expect(error.message).to.have.string(errors['missing-config-file-param']);
        }
      });
    }

    for (const command of WORKBOX_BUILD_COMMANDS) {
      it(`should reject when the command parameter is ${command} and configFile does not exist`, async function() {
        try {
          await app(command, INVALID_CONFIG_FILE);
          throw new Error('Unexpected success.');
        } catch (error) {
          expect(error.message).to.have.string(errors['invalid-common-js-module']);
        }
      });
    }
  });

  describe(`failures due to workbox-build runtime errors`, function() {
    for (const command of WORKBOX_BUILD_COMMANDS) {
      // TODO: Expand this list.
      const badConfigs = [
        {},
        {swDest: null},
        {globPatterns: null, swDest: '/path/to/sw.js'},
        {foo: 'bar'},
      ];

      for (const config of badConfigs) {
        it(`should reject with a validation error when workbox-build.${command}(${JSON.stringify(config)}) is called`, async function() {
          const app = proxyquire(MODULE_PATH, {
            './lib/read-config': (configFile) => {
              expect(configFile).to.eql(PROXIED_CONFIG_FILE);
              return config;
            },
          });

          try {
            await app(command, PROXIED_CONFIG_FILE);
            throw new Error('Unexpected success.');
          } catch (error) {
            expect(error.message).to.have.string(errors['config-validation-failed']);
          }
        });
      }

      it(`should reject with a generic runtime error when the workbox-build.${command}() rejects for any other reason`, async function() {
        const app = proxyquire(MODULE_PATH, {
          './lib/read-config': (configFile) => {
            expect(configFile).to.eql(PROXIED_CONFIG_FILE);
            return PROXIED_CONFIG;
          },
          'workbox-build': {
            [command]: (config) => {
              expect(config).to.eql(PROXIED_CONFIG);
              throw PROXIED_ERROR;
            },
          },
        });

        try {
          await app(command, PROXIED_CONFIG_FILE);
          throw new Error('Unexpected success.');
        } catch (error) {
          expect(error.message).to.have.string(errors['workbox-build-runtime-error']);
          expect(error.message).to.have.string(PROXIED_ERROR);
        }
      });
    }
  });

  describe(`successful calls`, function() {
    for (const command of WORKBOX_BUILD_COMMANDS) {
      it(`should call logger.log() upon successfully running workbox-build.${command}()`, async function() {
        const stub = sinon.stub();
        const app = proxyquire(MODULE_PATH, {
          './lib/read-config': (configFile) => {
            expect(configFile).to.eql(PROXIED_CONFIG_FILE);
            return PROXIED_CONFIG;
          },
          './lib/logger': {
            log: stub,
          },
          'workbox-build': {
            [command]: () => {
              return WORKBOX_BUILD_RETURN_VALUE;
            },
          },
        });

        await app(command, PROXIED_CONFIG_FILE);
        expect(stub.calledOnce).to.be.true;
      });
    }
  });
});
