import assert from 'node:assert/strict';
import test from 'node:test';

const helpers = await import('./lib/landing-audit-contracts.mjs').catch(() => ({}));

test('landing QA rejects missing and non-finite phone widths explicitly', () => {
  assert.equal(typeof helpers.getPhoneWidthFailure, 'function');

  for (const phoneWidth of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.match(
      helpers.getPhoneWidthFailure({ label: 'mobile', phoneWidth, viewportWidth: 375 }),
      /^mobile: missing phone width metric/,
    );
  }

  assert.equal(
    helpers.getPhoneWidthFailure({ label: 'mobile', phoneWidth: 347, viewportWidth: 375 }),
    null,
  );
  assert.match(
    helpers.getPhoneWidthFailure({ label: 'mobile', phoneWidth: 348, viewportWidth: 375 }),
    /phone width 348px exceeds 347px/,
  );
});

test('first-load visibility requires two-axis viewport intersection and positive opacity', () => {
  assert.equal(typeof helpers.isViewportIntersectionVisible, 'function');

  const visible = {
    rect: { width: 100, height: 80, top: 10, right: 120, bottom: 90, left: 20 },
    viewportWidth: 390,
    viewportHeight: 844,
    display: 'block',
    visibility: 'visible',
    opacity: '1',
  };

  assert.equal(helpers.isViewportIntersectionVisible(visible), true);
  assert.equal(helpers.isViewportIntersectionVisible({ ...visible, rect: { ...visible.rect, right: 0, left: -100 } }), false);
  assert.equal(helpers.isViewportIntersectionVisible({ ...visible, rect: { ...visible.rect, left: 390, right: 490 } }), false);
  assert.equal(helpers.isViewportIntersectionVisible({ ...visible, rect: { ...visible.rect, bottom: 0, top: -80 } }), false);
  assert.equal(helpers.isViewportIntersectionVisible({ ...visible, rect: { ...visible.rect, top: 844, bottom: 924 } }), false);
  assert.equal(helpers.isViewportIntersectionVisible({ ...visible, opacity: '0' }), false);
});

test('first-load counts unique successful mascot completions and enforces the exact 0 to 1 transition', () => {
  assert.equal(typeof helpers.collectSuccessfulDeferredRequests, 'function');
  assert.equal(typeof helpers.getClosingAuditFailures, 'function');

  const requests = [
    { id: 1, deferred: true, status: 200, completedAt: 120 },
    { id: 1, deferred: true, status: 200, completedAt: 120 },
    { id: 2, deferred: true, status: 500, completedAt: 140 },
    { id: 3, deferred: false, status: 200, completedAt: 160 },
  ];
  const successful = helpers.collectSuccessfulDeferredRequests(requests, { from: 100, to: 200 });
  assert.deepEqual(successful.map((request) => request.id), [1]);

  assert.deepEqual(helpers.getClosingAuditFailures({
    initialSnapshot: { closingVisible: false, closingMascotVisible: false },
    afterSnapshot: { closingVisible: true, closingMascotVisible: true },
    initialSuccessfulRequestCount: 0,
    afterSuccessfulRequestCount: 1,
  }), []);

  const failures = helpers.getClosingAuditFailures({
    initialSnapshot: { closingVisible: true, closingMascotVisible: true },
    afterSnapshot: { closingVisible: false, closingMascotVisible: false },
    initialSuccessfulRequestCount: 1,
    afterSuccessfulRequestCount: 2,
  });
  assert.ok(failures.some((failure) => failure.includes('closing section was visible before scroll')));
  assert.ok(failures.some((failure) => failure.includes('closing mascot was visible before scroll')));
  assert.ok(failures.some((failure) => failure.includes('exactly 0 successful lazy closing requests before scroll, received 1')));
  assert.ok(failures.some((failure) => failure.includes('exactly 1 successful lazy closing request after scroll, received 2')));
});

test('Landing screenshot guard traverses the static manifest closure without rejecting approved local assets', () => {
  assert.equal(typeof helpers.findForbiddenManifestClosureReferences, 'function');

  const manifest = {
    'src/components/Landing.tsx': {
      file: 'assets/Landing-current.js',
      imports: ['_landing-assets.js'],
    },
    '_landing-assets.js': {
      file: 'assets/landing-assets-current.js',
      imports: ['_nested.js'],
      assets: ['assets/stadium_bg-current.webp', 'assets/team-logo-current.png'],
    },
    '_nested.js': {
      file: 'assets/nested-current.js',
      assets: ['assets/landing-showcase-home-regression.webp'],
    },
  };

  const result = helpers.findForbiddenManifestClosureReferences(
    manifest,
    ['src/components/Landing.tsx'],
    ['landing-showcase-'],
  );

  assert.deepEqual(result.includedKeys, ['_landing-assets.js', '_nested.js', 'src/components/Landing.tsx']);
  assert.deepEqual(result.violations, [{
    key: '_nested.js',
    reference: 'assets/landing-showcase-home-regression.webp',
    substring: 'landing-showcase-',
  }]);
  assert.equal(result.violations.some(({ reference }) => reference.includes('stadium_bg-')), false);
  assert.equal(result.violations.some(({ reference }) => reference.includes('team-logo-')), false);
});

test('landing component-tree scan catches nested screenshot-era identifiers but permits PNG assets', () => {
  assert.equal(typeof helpers.findForbiddenSourceReferences, 'function');

  const violations = helpers.findForbiddenSourceReferences([
    { file: 'src/components/Landing.tsx', source: "import LandingHero from './landing/LandingHero';" },
    { file: 'src/components/landing/LandingHero.tsx', source: "import logo from '../../assets/team-logo.png';" },
    { file: 'src/components/landing/vignettes/Nested.tsx', source: 'const image = landingShowcaseHome;' },
  ], ['landingShowcaseHome', 'landing-showcase-']);

  assert.deepEqual(violations, [{
    file: 'src/components/landing/vignettes/Nested.tsx',
    substring: 'landingShowcaseHome',
  }]);
});
