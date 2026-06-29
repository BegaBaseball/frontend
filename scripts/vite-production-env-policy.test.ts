import assert from 'node:assert/strict';
import test from 'node:test';

import {
  forceProductionBuildNodeEnv,
  isProductionBuildCommand,
} from '../vite.config.ts';

test('production build mode is detected only for production builds', () => {
  assert.equal(isProductionBuildCommand({ command: 'build', mode: 'production' }), true);
  assert.equal(isProductionBuildCommand({ command: 'build', mode: 'development' }), false);
  assert.equal(isProductionBuildCommand({ command: 'serve', mode: 'production' }), false);
});

test('production build env wins over polluted NODE_ENV values', () => {
  const env = {
    NODE_ENV: 'development',
    VITE_USER_NODE_ENV: 'development',
  };

  forceProductionBuildNodeEnv(env);

  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.VITE_USER_NODE_ENV, 'production');
});
