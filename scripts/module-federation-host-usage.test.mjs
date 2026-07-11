import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

const readProjectFile = (relativePath) =>
  readFileSync(resolve(PROJECT_ROOT, relativePath), 'utf8');

test('host probe consumes the design_system remote with React.lazy imports', () => {
  const source = readProjectFile('src/components/moduleFederation/ModuleFederationDesignSystemProbe.tsx');

  for (const remoteModule of [
    'design_system/Button',
    'design_system/Modal',
    'design_system/ThemeProvider',
  ]) {
    assert.match(
      source,
      new RegExp(`lazy\\(\\(\\) => import\\('${remoteModule.replace('/', '\\/')}'\\)\\)`),
      `probe must lazy import ${remoteModule}`,
    );
  }

  assert.match(source, /<Suspense fallback={<ModuleFederationProbeFallback \/>}>/);
  assert.match(source, /Remote entry is configured\./);
  assert.doesNotMatch(source, /`Remote entry: \$\{remoteEntry\}`/);
});

test('internal Module Federation probe route is gated by dev or remote entry', () => {
  const source = readProjectFile('src/components/AppRoutes.tsx');

  assert.match(source, /import\.meta\.env\.DEV \|\| import\.meta\.env\.VITE_MF_DESIGN_SYSTEM_ENTRY/);
  assert.match(source, /path="\/internal\/module-federation-design-system"/);
});

test('design_system imports fall back locally until a real remote entry is configured', () => {
  const viteConfig = readProjectFile('vite.config.ts');

  for (const remoteModule of [
    'design_system/Button',
    'design_system/Modal',
    'design_system/ThemeProvider',
  ]) {
    assert.match(viteConfig, new RegExp(`'${remoteModule.replace('/', '\\/')}'`));
  }

  assert.match(viteConfig, /const hasDesignSystemRemoteEntry = Boolean\(env\.VITE_MF_DESIGN_SYSTEM_ENTRY\?\.trim\(\)\)/);
  assert.match(viteConfig, /if \(!hasDesignSystemRemoteEntry\)/);

  for (const fallbackPath of [
    'src/components/moduleFederation/fallback/Button.tsx',
    'src/components/moduleFederation/fallback/Modal.tsx',
    'src/components/moduleFederation/fallback/ThemeProvider.tsx',
  ]) {
    assert.equal(existsSync(resolve(PROJECT_ROOT, fallbackPath)), true, `${fallbackPath} must exist`);
  }
});

test('Module Federation docs describe the host probe route', () => {
  const docs = readProjectFile('docs/module-federation.md');
  const packageJson = JSON.parse(readProjectFile('package.json'));

  assert.match(docs, /\/internal\/module-federation-design-system/);
  assert.match(docs, /local design_system fallback aliases/);
  assert.match(docs, /npm run smoke:mf:probe/);
  assert.equal(
    packageJson.scripts['smoke:mf:probe'],
    'node scripts/module-federation-probe-smoke.mjs',
  );
  assert.equal(
    packageJson.scripts['readiness:mf'],
    'node scripts/module-federation-readiness.mjs',
  );
  assert.equal(
    packageJson.scripts['readiness:mf:remote'],
    'node scripts/module-federation-readiness.mjs --require-remote',
  );
  assert.equal(
    packageJson.scripts['smoke:mf:probe:remote'],
    'node scripts/module-federation-probe-smoke.mjs --remote',
  );
  assert.equal(
    existsSync(resolve(PROJECT_ROOT, 'scripts/module-federation-probe-smoke.mjs')),
    true,
    'module-federation-probe-smoke.mjs must exist',
  );
  assert.equal(
    existsSync(resolve(PROJECT_ROOT, 'scripts/module-federation-probe-smoke.test.mjs')),
    true,
    'module-federation-probe-smoke.test.mjs must exist',
  );
  assert.equal(
    existsSync(resolve(PROJECT_ROOT, 'scripts/module-federation-readiness.mjs')),
    true,
    'module-federation-readiness.mjs must exist',
  );
  assert.equal(
    existsSync(resolve(PROJECT_ROOT, 'scripts/module-federation-readiness.test.mjs')),
    true,
    'module-federation-readiness.test.mjs must exist',
  );
  assert.equal(
    existsSync(resolve(PROJECT_ROOT, 'cypress/e2e/module-federation-probe.cy.ts')),
    true,
    'module-federation-probe.cy.ts must exist',
  );
});
