import assert from 'node:assert/strict';
import test from 'node:test';

import { detectReactDevArtifacts } from './lib/react-dev-artifact-policy.mjs';

test('detectReactDevArtifacts detects compiled React dev JSX output', () => {
  const contents = 'const view=G.jsxDEV("div",{children:"x"},void 0,false,{fileName:"/repo/src/App.tsx",lineNumber:1,columnNumber:2},void 0);';

  assert.deepEqual(detectReactDevArtifacts(contents), [
    'react_jsxdev_call',
    'react_source_file_metadata',
  ]);
});

test('detectReactDevArtifacts ignores dependency code that only supports a dev option', () => {
  const contents = 'if(n.development){if(typeof n.jsxDEV!="function")throw new TypeError("Expected `jsxDEV` in options");r=pl(t,n.jsxDEV)}';

  assert.deepEqual(detectReactDevArtifacts(contents), []);
});
