importScripts(
  '/node_modules/mocha/mocha.js',
  '/node_modules/chai/chai.js',
  '/node_modules/sw-testing-helpers/build/browser/mocha-utils.js',
  '/packages/sw-routing/build/sw-routing.min.js'
);

const expect = self.chai.expect;
mocha.setup({
  ui: 'bdd',
  reporter: null,
});

describe('Test of the ExpressRoute class', () => {
  const path = '/test/path';
  const matchingUrl = new URL(path, location);
  const handler = {
    handle: () => {},
  };

  const invalidHandler = {};
  const nonMatchingUrl = new URL('/does/not/match', location);

  it(`should throw when ExpressRoute() is called without any parameters`, () => {
    expect(() => new goog.routing.ExpressRoute()).to.throw();
  });

  it(`should throw when ExpressRoute() is called without a valid handler`, () => {
    expect(() => new goog.routing.ExpressRoute({path})).to.throw();
    expect(() => new goog.routing.ExpressRoute({path, handler: invalidHandler})).to.throw();
  });

  it(`should throw when ExpressRoute() is called without a valid path`, () => {
    expect(() => new goog.routing.ExpressRoute({handler})).to.throw();
  });

  it(`should not throw when ExpressRoute() is called with valid handler and path parameters`, () => {
    expect(() => new goog.routing.ExpressRoute({handler, path})).not.to.throw();
  });

  it(`should properly match URLs`, () => {
    const route = new goog.routing.ExpressRoute({handler, path});
    expect(route.match({url: matchingUrl})).to.be.ok;
    expect(route.match({url: nonMatchingUrl})).not.to.be.ok;
  });
});
