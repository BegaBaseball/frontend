import test from 'node:test';
import assert from 'node:assert/strict';

import { renderMateCiPrComment } from './mate-ci-pr-comment-lib.mjs';

test('renderMateCiPrComment renders a sticky smoke PR comment', () => {
  const comment = renderMateCiPrComment({
    mode: 'smoke',
    runUrl: 'https://github.com/example/actions/runs/1',
    reportsArtifactName: 'frontend-mate-smoke-reports',
    failureArtifactName: 'frontend-mate-smoke-cypress-failures',
    summary: {
      title: 'Frontend Mate Smoke',
      notes: [
        '- Trigger: PR path changes and manual workflow dispatch',
      ],
      stages: [
        { label: 'Unit smoke', status: 'success', count: '41/41 passed' },
        { label: 'Core E2E smoke', status: 'success', count: '22/22 passed' },
      ],
    },
  });

  assert.match(comment, /<!-- mate-ci-smoke -->/);
  assert.match(comment, /## ✅ Frontend Mate Smoke/);
  assert.match(comment, /\| Core E2E smoke \| success \| 22\/22 passed \|/);
  assert.match(comment, /Reports artifact: `frontend-mate-smoke-reports`/);
});

test('renderMateCiPrComment marks failure when any stage fails', () => {
  const comment = renderMateCiPrComment({
    mode: 'regression',
    runUrl: '',
    reportsArtifactName: 'frontend-mate-regression-reports',
    failureArtifactName: 'frontend-mate-regression-cypress-failures',
    secondaryArtifactName: 'frontend-mate-regression-visual-artifacts',
    summary: {
      title: 'Frontend Mate Regression',
      notes: [],
      stages: [
        { label: 'Route regression', status: 'failure', count: '28/29 passed, 1 failed' },
      ],
    },
  });

  assert.match(comment, /<!-- mate-ci-regression -->/);
  assert.match(comment, /## ❌ Frontend Mate Regression/);
  assert.match(comment, /Optional artifact: `frontend-mate-regression-visual-artifacts`/);
});
