import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';

import {
  createBegaModuleFederationConfig,
  resolveDesignSystemRemoteEnv,
} from '../module-federation.config';
import {
  createViteAliasConfig,
} from '../vite.config.ts';

test('Module Federation config keeps the host remote-free by default', () => {
  const config = createBegaModuleFederationConfig({});

  assert.equal(config.name, 'bega_frontend');
  assert.equal(config.filename, 'remoteEntry.js');
  assert.equal(config.remotes, undefined);
  assert.deepEqual(config.manifest, { fileName: 'mf-manifest.json' });
  assert.equal(config.dts, false);
  assert.equal(config.hostInitInjectLocation, 'html');
  assert.equal(config.moduleParseIdleTimeout, 20);
});

test('Module Federation config enables design_system when an entry URL is provided', () => {
  const config = createBegaModuleFederationConfig({
    VITE_MF_APP_NAME: 'main_app',
    VITE_MF_DESIGN_SYSTEM_NAME: 'custom_design_system',
    VITE_MF_DESIGN_SYSTEM_ENTRY: '  http://localhost:5001/remoteEntry.js  ',
  });

  assert.equal(config.name, 'main_app');
  assert.deepEqual(config.remotes, {
    design_system: {
      type: 'module',
      name: 'custom_design_system',
      entry: 'http://localhost:5001/remoteEntry.js',
      shareScope: 'default',
    },
  });
});

test('Module Federation config supports manifest-based design_system entries', () => {
  const config = createBegaModuleFederationConfig({
    VITE_MF_DESIGN_SYSTEM_ENTRY: '  manifest_design_system@https://cdn.example.com/design-system/mf-manifest.json  ',
  });

  assert.deepEqual(config.remotes, {
    design_system: {
      type: 'module',
      name: 'manifest_design_system',
      entry: 'https://cdn.example.com/design-system/mf-manifest.json',
      shareScope: 'default',
    },
  });
});

test('Module Federation remote env parser leaves URL-only entries intact', () => {
  assert.deepEqual(resolveDesignSystemRemoteEnv({
    VITE_MF_DESIGN_SYSTEM_ENTRY: 'https://user@example.com/design-system/mf-manifest.json',
  }), {
    name: 'design_system',
    entry: 'https://user@example.com/design-system/mf-manifest.json',
  });
});

test('Module Federation remote env parser allows explicit name override', () => {
  assert.deepEqual(resolveDesignSystemRemoteEnv({
    VITE_MF_DESIGN_SYSTEM_NAME: 'override_design_system',
    VITE_MF_DESIGN_SYSTEM_ENTRY: 'manifest_design_system@https://cdn.example.com/design-system/mf-manifest.json',
  }), {
    name: 'override_design_system',
    entry: 'https://cdn.example.com/design-system/mf-manifest.json',
  });
});

test('Module Federation remote env parser uses the separator before the entry URL', () => {
  assert.deepEqual(resolveDesignSystemRemoteEnv({
    VITE_MF_DESIGN_SYSTEM_ENTRY: 'design_system@https://cdn.example.com/@assets/design-system/mf-manifest.json',
  }), {
    name: 'design_system',
    entry: 'https://cdn.example.com/@assets/design-system/mf-manifest.json',
  });
});

test('Module Federation config pins React shared dependencies as singletons', () => {
  const config = createBegaModuleFederationConfig({});

  assert.deepEqual(config.shared, {
    react: {
      singleton: true,
      requiredVersion: '^18.3.1',
    },
    'react-dom': {
      singleton: true,
      requiredVersion: '^18.3.1',
    },
  });
});

test('Vite maps design_system imports to local fallbacks until a remote entry exists', () => {
  const rootDir = '/tmp/bega_frontend';
  const alias = createViteAliasConfig({
    hasDesignSystemRemoteEntry: false,
    rootDir,
    useHelmetShim: false,
  });

  assert.equal(
    alias['design_system/Button'],
    resolve(rootDir, './src/components/moduleFederation/fallback/Button.tsx'),
  );
  assert.equal(
    alias['design_system/Modal'],
    resolve(rootDir, './src/components/moduleFederation/fallback/Modal.tsx'),
  );
  assert.equal(
    alias['design_system/ThemeProvider'],
    resolve(rootDir, './src/components/moduleFederation/fallback/ThemeProvider.tsx'),
  );
});

test('Vite leaves design_system imports remote-resolvable when a remote entry exists', () => {
  const alias = createViteAliasConfig({
    hasDesignSystemRemoteEntry: true,
    rootDir: '/tmp/bega_frontend',
    useHelmetShim: true,
  });

  assert.equal(alias['design_system/Button'], undefined);
  assert.equal(alias['design_system/Modal'], undefined);
  assert.equal(alias['design_system/ThemeProvider'], undefined);
  assert.equal(alias['react-helmet-async'], resolve('/tmp/bega_frontend', './src/shims/react-helmet-async.tsx'));
});
