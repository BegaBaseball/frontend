import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');

const nodeTsxStep = (script, args = []) => ({
  command: 'node',
  args: ['--import', 'tsx', script, ...args],
});

const npmRunStep = (script) => ({
  command: 'npm',
  args: ['run', script],
});

const STADIUMS = {
  gocheok: {
    label: 'Gocheok Sky Dome',
    order: 1,
    qaToken: 'GOCHEOK',
    legacyArtifacts: [
      'scripts/gocheok-seatmap-ops.mjs',
    ],
    migrationBuckets: [
      {
        id: 'core-qa',
        status: 'integrated',
        patterns: [
          'gocheok-seatmap-ops.mjs',
        ],
        nextAction: 'Gocheok seatmap body and dispatcher paths are consolidated in gocheok-seatmap-ops.mjs; compatibility wrappers are retained for direct CLI parity.',
      },
    ],
    tasks: {
      'pixel-components': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gocheok-seatmap-ops.mjs', 'pixel-components'],
        },
      ],
      'trace-manifest': [
        {
          task: 'pixel-components',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gocheok-seatmap-ops.mjs', 'trace-manifest'],
        },
      ],
      evidence: [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gocheok-seatmap-ops.mjs', 'evidence'],
        },
      ],
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GOCHEOK'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GOCHEOK:FULL'],
        },
      ],
      'trace-review': [
        {
          task: 'trace-manifest',
        },
        {
          task: 'evidence',
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GOCHEOK'],
          env: { STADIUM_UX_GOCHEOK_DEBUG_CAPTURE: '1' },
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gocheok-seatmap-ops.mjs', 'release-gate'],
        },
      ],
    },
  },
  gwangju: {
    label: 'Gwangju-Kia Champions Field',
    order: 2,
    qaToken: 'GWANGJU',
    legacyArtifacts: [
      'scripts/gwangju-seatmap-core-qa.mjs',
      'scripts/gwangju-seatmap-evidence-workset-ops.mjs',
      'scripts/gwangju-seatmap-operator-template-ops.mjs',
      'scripts/gwangju-seatmap-operator-intake-write-ops.mjs',
      'scripts/gwangju-seatmap-release-staging-ops.mjs',
    ],
    migrationBuckets: [
      {
        id: 'core-qa',
        status: 'integrated',
        patterns: [
          'gwangju-seatmap-core-qa.mjs',
        ],
        nextAction: 'Gwangju core QA body and dispatcher paths are consolidated in gwangju-seatmap-core-qa.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'evidence-worksets',
        status: 'integrated',
        patterns: [
          'gwangju-seatmap-evidence-workset-ops.mjs',
        ],
        nextAction: 'Gwangju evidence/workset body and dispatcher paths are consolidated in gwangju-seatmap-evidence-workset-ops.mjs; obsolete compatibility files have been removed.',
      },
      {
        id: 'operator-template',
        status: 'integrated',
        patterns: [
          'gwangju-seatmap-operator-template-ops.mjs',
        ],
        nextAction: 'Gwangju operator-template body and dispatcher paths are consolidated in gwangju-seatmap-operator-template-ops.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'operator-intake-write',
        status: 'integrated',
        patterns: [
          'gwangju-seatmap-operator-intake-write-ops.mjs',
        ],
        nextAction: 'Gwangju operator intake/write body and dispatcher paths are consolidated in gwangju-seatmap-operator-intake-write-ops.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'release-staging',
        status: 'integrated',
        patterns: [
          'gwangju-seatmap-release-staging-ops.mjs',
        ],
        nextAction: 'Gwangju release/staging body and dispatcher paths are consolidated in gwangju-seatmap-release-staging-ops.mjs; obsolete compatibility wrappers have been removed.',
      },
    ],
    tasks: {
      'pixel-components': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
      ],
      'image-trace-candidates': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-evidence-workset-ops.mjs', 'image-trace-candidates'],
        },
      ],
      'image-alignment-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit'],
          passArgs: true,
        },
      ],
      'image-alignment-audit:require-release': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
      ],
      'third-base-independent-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-third-base-independent-audit.mjs'],
        },
      ],
      'lower-infield-independent-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-lower-infield-independent-audit.mjs'],
        },
      ],
      'trace-manifest': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
      ],
      'zone-precision-worksets': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-evidence-workset-ops.mjs', 'zone-precision-worksets'],
        },
      ],
      'evidence-inventory': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-evidence-workset-ops.mjs', 'evidence-inventory'],
        },
      ],
      'low-margin-candidates': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-evidence-workset-ops.mjs', 'low-margin-candidates'],
        },
      ],
      'browser-evidence': [
        { task: 'evidence-inventory' },
        { task: 'trace-review' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-evidence-workset-ops.mjs', 'browser-evidence'],
        },
      ],
      'operator-template': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template'],
        },
      ],
      'operator-template:validate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-validate'],
        },
      ],
      'operator-template:validate:strict': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-validate', '--strict'],
        },
      ],
      'operator-template:apply-plan': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-apply-plan'],
        },
      ],
      'operator-template:apply-plan:require-ready': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-apply-plan', '--require-ready'],
        },
      ],
      'operator-template:gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-validate'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-apply-plan'],
        },
      ],
      'operator-handoff': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-validate'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-template-apply-plan'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-handoff'],
        },
      ],
      'operator-status': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-template-ops.mjs', 'operator-status'],
        },
      ],
      'operator-input-aid': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-input-aid'],
        },
      ],
      'operator-input-packet': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-input-packet'],
        },
      ],
      'operator-intake': [
        { task: 'operator-handoff' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-input-aid'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-input-packet'],
        },
      ],
      'operator-apply': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-apply'],
        },
      ],
      'operator-write-smoke': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-write-smoke'],
        },
      ],
      'operator-write-guard': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-write-guard'],
        },
      ],
      'operator-write-guard:require-ready': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-write-guard', '--require-ready'],
        },
      ],
      'operator-prewrite-gate': [
        { task: 'operator-status' },
        { task: 'operator-write-smoke' },
        { task: 'operator-write-guard:require-ready' },
      ],
      'operator-apply:write': [
        { task: 'operator-prewrite-gate' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-operator-intake-write-ops.mjs', 'operator-apply', '--write', '--require-ready'],
        },
      ],
      'operator-postwrite-gate': [
        { task: 'operator-handoff' },
        { task: 'operator-status' },
        {
          command: 'npm',
          args: ['run', 'test:stadium:seatmaps'],
        },
        {
          command: 'npm',
          args: ['run', 'qa:stadium:gwangju:trace-review'],
        },
        {
          command: 'npm',
          args: ['run', 'build'],
        },
      ],
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GWANGJU'],
        },
      ],
      'runtime-layer': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'runtime-layer-audit'],
        },
      ],
      'visual-hit-split-audit': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GWANGJU'],
          env: {
            STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1',
            STADIUM_UX_GWANGJU_VISUAL_HIT_SPLIT_ONLY: '1',
          },
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'runtime-layer-audit'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'visual-hit-split-audit'],
        },
      ],
      'trace-review': [
        {
          command: 'node',
          args: [
            '--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'image-alignment-audit',
            '--require-sky-picnic',
            '--require-alphabet-sections',
            '--require-five-table',
          ],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GWANGJU'],
          env: { STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1' },
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'runtime-layer-audit'],
        },
      ],
      'selected-sweep': [
        {
          task: 'trace-manifest',
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'GWANGJU:EVIDENCE'],
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'release-gate'],
        },
      ],
      'release-package': [
        { task: 'operator-status' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'release-package'],
        },
      ],
      'release-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'release-audit'],
        },
      ],
      'release-scope-guard': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'release-scope-guard'],
        },
      ],
      'pr-staging-plan': [
        { task: 'release-scope-guard' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'pr-staging-plan'],
        },
      ],
      'pr-staging-review': [
        { task: 'pr-staging-plan' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'pr-staging-plan', '--review'],
        },
      ],
      'targeted-staging': [
        { task: 'pr-staging-review' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'targeted-staging'],
        },
      ],
      'staged-scope-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'staged-scope-audit'],
          passArgs: true,
        },
      ],
      'staged-scope-audit:require-complete': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'staged-scope-audit', '--require-complete'],
        },
      ],
      'pre-pr-final-gate': [
        { task: 'targeted-staging' },
        { task: 'staged-scope-audit' },
        { task: 'release-audit' },
      ],
      'commit-readiness': [
        { task: 'targeted-staging' },
        { task: 'staged-scope-audit:require-complete' },
        { task: 'release-audit' },
      ],
      'release-verify': [
        { task: 'release-verify:preoperator' },
      ],
      'release-verify:preoperator': [
        { task: 'trace-manifest' },
        { task: 'runtime-layer' },
        { task: 'release-gate' },
        { task: 'pre-pr-final-gate' },
      ],
      'release-verify:postoperator': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-release-staging-ops.mjs', 'postoperator-audit'],
        },
      ],
    },
  },
  changwon: {
    label: 'Changwon NC Park',
    order: 3,
    qaToken: 'CHANGWON',
    legacyArtifacts: [
      'scripts/changwon-seatmap-ops.mjs',
    ],
    migrationBuckets: [
      {
        id: 'seatmap-ops',
        status: 'integrated',
        patterns: [
          'changwon-seatmap-ops.mjs',
        ],
        nextAction: 'Changwon seatmap script bodies and dispatcher paths are consolidated in changwon-seatmap-ops.mjs; obsolete compatibility files have been removed.',
      },
    ],
    tasks: {
      'trace-manifest': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/changwon-seatmap-ops.mjs', 'trace-manifest'],
        },
      ],
      'ux-readiness': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/changwon-seatmap-ops.mjs', 'ux-readiness'],
        },
      ],
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'CHANGWON'],
        },
      ],
      'trace-review': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/changwon-seatmap-ops.mjs', 'trace-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/changwon-seatmap-ops.mjs', 'ux-readiness'],
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'CHANGWON'],
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/changwon-seatmap-ops.mjs', 'release-gate'],
        },
      ],
    },
  },
  jamsil: {
    label: 'Jamsil Baseball Stadium',
    order: 4,
    qaToken: 'JAMSIL',
    legacyArtifacts: [],
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'JAMSIL'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'JAMSIL:FULL'],
        },
      ],
      responsive: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'JAMSIL:RESPONSIVE'],
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/jamsil-seatmap-ops.mjs', 'release-gate'],
        },
      ],
    },
  },
  daegu: {
    label: 'Daegu Samsung Lions Park',
    order: 5,
    qaToken: 'DAEGU',
    legacyArtifacts: [
      'scripts/daegu-seatmap-core-qa.mjs',
      'scripts/daegu-seatmap-operator-corrections.mjs',
      'scripts/daegu-seatmap-missing-block.mjs',
      'scripts/daegu-seatmap-p0-operators.mjs',
      'scripts/daegu-seatmap-p1-operator-boundary.mjs',
      'scripts/daegu-seatmap-p1-paired-ownership.mjs',
      'scripts/daegu-seatmap-p2-operators.mjs',
      'scripts/daegu-seatmap-p2a-operators.mjs',
      'scripts/daegu-seatmap-p3-p4-operators.mjs',
      'scripts/daegu-seatmap-visual-match.mjs',
    ],
    migrationBuckets: [
      {
        id: 'core-qa',
        status: 'integrated',
      patterns: [
        'daegu-seatmap-core-qa.mjs',
      ],
      nextAction: 'Core QA body and dispatcher paths are consolidated in daegu-seatmap-core-qa.mjs; obsolete compatibility wrappers are removed.',
      },
      {
        id: 'operator-corrections',
      status: 'integrated',
      patterns: [
        'daegu-seatmap-operator-corrections.mjs',
      ],
      nextAction: 'Operator correction body and dispatcher paths are consolidated in daegu-seatmap-operator-corrections.mjs; obsolete compatibility wrappers are removed.',
      },
      {
        id: 'missing-block',
        status: 'integrated',
        patterns: [
          'daegu-seatmap-missing-block.mjs',
        ],
        nextAction: 'Missing-block body and dispatcher paths are consolidated in daegu-seatmap-missing-block.mjs; obsolete compatibility wrappers are removed.',
      },
      {
        id: 'priority-stage-operators',
        status: 'integrated',
        patterns: [
          'daegu-seatmap-p0-operators.mjs',
          'daegu-seatmap-p1-boundary-input-aid.mjs',
          'daegu-seatmap-p1-decision-packet.mjs',
          'daegu-seatmap-p1-next-action-packet.mjs',
          'daegu-seatmap-p1-next-operator-packet.mjs',
          'daegu-seatmap-p1-operator-boundary.mjs',
          'daegu-seatmap-p1-paired-boundary-review.mjs',
          'daegu-seatmap-p1-paired-ownership.mjs',
          'daegu-seatmap-p1-precision-workset.mjs',
          'daegu-seatmap-p1-stage-order-regression.mjs',
          'daegu-seatmap-p2-operators.mjs',
          'daegu-seatmap-p2a-operators.mjs',
          'daegu-seatmap-p3-p4-operators.mjs',
        ],
        nextAction: 'Priority-stage operator body and dispatcher paths are consolidated across p0/p1/p2/p2a/p3-p4 task runners; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'visual-match',
        status: 'integrated',
        patterns: [
          'daegu-seatmap-visual-match.mjs',
        ],
        nextAction: 'Visual-match body and dispatcher paths are consolidated in daegu-seatmap-visual-match.mjs; obsolete compatibility wrappers have been removed.',
      },
    ],
    legacyShellTasks: {
      "p2-review-package": "npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-review-package",
      "p2-staging-audit": "node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-staging-audit",
      "p2-operator-package": "npm run stadium:daegu:p2-review-package && npm run stadium:daegu:p2-staging-audit && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-package",
      "p2-decision-packet": "node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-decision-packet",
      "p2-operator-validate": "node --import tsx scripts/daegu-seatmap-operator-corrections.mjs operator-corrections-validate --input reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json --report-dir reports/stadium/daegu-p2-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json",
      "p2-operator-import": "node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-import",
      "p2-operator-readiness": "node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-readiness",
      "p2-operator-prewrite-gate": "npm run stadium:daegu:p2-operator-post-entry-qa && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && npm run stadium:daegu:p2-operator-readiness",
      "p2-operator-import:write-template": "node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-import --write-template",
      "p2-next-action-packet": "npm run stadium:daegu:p2-staging-audit && npm run stadium:daegu:p2-decision-packet && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-next-action-packet",
      "p2-operator-handoff": "npm run stadium:daegu:p2-operator-package && npm run stadium:daegu:p2-next-action-packet && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-handoff",
      "p2-operator-worksets": "npm run stadium:daegu:p2-operator-handoff && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-worksets",
      "p2-operator-workset-preflight": "npm run stadium:daegu:p2-operator-worksets && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-workset-preflight",
      "p2-operator-entry-sheet": "npm run stadium:daegu:p2-operator-workset-preflight && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-entry-sheet",
      "p2-operator-tracing-pack": "npm run stadium:daegu:p2-operator-entry-sheet && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-tracing-pack",
      "p2-operator-post-entry-qa": "npm run stadium:daegu:p2-operator-tracing-pack && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-post-entry-qa",
      "p2a-operator-post-entry-qa": "npm run stadium:daegu:operator-corrections-template && npm run stadium:daegu:operator-corrections-validate && npm run stadium:daegu:operator-corrections-batches && npm run stadium:daegu:p2-operator-post-entry-qa && node --import tsx scripts/daegu-seatmap-p2a-operators.mjs p2a-operator-post-entry-qa",
      "p2a-operator-input-packet": "npm run stadium:daegu:p2a-operator-post-entry-qa && node --import tsx scripts/daegu-seatmap-p2a-operators.mjs p2a-operator-input-packet",
      "p2a-prewrite-gate": "npm run stadium:daegu:p2a-operator-input-packet && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2a-operators.mjs p2a-prewrite-gate",
      "p2a-readiness-v3": "npm run stadium:daegu:p2a-operator-input-packet && npm run stadium:daegu:p1-operator-package && npm run stadium:daegu:p1-boundary-first-postwrite-gate && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2-operators.mjs p2-operator-readiness --allow-waiting-exit-zero && node --import tsx scripts/daegu-seatmap-p2a-operators.mjs p2a-prewrite-gate --allow-waiting-exit-zero && npm run stadium:daegu:render-safety-audit && node --import tsx scripts/daegu-seatmap-p2a-operators.mjs p2a-readiness-v3",
      "p3-p4-operator-package": "npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-operator-package",
      "p3-p4-operator-audit": "node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-operator-audit",
      "p3-p4-decision-packet": "node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-decision-packet",
      "p3-p4-operator-validate": "node --import tsx scripts/daegu-seatmap-operator-corrections.mjs operator-corrections-validate --input reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json --report-dir reports/stadium/daegu-p3-p4-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json",
      "p3-p4-operator-import": "node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-operator-import",
      "p3-p4-operator-readiness": "node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-operator-readiness",
      "p3-p4-operator-prewrite-gate": "npm run stadium:daegu:p3-p4-operator-validate && npm run stadium:daegu:p3-p4-operator-import && npm run stadium:daegu:p3-p4-operator-readiness",
      "p3-p4-operator-import:write-template": "node --import tsx scripts/daegu-seatmap-p3-p4-operators.mjs p3-p4-operator-import --write-template",
      "visual-match-audit": "npm run stadium:daegu:render-safety-audit && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-audit",
      "visual-match-workset": "npm run stadium:daegu:visual-match-audit && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-workset",
      "visual-match-batch1-operator-package": "npm run stadium:daegu:visual-match-workset && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-operator-package",
      "visual-match-batch1-operator-validate": "npm run stadium:daegu:visual-match-batch1-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-operator-validate",
      "visual-match-batch1-coordinate-guide": "npm run stadium:daegu:visual-match-batch1-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-coordinate-guide",
      "visual-match-batch1-coordinate-picker": "npm run stadium:daegu:visual-match-batch1-coordinate-guide && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-coordinate-picker",
      "visual-match-batch1-coordinate-draft-import": "npm run stadium:daegu:visual-match-batch1-coordinate-picker && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-coordinate-draft-import",
      "visual-match-batch1-draft-quality": "npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-draft-quality-report",
      "visual-match-batch1-draft-quality:allow-blocked": "npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-draft-quality-report --allow-blocked",
      "visual-match-batch1-image-draft": "npm run stadium:daegu:visual-match-batch1-coordinate-picker && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-image-draft",
      "visual-match-batch1-image-draft-quality": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-draft-quality",
      "visual-match-batch1-image-evidence-audit": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-image-evidence-audit",
      "visual-match-batch1-conflict-audit": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-conflict-audit",
      "visual-match-batch1-conflict-audit:allow-conflicts": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-conflict-audit --allow-conflicts",
      "visual-match-batch1-locked-conflict-workset": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-coordinate-draft-import && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-workset",
      "visual-match-batch1-13-14-split-analysis": "npm run stadium:daegu:visual-match-batch1-locked-conflict-workset && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-14-split-analysis",
      "visual-match-batch1-13-16-grid-split-analysis": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-13-14-split-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-16-grid-split-analysis",
      "visual-match-batch1-u28-u31-row-analysis": "npm run stadium:daegu:visual-match-batch1-image-draft && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u28-u31-row-analysis",
      "visual-match-batch1-s23-s24-row-analysis": "npm run stadium:daegu:visual-match-batch1-image-draft && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s23-s24-row-analysis",
      "visual-match-batch1-s22-s23-ownership-analysis": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-s23-s24-row-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s22-s23-ownership-analysis",
      "visual-match-batch1-integrated-review-board": "npm run stadium:daegu:visual-match-batch1-13-16-grid-split-analysis && npm run stadium:daegu:visual-match-batch1-u28-u31-row-analysis && npm run stadium:daegu:visual-match-batch1-s22-s23-ownership-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-integrated-review-board",
      "visual-match-batch1-approval-input-template": "npm run stadium:daegu:visual-match-batch1-integrated-review-board && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-input-template",
      "visual-match-batch1-approval-input-gate": "npm run stadium:daegu:visual-match-batch1-approval-input-template && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-input-gate",
      "visual-match-batch1-approval-input-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-approval-input-template && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-input-gate --require-approved",
      "visual-match-batch1-approval-input-gate-smoke": "npm run stadium:daegu:visual-match-batch1-approval-input-template && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-input-gate-smoke",
      "visual-match-batch1-approved-apply-smoke": "npm run stadium:daegu:visual-match-batch1-approval-input-gate-smoke && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approved-apply-smoke",
      "visual-match-batch1-operator-handoff": "npm run stadium:daegu:visual-match-batch1-approved-apply-smoke && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-operator-handoff",
      "visual-match-batch1-operator-visual-review-board": "npm run stadium:daegu:visual-match-batch1-operator-handoff && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-operator-visual-review-board",
      "visual-match-batch1-operator-visual-decision": "npm run stadium:daegu:visual-match-batch1-operator-visual-review-board && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-operator-visual-decision",
      "visual-match-batch1-approval-ready-visual-gate": "npm run stadium:daegu:visual-match-batch1-operator-visual-decision && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-ready-visual-gate",
      "visual-match-batch1-closeout-gate": "npm run stadium:daegu:visual-match-batch1-approval-ready-visual-gate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-closeout-gate",
      "visual-match-batch1-approval-only-gate": "npm run stadium:daegu:visual-match-batch1-closeout-gate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-only-gate",
      "visual-match-batch1-retrace-queue": "npm run stadium:daegu:visual-match-batch1-closeout-gate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-retrace-queue",
      "visual-match-batch1-next-operator-packet": "npm run stadium:daegu:visual-match-batch1-approval-only-gate && npm run stadium:daegu:visual-match-batch1-retrace-queue",
      "visual-match-batch1-13-16-retrace-candidate": "npm run stadium:daegu:visual-match-batch1-retrace-queue && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-16-retrace-candidate",
      "visual-match-batch1-13-16-approval-gate": "npm run stadium:daegu:visual-match-batch1-13-16-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-16-approval-gate",
      "visual-match-batch1-13-16-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-13-16-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-16-approval-gate --require-approved",
      "visual-match-batch1-13-16-approval-smoke": "npm run stadium:daegu:visual-match-batch1-13-16-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-16-approval-smoke",
      "visual-match-batch1-13-u24-ownership-reconciliation": "npm run stadium:daegu:visual-match-batch1-13-16-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-u24-ownership-reconciliation",
      "visual-match-batch1-13-u24-ownership-approval-gate": "npm run stadium:daegu:visual-match-batch1-13-u24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-u24-ownership-approval-gate",
      "visual-match-batch1-13-u24-ownership-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-13-u24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-u24-ownership-approval-gate --require-approved",
      "visual-match-batch1-13-u24-ownership-approval-smoke": "npm run stadium:daegu:visual-match-batch1-13-u24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-13-u24-ownership-approval-smoke",
      "visual-match-batch1-u25-u27-sequence-candidate": "npm run stadium:daegu:visual-match-batch1-retrace-queue && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u25-u27-sequence-candidate",
      "visual-match-batch1-s22-s23-pair-retrace-candidate": "npm run stadium:daegu:visual-match-batch1-retrace-queue && npm run stadium:daegu:visual-match-batch1-s22-s23-ownership-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s22-s23-pair-retrace-candidate",
      "visual-match-batch1-consolidated-operator-package": "npm run stadium:daegu:visual-match-batch1-13-16-retrace-candidate && npm run stadium:daegu:visual-match-batch1-u25-u27-sequence-candidate && npm run stadium:daegu:visual-match-batch1-s22-s23-pair-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-consolidated-operator-package",
      "visual-match-batch1-consolidated-approval-gate": "npm run stadium:daegu:visual-match-batch1-consolidated-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-consolidated-approval-gate",
      "visual-match-batch1-consolidated-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-consolidated-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-consolidated-approval-gate --require-approved",
      "visual-match-batch1-consolidated-approved-apply-dry-run": "npm run stadium:daegu:visual-match-batch1-consolidated-approval-gate:require-approved && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approved-apply --plan reports/stadium/daegu-visual-match-batch1/consolidated-approval-gate/daegu-seatmap-visual-match-batch1-consolidated-dry-run-apply-plan.json --report-dir reports/stadium/daegu-visual-match-batch1/consolidated-approval-gate/apply --require-ready --allow-partial",
      "visual-match-batch1-consolidated-approval-smoke": "npm run stadium:daegu:visual-match-batch1-consolidated-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-consolidated-approval-smoke",
      "visual-match-batch1-s21-s24-ownership-reconciliation": "npm run stadium:daegu:visual-match-batch1-s22-s23-pair-retrace-candidate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s21-s24-ownership-reconciliation",
      "visual-match-batch1-s21-s24-ownership-approval-gate": "npm run stadium:daegu:visual-match-batch1-s21-s24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s21-s24-ownership-approval-gate",
      "visual-match-batch1-s21-s24-ownership-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-s21-s24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s21-s24-ownership-approval-gate --require-approved",
      "visual-match-batch1-s21-s24-ownership-approval-smoke": "npm run stadium:daegu:visual-match-batch1-s21-s24-ownership-reconciliation && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s21-s24-ownership-approval-smoke",
      "visual-match-batch1-u28-u31-operator-package": "npm run stadium:daegu:visual-match-batch1-u28-u31-row-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u28-u31-operator-package",
      "visual-match-batch1-u28-u31-approval-gate": "npm run stadium:daegu:visual-match-batch1-u28-u31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u28-u31-approval-gate",
      "visual-match-batch1-u28-u31-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-u28-u31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u28-u31-approval-gate --require-approved",
      "visual-match-batch1-u28-u31-approval-smoke": "npm run stadium:daegu:visual-match-batch1-u28-u31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u28-u31-approval-smoke",
      "visual-match-batch1-s25-s31-row-analysis": "node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s25-s31-row-analysis",
      "visual-match-batch1-s25-s31-operator-package": "npm run stadium:daegu:visual-match-batch1-s25-s31-row-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s25-s31-operator-package",
      "visual-match-batch1-s25-s31-approval-gate": "npm run stadium:daegu:visual-match-batch1-s25-s31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s25-s31-approval-gate",
      "visual-match-batch1-s25-s31-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-s25-s31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s25-s31-approval-gate --require-approved",
      "visual-match-batch1-s25-s31-approval-smoke": "npm run stadium:daegu:visual-match-batch1-s25-s31-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-s25-s31-approval-smoke",
      "visual-match-batch1-u10-u14-row-analysis": "node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u10-u14-row-analysis",
      "visual-match-batch1-u10-u14-operator-package": "npm run stadium:daegu:visual-match-batch1-u10-u14-row-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u10-u14-operator-package",
      "visual-match-batch1-u10-u14-approval-gate": "npm run stadium:daegu:visual-match-batch1-u10-u14-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u10-u14-approval-gate",
      "visual-match-batch1-u10-u14-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-u10-u14-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u10-u14-approval-gate --require-approved",
      "visual-match-batch1-u10-u14-approval-smoke": "npm run stadium:daegu:visual-match-batch1-u10-u14-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-u10-u14-approval-smoke",
      "visual-match-batch1-v1-boundary-analysis": "node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-v1-boundary-analysis",
      "visual-match-batch1-v1-operator-package": "npm run stadium:daegu:visual-match-batch1-v1-boundary-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-v1-operator-package",
      "visual-match-batch1-v1-approval-gate": "npm run stadium:daegu:visual-match-batch1-v1-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-v1-approval-gate",
      "visual-match-batch1-v1-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-v1-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-v1-approval-gate --require-approved",
      "visual-match-batch1-v1-approval-smoke": "npm run stadium:daegu:visual-match-batch1-v1-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-v1-approval-smoke",
      "visual-match-batch1-1-2-t1-4-shared-analysis": "node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-1-2-t1-4-shared-analysis",
      "visual-match-batch1-1-2-t1-4-operator-package": "npm run stadium:daegu:visual-match-batch1-1-2-t1-4-shared-analysis && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-1-2-t1-4-operator-package",
      "visual-match-batch1-1-2-t1-4-approval-gate": "npm run stadium:daegu:visual-match-batch1-1-2-t1-4-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-1-2-t1-4-approval-gate",
      "visual-match-batch1-1-2-t1-4-approval-gate:require-approved": "npm run stadium:daegu:visual-match-batch1-1-2-t1-4-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-1-2-t1-4-approval-gate --require-approved",
      "visual-match-batch1-1-2-t1-4-approval-smoke": "npm run stadium:daegu:visual-match-batch1-1-2-t1-4-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-1-2-t1-4-approval-smoke",
      "visual-match-batch1-locked-conflict-image-evidence-audit": "npm run stadium:daegu:visual-match-batch1-locked-conflict-workset && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-image-evidence-audit",
      "visual-match-batch1-locked-conflict-operator-package": "npm run stadium:daegu:visual-match-batch1-locked-conflict-image-evidence-audit && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-operator-package",
      "visual-match-batch1-locked-conflict-operator-validate": "npm run stadium:daegu:visual-match-batch1-locked-conflict-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-operator-validate",
      "visual-match-batch1-locked-conflict-decision-board": "npm run stadium:daegu:visual-match-batch1-locked-conflict-operator-validate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-decision-board",
      "visual-match-batch1-locked-conflict-entry-guide": "npm run stadium:daegu:visual-match-batch1-locked-conflict-decision-board && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-locked-conflict-entry-guide",
      "visual-match-batch1-dry-run-review": "npm run stadium:daegu:visual-match-batch1-operator-validate && npm run stadium:daegu:visual-match-batch1-locked-conflict-operator-validate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-dry-run-review --require-approved",
      "visual-match-batch1-dry-run-review:allow-empty": "npm run stadium:daegu:visual-match-batch1-operator-validate && npm run stadium:daegu:visual-match-batch1-locked-conflict-operator-validate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-dry-run-review --allow-empty",
      "visual-match-batch1-review-board": "npm run stadium:daegu:visual-match-batch1-image-draft && npm run stadium:daegu:visual-match-batch1-draft-quality:allow-blocked && npm run stadium:daegu:visual-match-batch1-conflict-audit:allow-conflicts && npm run stadium:daegu:visual-match-batch1-locked-conflict-operator-validate && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-review-board",
      "visual-match-batch1-approval-smoke": "npm run stadium:daegu:visual-match-batch1-coordinate-guide && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-approval-smoke",
      "visual-match-batch1-readiness": "npm run stadium:daegu:visual-match-batch1-review-board && npm run stadium:daegu:visual-match-batch1-image-evidence-audit && npm run stadium:daegu:visual-match-batch1-locked-conflict-image-evidence-audit && npm run stadium:daegu:visual-match-batch1-locked-conflict-entry-guide && npm run stadium:daegu:visual-match-batch1-approval-smoke && npm run stadium:daegu:visual-match-batch1-dry-run-review:allow-empty && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-readiness",
      "visual-match-batch1-readiness:require-ready": "npm run stadium:daegu:visual-match-batch1-review-board && npm run stadium:daegu:visual-match-batch1-image-evidence-audit && npm run stadium:daegu:visual-match-batch1-locked-conflict-image-evidence-audit && npm run stadium:daegu:visual-match-batch1-locked-conflict-entry-guide && npm run stadium:daegu:visual-match-batch1-approval-smoke && npm run stadium:daegu:visual-match-batch1-dry-run-review:allow-empty && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-match-batch1-readiness --require-ready",
      "visual-issue-queue": "npm run stadium:daegu:p0-operator-package:allow-closed && npm run stadium:daegu:p1-operator-package && npm run stadium:daegu:p2-operator-package && npm run stadium:daegu:p3-p4-operator-package && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-issue-queue",
      "visual-off-seat-workset": "npm run stadium:daegu:visual-issue-queue && node --import tsx scripts/daegu-seatmap-visual-match.mjs visual-off-seat-workset",
    },
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'DAEGU'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'DAEGU:FULL'],
        },
      ],
      'pixel-components': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'],
        },
      ],
      'trace-manifest': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest'],
        },
      ],
      'alignment-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'alignment-audit'],
        },
      ],
      'operator-handoff': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'operator-handoff'],
        },
      ],
      'handoff-evidence': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'trace-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'operator-handoff'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-core-qa.mjs', 'handoff-evidence'],
        },
      ],
      'operator-state-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-state-audit'],
        },
      ],
      'operator-corrections-template': [
        { task: 'operator-handoff' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-template'],
        },
      ],
      'operator-corrections-validate': [
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-validate',
            '--input',
            'reports/stadium/daegu-seatmap-operator-corrections-template.json',
          ],
        },
      ],
      'operator-corrections-preview': [
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-preview',
            '--input',
            'reports/stadium/daegu-seatmap-operator-corrections-template.json',
          ],
        },
      ],
      'operator-corrections-apply': [
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-apply',
            '--input',
            'reports/stadium/daegu-seatmap-operator-corrections-template.json',
          ],
        },
      ],
      'operator-corrections-write-smoke': [
        { task: 'operator-handoff' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-write-smoke'],
        },
      ],
      'operator-corrections-batches': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-batches'],
        },
      ],
      'operator-corrections-status': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-status'],
        },
      ],
      'operator-corrections-write-guard': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-write-guard'],
        },
      ],
      'operator-corrections': [
        { task: 'operator-corrections-template' },
        { task: 'operator-corrections-validate' },
        { task: 'operator-corrections-preview' },
        { task: 'operator-corrections-batches' },
      ],
      'operator-corrections-write': [
        { task: 'operator-corrections-validate' },
        { task: 'operator-corrections-preview' },
        { task: 'operator-corrections-apply' },
        { task: 'operator-corrections-write-smoke' },
        { task: 'operator-corrections-batches' },
        { task: 'operator-corrections-status' },
        { task: 'operator-corrections-write-guard' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-operator-corrections.mjs', 'operator-corrections-apply',
            '--input',
            'reports/stadium/daegu-seatmap-operator-corrections-template.json',
            '--write',
          ],
        },
      ],
      'operator-corrections-postwrite-gate': [
        { task: 'alignment-audit' },
        {
          command: 'npm',
          args: ['run', 'stadium:daegu:precision-audit'],
        },
        {
          command: 'npm',
          args: ['run', 'stadium:daegu:render-safety-audit'],
        },
        {
          command: 'npm',
          args: ['run', 'stadium:daegu:p1-boundary-first-postwrite-gate'],
        },
        {
          command: 'npm',
          args: ['run', 'test:stadium:seatmaps'],
        },
        {
          command: 'npm',
          args: ['run', 'qa:stadium:daegu:full'],
        },
        {
          command: 'npm',
          args: ['run', 'build'],
        },
      ],
      'trace-review': [
        { task: 'alignment-audit' },
        { task: 'operator-corrections' },
        { task: 'operator-corrections-apply' },
        { task: 'operator-corrections-write-smoke' },
        { task: 'operator-corrections-batches' },
        { task: 'operator-corrections-status' },
        { task: 'handoff-evidence' },
        { task: 'full' },
      ],
      'missing-block-discovery': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-discovery'],
        },
      ],
      'missing-block-placement-package': [
        { task: 'missing-block-discovery' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-placement-package'],
        },
      ],
      'missing-block-placement-gate': [
        { task: 'missing-block-placement-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-placement-gate'],
        },
      ],
      'missing-block-placement-gate:require-approved': [
        { task: 'missing-block-placement-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-placement-gate', '--require-approved'],
        },
      ],
      'missing-block-p0-review-board': [
        { task: 'missing-block-placement-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-review-board'],
        },
      ],
      'missing-block-p0-approval-gate': [
        { task: 'missing-block-p0-review-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-approval-gate'],
        },
      ],
      'missing-block-p0-approval-gate:require-approved': [
        { task: 'missing-block-p0-review-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-approval-gate', '--require-approved'],
        },
      ],
      'missing-block-p0-standalone-package': [
        { task: 'missing-block-p0-review-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-standalone-package'],
        },
      ],
      'missing-block-p0-standalone-gate': [
        { task: 'missing-block-p0-standalone-package' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-approval-gate',
            '--operator-input',
            'reports/stadium/daegu-missing-block-p0-standalone/operator-input/daegu-missing-block-p0-standalone-operator-input.json',
            '--output-dir',
            'reports/stadium/daegu-missing-block-p0-standalone/gate',
          ],
        },
      ],
      'missing-block-p0-standalone-gate:require-approved': [
        { task: 'missing-block-p0-standalone-package' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-approval-gate',
            '--operator-input',
            'reports/stadium/daegu-missing-block-p0-standalone/operator-input/daegu-missing-block-p0-standalone-operator-input.json',
            '--output-dir',
            'reports/stadium/daegu-missing-block-p0-standalone/gate',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p0-reality-audit': [
        { task: 'missing-block-p0-standalone-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-reality-audit'],
        },
      ],
      'missing-block-p0-target-resolution': [
        { task: 'missing-block-p0-reality-audit' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-target-resolution-board'],
        },
      ],
      'missing-block-p0-tiny-component-decision-package': [
        { task: 'missing-block-p0-target-resolution' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-package'],
        },
      ],
      'missing-block-p0-tiny-component-decision-package:require-ready': [
        { task: 'missing-block-p0-target-resolution' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-package',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p0-tiny-component-decision-gate': [
        { task: 'missing-block-p0-tiny-component-decision-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-gate'],
        },
      ],
      'missing-block-p0-tiny-component-decision-gate:require-decided': [
        { task: 'missing-block-p0-tiny-component-decision-package' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-gate',
            '--require-decided',
          ],
        },
      ],
      'missing-block-p0-tiny-component-decision-gate-smoke': [
        { task: 'missing-block-p0-tiny-component-decision-package:require-ready' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-gate-smoke'],
        },
      ],
      'missing-block-p0-tiny-component-decision-gate-smoke:require-pass': [
        { task: 'missing-block-p0-tiny-component-decision-package:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-tiny-component-decision-gate-smoke',
            '--require-pass',
          ],
        },
      ],
      'missing-block-p0-retrace-package': [
        { task: 'missing-block-p0-target-resolution' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-package'],
        },
      ],
      'missing-block-p0-retrace-image-draft': [
        { task: 'missing-block-p0-retrace-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-image-draft'],
        },
      ],
      'missing-block-p0-retrace-draft-quality': [
        { task: 'missing-block-p0-retrace-image-draft' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-draft-quality-gate'],
        },
      ],
      'missing-block-p0-retrace-draft-quality:require-quality': [
        { task: 'missing-block-p0-retrace-image-draft' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-draft-quality-gate',
            '--require-quality',
          ],
        },
      ],
      'missing-block-p0-retrace-operator-handoff': [
        { task: 'missing-block-p0-retrace-draft-quality:require-quality' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-operator-handoff'],
        },
      ],
      'missing-block-p0-retrace-operator-handoff:require-ready': [
        { task: 'missing-block-p0-retrace-draft-quality:require-quality' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-operator-handoff',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p0-retrace-approval-entry-guide': [
        { task: 'missing-block-p0-retrace-operator-handoff:require-ready' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-entry-guide'],
        },
      ],
      'missing-block-p0-retrace-approval-entry-guide:require-approved': [
        { task: 'missing-block-p0-retrace-operator-handoff:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-entry-guide',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p0-retrace-approval-smoke': [
        { task: 'missing-block-p0-retrace-approval-entry-guide' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-smoke'],
        },
      ],
      'missing-block-p0-retrace-approval-smoke:require-pass': [
        { task: 'missing-block-p0-retrace-approval-entry-guide' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-smoke',
            '--require-pass',
          ],
        },
      ],
      'missing-block-p0-retrace-gate': [
        { task: 'missing-block-p0-retrace-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-gate'],
        },
      ],
      'missing-block-p0-retrace-gate:require-approved': [
        { task: 'missing-block-p0-retrace-package' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-retrace-approval-gate',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p0-readiness-gate': [
        { task: 'missing-block-p0-retrace-gate' },
        { task: 'missing-block-p0-tiny-component-decision-gate' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-readiness-gate'],
        },
      ],
      'missing-block-p0-readiness-gate:require-ready': [
        { task: 'missing-block-p0-retrace-gate' },
        { task: 'missing-block-p0-tiny-component-decision-gate' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-readiness-gate',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p0-operator-review-packet': [
        { task: 'missing-block-p0-retrace-operator-handoff' },
        { task: 'missing-block-p0-readiness-gate' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-review-packet'],
        },
      ],
      'missing-block-p0-operator-review-packet:require-ready': [
        { task: 'missing-block-p0-retrace-operator-handoff' },
        { task: 'missing-block-p0-readiness-gate' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-review-packet',
            '--require-review-ready',
          ],
        },
      ],
      'missing-block-p0-operator-review-packet-smoke': [
        { task: 'missing-block-p0-operator-review-packet:require-ready' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-review-packet-smoke'],
        },
      ],
      'missing-block-p0-operator-review-packet-smoke:require-pass': [
        { task: 'missing-block-p0-operator-review-packet:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-review-packet-smoke',
            '--require-pass',
          ],
        },
      ],
      'missing-block-p0-coordinate-analysis': [
        { task: 'missing-block-p0-retrace-image-draft' },
        { task: 'missing-block-p0-tiny-component-decision-package' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-coordinate-analysis'],
        },
      ],
      'missing-block-p0-operator-input-guide': [
        { task: 'missing-block-p0-coordinate-analysis' },
        { task: 'missing-block-p0-operator-review-packet:require-ready' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-input-guide'],
        },
      ],
      'missing-block-p0-operator-input-guide:require-ready': [
        { task: 'missing-block-p0-coordinate-analysis' },
        { task: 'missing-block-p0-operator-review-packet:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-operator-input-guide',
            '--require-guide-ready',
          ],
        },
      ],
      'missing-block-p0-dry-run-apply-review': [
        { task: 'missing-block-p0-operator-input-guide:require-ready' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-dry-run-apply-review'],
        },
      ],
      'missing-block-p0-dry-run-apply-review:require-ready': [
        { task: 'missing-block-p0-operator-input-guide:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p0-dry-run-apply-review',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p1-coordinate-candidates': [
        { task: 'missing-block-discovery' },
        { task: 'missing-block-p0-coordinate-analysis' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-coordinate-candidates'],
        },
      ],
      'missing-block-p1-approval-packet': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-approval-packet'],
        },
      ],
      'missing-block-p1-approval-gate': [
        { task: 'missing-block-p1-approval-packet' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-approval-gate'],
        },
      ],
      'missing-block-p1-approval-gate:require-approved': [
        { task: 'missing-block-p1-approval-packet' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-approval-gate', '--require-approved'],
        },
      ],
      'missing-block-p1-review-board': [
        { task: 'missing-block-p1-approval-gate' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-review-board'],
        },
      ],
      'missing-block-p1-operator-input-guide': [
        { task: 'missing-block-p1-review-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-operator-input-guide'],
        },
      ],
      'missing-block-p1-operator-input-guide:require-ready': [
        { task: 'missing-block-p1-review-board' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-operator-input-guide',
            '--require-guide-ready',
          ],
        },
      ],
      'missing-block-p1-retrace-review-pack': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-retrace-review-pack'],
        },
      ],
      'missing-block-p1-retrace-review-pack:require-ready': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-retrace-review-pack',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p1-retrace-review-pack:require-approved': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-retrace-review-pack',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p1-unmatched-decision-pack': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-unmatched-decision-pack'],
        },
      ],
      'missing-block-p1-unmatched-decision-pack:require-ready': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-unmatched-decision-pack',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p1-unmatched-decision-pack:require-approved': [
        { task: 'missing-block-p1-coordinate-candidates' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-unmatched-decision-pack',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p1-status-board': [
        { task: 'missing-block-p1-operator-input-guide' },
        { task: 'missing-block-p1-retrace-review-pack' },
        { task: 'missing-block-p1-unmatched-decision-pack' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-status-board'],
        },
      ],
      'missing-block-p1-status-board:require-ready': [
        { task: 'missing-block-p1-operator-input-guide' },
        { task: 'missing-block-p1-retrace-review-pack' },
        { task: 'missing-block-p1-unmatched-decision-pack' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-status-board',
            '--require-ready',
          ],
        },
      ],
      'missing-block-p1-status-board:require-approved': [
        { task: 'missing-block-p1-operator-input-guide' },
        { task: 'missing-block-p1-retrace-review-pack' },
        { task: 'missing-block-p1-unmatched-decision-pack' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-status-board',
            '--require-approved',
          ],
        },
      ],
      'missing-block-p1-coordinate-review-board': [
        { task: 'missing-block-p1-status-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-coordinate-review-board'],
        },
      ],
      'missing-block-p1-coordinate-review-board:require-ready': [
        { task: 'missing-block-p1-status-board' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-coordinate-review-board',
            '--require-ready',
            '--require-operator-review-ready',
          ],
        },
      ],
      'missing-block-p1-coordinate-input-preflight': [
        { task: 'missing-block-p1-coordinate-review-board' },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-coordinate-input-preflight'],
        },
      ],
      'missing-block-p1-coordinate-input-preflight:require-ready': [
        { task: 'missing-block-p1-coordinate-review-board:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-coordinate-input-preflight',
            '--require-ready',
            '--require-operator-entry-ready',
          ],
        },
      ],
      'missing-block-p1-operator-lifecycle-smoke': [
        { task: 'missing-block-p1-coordinate-input-preflight:require-ready' },
        {
          command: 'node',
          args: [
            '--import',
            'tsx',
            'scripts/daegu-seatmap-missing-block.mjs', 'missing-block-p1-operator-lifecycle-smoke',
            '--require-pass',
          ],
        },
      ],
      'missing-block-p1-duplicate-handoff': [
        npmRunStep('stadium:daegu:missing-block-p1-coordinate-review-board'),
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-handoff']),
      ],
      'missing-block-p1-duplicate-handoff:require-ready': [
        npmRunStep('stadium:daegu:missing-block-p1-coordinate-review-board:require-ready'),
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-handoff', '--require-ready']),
      ],
      'missing-block-p1-duplicate-handoff:require-approved': [
        npmRunStep('stadium:daegu:missing-block-p1-coordinate-review-board:require-ready'),
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-handoff', '--require-approved']),
      ],
      'missing-block-p1-duplicate-handoff-smoke': [
        { task: 'missing-block-p1-duplicate-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-handoff-smoke', '--require-pass']),
      ],
      'missing-block-p1-duplicate-precision-candidates': [
        { task: 'missing-block-p1-duplicate-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-candidates']),
      ],
      'missing-block-p1-duplicate-precision-candidates:require-ready': [
        { task: 'missing-block-p1-duplicate-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-candidates', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-operator-input-guide': [
        { task: 'missing-block-p1-duplicate-precision-candidates:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-input-guide']),
      ],
      'missing-block-p1-duplicate-precision-operator-input-guide:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-candidates:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-input-guide', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-approval-gate': [
        { task: 'missing-block-p1-duplicate-precision-operator-input-guide:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-approval-gate']),
      ],
      'missing-block-p1-duplicate-precision-approval-gate:require-approved': [
        { task: 'missing-block-p1-duplicate-precision-operator-input-guide:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-approval-gate', '--require-approved']),
      ],
      'missing-block-p1-duplicate-precision-review-packet': [
        { task: 'missing-block-p1-duplicate-precision-approval-gate' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-review-packet']),
      ],
      'missing-block-p1-duplicate-precision-review-packet:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-approval-gate' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-review-packet', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-draft-coordinates': [
        { task: 'missing-block-p1-duplicate-precision-review-packet:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-draft-coordinates']),
      ],
      'missing-block-p1-duplicate-precision-draft-coordinates:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-review-packet:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-draft-coordinates', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-draft-preflight': [
        { task: 'missing-block-p1-duplicate-precision-draft-coordinates:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-draft-preflight']),
      ],
      'missing-block-p1-duplicate-precision-draft-preflight:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-draft-coordinates:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-draft-preflight', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-patch-intake-gate': [
        { task: 'missing-block-p1-duplicate-precision-draft-preflight:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-patch-intake-gate']),
      ],
      'missing-block-p1-duplicate-precision-patch-intake-gate:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-draft-preflight:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-patch-intake-gate', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-operator-review-brief': [
        { task: 'missing-block-p1-duplicate-precision-patch-intake-gate:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-review-brief']),
      ],
      'missing-block-p1-duplicate-precision-operator-review-brief:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-patch-intake-gate:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-review-brief', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-operator-patch-workset': [
        { task: 'missing-block-p1-duplicate-precision-operator-review-brief:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-patch-workset']),
      ],
      'missing-block-p1-duplicate-precision-operator-patch-workset:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-operator-review-brief:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-patch-workset', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-operator-approval-board': [
        { task: 'missing-block-p1-duplicate-precision-operator-patch-workset:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-approval-board']),
      ],
      'missing-block-p1-duplicate-precision-operator-approval-board:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-operator-patch-workset:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-operator-approval-board', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-p0-duplicate-target-gate': [
        { task: 'missing-block-p1-duplicate-precision-operator-approval-board:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-duplicate-target-gate']),
      ],
      'missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-operator-approval-board:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-duplicate-target-gate', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-approved': [
        { task: 'missing-block-p1-duplicate-precision-operator-approval-board:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-duplicate-target-gate', '--require-approved']),
      ],
      'missing-block-p1-duplicate-precision-p0-image-candidate-pack': [
        { task: 'missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-image-candidate-pack']),
      ],
      'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-p0-duplicate-target-gate:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-image-candidate-pack', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke': [
        { task: 'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke']),
      ],
      'missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke:require-pass': [
        { task: 'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-duplicate-target-gate-smoke', '--require-pass']),
      ],
      'missing-block-p1-duplicate-precision-p0-apply-preflight': [
        { task: 'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-apply-preflight']),
      ],
      'missing-block-p1-duplicate-precision-p0-apply-preflight:require-ready': [
        { task: 'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-apply-preflight', '--require-ready']),
      ],
      'missing-block-p1-duplicate-precision-p0-apply-preflight:require-approved': [
        { task: 'missing-block-p1-duplicate-precision-p0-image-candidate-pack:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-apply-preflight', '--require-approved']),
      ],
      'missing-block-p1-duplicate-precision-p0-apply-preflight-smoke': [
        { task: 'missing-block-p1-duplicate-precision-p0-apply-preflight:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-apply-preflight-smoke']),
      ],
      'missing-block-p1-duplicate-precision-p0-apply-preflight-smoke:require-pass': [
        { task: 'missing-block-p1-duplicate-precision-p0-apply-preflight:require-ready' },
        nodeTsxStep('scripts/daegu-seatmap-missing-block.mjs', ['missing-block-p1-duplicate-precision-p0-apply-preflight-smoke', '--require-pass']),
      ],
      'p0-operator-package': [
        { task: 'handoff-evidence' },
        { task: 'operator-corrections' },
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-package']),
      ],
      'p0-operator-package:allow-closed': [
        { task: 'handoff-evidence' },
        { task: 'operator-corrections' },
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-package', '--allow-closed-batch']),
      ],
      'p0-operator-audit': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-audit']),
      ],
      'p0-decision-packet': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-decision-packet']),
      ],
      'p0-retrace-intake': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-retrace-intake']),
      ],
      'p0-operator-validate': [
        nodeTsxStep('scripts/daegu-seatmap-operator-corrections.mjs', ['operator-corrections-validate', 
          '--input',
          'reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json',
          '--report-dir',
          'reports/stadium/daegu-p0-operator',
          '--handoff',
          'reports/stadium/daegu-seatmap-operator-handoff.json',
        ]),
      ],
      'p0-operator-import': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-import']),
      ],
      'p0-operator-readiness': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-readiness']),
      ],
      'p0-operator-prewrite-gate': [
        { task: 'p0-operator-validate' },
        { task: 'p0-operator-import' },
        { task: 'p0-operator-readiness' },
      ],
      'p0-operator-import:write-template': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-operator-import', '--write-template']),
      ],
      'p0-p1-off-seat-workset': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-p1-off-seat-workset']),
      ],
      'p0-off-seat-operator-input': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-off-seat-operator-input']),
      ],
      'p0-off-seat-operator-import': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-off-seat-operator-import']),
      ],
      'p0-off-seat-operator-import:write-source-input': [
        nodeTsxStep('scripts/daegu-seatmap-p0-operators.mjs', ['p0-off-seat-operator-import', '--write-source-input']),
      ],
      'p1-operator-package': [
        { task: 'handoff-evidence' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-operator-package']),
      ],
      'p1-operator-audit': [
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-operator-audit']),
      ],
      'p1-decision-packet': [
        nodeTsxStep('scripts/daegu-seatmap-p1-decision-packet.mjs'),
      ],
      'p1-operator-validate': [
        nodeTsxStep('scripts/daegu-seatmap-operator-corrections.mjs', ['operator-corrections-validate', 
          '--input',
          'reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json',
          '--report-dir',
          'reports/stadium/daegu-p1-operator',
          '--handoff',
          'reports/stadium/daegu-seatmap-operator-handoff.json',
        ]),
      ],
      'p1-operator-import': [
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-operator-import']),
      ],
      'p1-operator-readiness': [
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-operator-readiness']),
      ],
      'p1-operator-import:write-template': [
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-operator-import', '--write-template']),
      ],
      'p1-boundary-input-aid': [
        nodeTsxStep('scripts/daegu-seatmap-p1-boundary-input-aid.mjs'),
      ],
      'p1-next-action-packet': [
        { task: 'p1-boundary-input-aid' },
        { task: 'p1-decision-packet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-next-action-packet.mjs'),
      ],
      'p1-precision-workset': [
        npmRunStep('stadium:daegu:precision-audit'),
        { task: 'p1-next-action-packet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-precision-workset.mjs'),
      ],
      'p1-next-operator-packet': [
        nodeTsxStep('scripts/daegu-seatmap-p1-next-operator-packet.mjs'),
      ],
      'p1-boundary-first-readiness': [
        { task: 'p1-next-action-packet' },
        { task: 'p1-operator-validate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-readiness']),
      ],
      'p1-operator-prewrite-gate': [
        { task: 'p1-boundary-first-readiness' },
        { task: 'p1-operator-validate' },
        { task: 'p1-operator-import' },
        { task: 'p1-operator-readiness' },
      ],
      'p1-boundary-first-packet': [
        { task: 'p1-boundary-first-readiness' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-packet']),
      ],
      'p1-boundary-first-image-coordinate-draft': [
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-image-coordinate-draft']),
      ],
      'p1-boundary-first-draft-approval-dry-run': [
        { task: 'p1-boundary-first-image-coordinate-draft' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-draft-approval-dry-run']),
      ],
      'p1-boundary-first-entry-sheet': [
        { task: 'p1-boundary-first-packet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-entry-sheet']),
      ],
      'p1-boundary-first-entry-preflight': [
        { task: 'p1-boundary-first-entry-sheet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-entry-preflight']),
      ],
      'p1-boundary-first-entry-preflight:require-ready': [
        { task: 'p1-boundary-first-entry-sheet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-entry-preflight', '--require-ready']),
      ],
      'p1-boundary-first-template-gate': [
        { task: 'p1-boundary-first-entry-sheet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-template-gate']),
      ],
      'p1-boundary-first-operator-handoff': [
        { task: 'p1-boundary-first-entry-preflight' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-operator-handoff']),
      ],
      'p1-boundary-first-tracing-pack': [
        { task: 'p1-boundary-first-operator-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-tracing-pack']),
      ],
      'p1-boundary-first-review-board': [
        { task: 'p1-boundary-first-operator-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-review-board']),
      ],
      'p1-boundary-first-source-copy': [
        { task: 'p1-boundary-first-review-board' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-source-copy']),
      ],
      'p1-boundary-first-source-copy:write-source-input': [
        { task: 'p1-boundary-first-entry-preflight:require-ready' },
        { task: 'p1-boundary-first-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-source-copy', '--write-source-input']),
      ],
      'p1-boundary-first-regression': [
        { task: 'p1-boundary-first-source-copy' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-regression']),
      ],
      'p1-boundary-first-postwrite-gate': [
        { task: 'p1-boundary-first-regression' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-postwrite-gate']),
      ],
      'p1-boundary-first-postwrite-gate:require-written': [
        { task: 'p1-boundary-first-regression' },
        nodeTsxStep('scripts/daegu-seatmap-p1-operator-boundary.mjs', ['p1-boundary-first-postwrite-gate', '--require-written']),
      ],
      'p1-paired-ownership-neighbor-image-draft': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-neighbor-image-draft']),
      ],
      'p1-paired-ownership-neighbor-approval-dry-run': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-neighbor-approval-dry-run']),
      ],
      'p1-paired-ownership-correction-package': [
        { task: 'p1-boundary-input-aid' },
        { task: 'p1-boundary-first-draft-approval-dry-run' },
        { task: 'p1-paired-ownership-neighbor-image-draft' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-correction-package']),
      ],
      'p1-paired-ownership-source-scope': [
        { task: 'p1-paired-ownership-correction-package' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-source-scope']),
      ],
      'p1-paired-ownership-approval-packet': [
        { task: 'p1-paired-ownership-neighbor-approval-dry-run' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-approval-packet']),
      ],
      'p1-paired-ownership-template-gate': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-template-gate']),
      ],
      'p1-paired-ownership-source-copy-dry-run': [
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-source-copy-dry-run']),
      ],
      'p1-paired-ownership-gate-regression': [
        { task: 'p1-paired-ownership-source-scope' },
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-gate-regression']),
      ],
      'p1-paired-ownership-apply-plan': [
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-apply-plan']),
      ],
      'p1-paired-ownership-entry-sheet': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-entry-sheet']),
      ],
      'p1-paired-ownership-tracing-pack': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-tracing-pack']),
      ],
      'p1-paired-ownership-entry-preflight': [
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-entry-preflight']),
      ],
      'p1-paired-ownership-coordinate-input-pack': [
        { task: 'p1-paired-ownership-source-scope' },
        { task: 'p1-paired-ownership-entry-sheet' },
        { task: 'p1-paired-ownership-tracing-pack' },
        { task: 'p1-paired-ownership-entry-preflight' },
      ],
      'p1-paired-ownership-t1-input-pack': [
        { task: 'p1-paired-ownership-coordinate-input-pack' },
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t1-input-pack']),
      ],
      'p1-paired-ownership-t1-coordinate-draft': [
        { task: 'p1-paired-ownership-t1-input-pack' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t1-coordinate-draft']),
      ],
      'p1-paired-ownership-t1-approval-readiness': [
        { task: 'p1-paired-ownership-t1-coordinate-draft' },
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t1-approval-readiness']),
      ],
      'p1-paired-ownership-t3-v-approval-readiness': [
        { task: 'p1-paired-ownership-coordinate-input-pack' },
        { task: 'p1-boundary-first-image-coordinate-draft' },
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-readiness']),
      ],
      'p1-paired-ownership-t3-v-entry-brief': [
        { task: 'p1-paired-ownership-coordinate-input-pack' },
        { task: 'p1-boundary-first-image-coordinate-draft' },
        { task: 'p1-paired-ownership-template-gate' },
        { task: 'p1-paired-ownership-t3-v-approval-readiness' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-operator-entry-brief']),
      ],
      'p1-paired-ownership-t3-v-evidence-quality-audit': [
        { task: 'p1-paired-ownership-t3-v-entry-brief' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-evidence-quality-audit']),
      ],
      'p1-paired-ownership-t3-v-pre-approval-gate': [
        { task: 'p1-paired-ownership-t3-v-evidence-quality-audit' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-pre-approval-gate']),
      ],
      'p1-paired-ownership-t3-v-target-review-packet': [
        { task: 'p1-paired-ownership-t3-v-pre-approval-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-target-review-packet']),
      ],
      'p1-paired-ownership-t3-v-target-entry-gate': [
        { task: 'p1-paired-ownership-t3-v-target-review-packet' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-target-entry-gate']),
      ],
      'p1-paired-ownership-t3-v-target-entry-gate-regression': [
        { task: 'p1-paired-ownership-t3-v-target-entry-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-target-entry-gate-regression']),
      ],
      'p1-paired-ownership-t3-v-operator-handoff': [
        { task: 'p1-paired-ownership-t3-v-target-entry-gate-regression' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-operator-handoff']),
      ],
      'p1-paired-ownership-t3-v-coordinate-entry-pack': [
        { task: 'p1-paired-ownership-t3-v-operator-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-coordinate-entry-pack']),
      ],
      'p1-paired-ownership-t3-v-candidate-corrections': [
        { task: 'p1-paired-ownership-t3-v-coordinate-entry-pack' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-candidate-corrections']),
      ],
      'p1-paired-ownership-t3-v-candidate-corrections-regression': [
        { task: 'p1-paired-ownership-t3-v-candidate-corrections' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-candidate-corrections-regression']),
      ],
      'p1-paired-ownership-t3-v-candidate-approval-readiness': [
        { task: 'p1-paired-ownership-t3-v-candidate-corrections' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-candidate-approval-readiness']),
      ],
      'p1-paired-ownership-t3-v-candidate-approval-readiness-regression': [
        { task: 'p1-paired-ownership-t3-v-candidate-approval-readiness' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-candidate-approval-readiness-regression']),
      ],
      'p1-paired-ownership-t3-v-warning-review-board': [
        { task: 'p1-paired-ownership-t3-v-candidate-approval-readiness' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-warning-review-board']),
      ],
      'p1-paired-ownership-t3-v-warning-review-board-regression': [
        { task: 'p1-paired-ownership-t3-v-warning-review-board' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-warning-review-board-regression']),
      ],
      'p1-paired-ownership-t3-v-approval-input-gate': [
        { task: 'p1-paired-ownership-t3-v-warning-review-board' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate']),
      ],
      'p1-paired-ownership-t3-v-approval-input-gate-regression': [
        { task: 'p1-paired-ownership-t3-v-approval-input-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-gate-regression']),
      ],
      'p1-paired-ownership-t3-v-approval-handoff': [
        { task: 'p1-paired-ownership-t3-v-approval-input-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-handoff']),
      ],
      'p1-paired-ownership-t3-v-approval-input-guide': [
        { task: 'p1-paired-ownership-t3-v-approval-handoff' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-guide']),
      ],
      'p1-paired-ownership-t3-v-approval-input-guide-regression': [
        { task: 'p1-paired-ownership-t3-v-approval-input-guide' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approval-input-guide-regression']),
      ],
      'p1-paired-ownership-t3-v-approved-dry-run': [
        { task: 'p1-paired-ownership-t3-v-approval-input-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approved-dry-run']),
      ],
      'p1-paired-ownership-t3-v-approved-dry-run-regression': [
        { task: 'p1-paired-ownership-t3-v-approved-dry-run' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-approved-dry-run-regression']),
      ],
      'p1-paired-ownership-t3-v-apply-plan': [
        { task: 'p1-paired-ownership-t3-v-target-entry-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-apply-plan']),
      ],
      'p1-paired-ownership-t3-v-apply-plan-regression': [
        { task: 'p1-paired-ownership-t3-v-target-entry-gate-regression' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-apply-plan-regression']),
      ],
      'p1-paired-ownership-t3-v-source-copy-dry-run': [
        { task: 'p1-paired-ownership-t3-v-pre-approval-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-source-copy-dry-run']),
      ],
      'p1-paired-ownership-t3-v-source-copy-regression': [
        { task: 'p1-paired-ownership-t3-v-source-copy-dry-run' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-source-copy-regression']),
      ],
      'p1-paired-ownership-t3-v-readiness-regression': [
        { task: 'p1-paired-ownership-coordinate-input-pack' },
        { task: 'p1-boundary-first-image-coordinate-draft' },
        { task: 'p1-paired-ownership-template-gate' },
        nodeTsxStep('scripts/daegu-seatmap-p1-paired-ownership.mjs', ['p1-paired-ownership-t3-v-readiness-regression']),
      ],
      'p1-paired-ownership-t3-v-pre-approval-gate-regression': [
        { task: 'p1-paired-ownership-t3-v-readiness-regression' },
        { task: 'p1-paired-ownership-t3-v-pre-approval-gate' },
      ],
    },
  },
  suwon: {
    label: 'Suwon KT Wiz Park',
    order: 6,
    qaToken: 'SUWON',
    legacyArtifacts: [
      'scripts/suwon-seatmap-ops.mjs',
    ],
    migrationBuckets: [
      {
        id: 'review-release',
        status: 'integrated',
        patterns: [
          'suwon-seatmap-ops.mjs',
        ],
        nextAction: 'Suwon visual review, precision workset, and release gate bodies are consolidated in suwon-seatmap-ops.mjs; obsolete compatibility wrappers have been removed.',
      },
    ],
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SUWON'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SUWON:FULL'],
        },
      ],
      'visual-review': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/suwon-seatmap-ops.mjs', 'visual-review'],
        },
      ],
      'precision-workset': [
        {
          task: 'visual-review',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/suwon-seatmap-ops.mjs', 'precision-workset'],
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/suwon-seatmap-ops.mjs', 'release-gate'],
        },
      ],
    },
  },
  sajik: {
    label: 'Busan Sajik Baseball Stadium',
    order: 7,
    qaToken: 'SAJIK',
    legacyArtifacts: [
      'scripts/sajik-seatmap-core-qa.mjs',
      'scripts/sajik-seatmap-operator-reference.mjs',
      'scripts/sajik-seatmap-stage01.mjs',
      'scripts/sajik-seatmap-editor-scope.mjs',
    ],
    migrationBuckets: [
      {
        id: 'core-qa',
        status: 'integrated',
        patterns: [
          'sajik-seatmap-core-qa.mjs',
        ],
        nextAction: 'Sajik core QA body and dispatcher paths are consolidated in sajik-seatmap-core-qa.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'operator-reference',
        status: 'integrated',
        patterns: [
          'sajik-seatmap-operator-reference.mjs',
        ],
        nextAction: 'Sajik operator-reference body and package dispatcher paths are consolidated in sajik-seatmap-operator-reference.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'stage01',
        status: 'integrated',
        patterns: [
          'sajik-seatmap-stage01.mjs',
        ],
        nextAction: 'Sajik stage01 body and package dispatcher paths are consolidated in sajik-seatmap-stage01.mjs; obsolete compatibility wrappers have been removed.',
      },
      {
        id: 'editor-and-scope',
        status: 'integrated',
        patterns: [
          'sajik-seatmap-editor-scope.mjs',
        ],
        nextAction: 'Sajik editor regression, PR scope guard, and marker transition review bodies are consolidated in sajik-seatmap-editor-scope.mjs; obsolete compatibility wrappers have been removed.',
      },
    ],
    legacyShellTasks: {
      "operator-reference-trace": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-candidates",
      "operator-reference-trace:stage01": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-candidates --stage stage01",
      "operator-reference-trace:stage02": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-candidates --stage stage02",
      "operator-reference-trace:stage03": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-candidates --stage stage03",
      "operator-reference-trace:stage04": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-candidates --stage stage04",
      "operator-reference-import-gate": "npm run stadium:sajik:operator-reference-trace && node scripts/sajik-seatmap-operator-reference.mjs operator-reference-import-gate",
      "operator-reference-import-gate-smoke": "npm run stadium:sajik:operator-reference-import-gate && node scripts/sajik-seatmap-operator-reference.mjs operator-reference-import-gate-smoke",
      "operator-reference-draft-summary": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-draft-summary",
      "operator-reference-dataset-export": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-dataset-export",
      "operator-reference-approved-overlay": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-approved-overlay",
      "operator-reference-visible-section-audit": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-visible-section-audit",
      "operator-reference-approved-geometry-audit": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-approved-geometry-audit",
      "operator-reference-approved-topology-audit": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-approved-topology-audit",
      "operator-reference-marker-policy-audit": "node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-marker-policy-audit",
      "operator-reference-marker-link-readiness": "node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-marker-link-readiness",
      "operator-reference-marker-boundary-review": "node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-marker-boundary-review",
      "operator-reference-target-trace-review": "npm run stadium:sajik:operator-reference-trace:stage02 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review",
      "operator-reference-target-trace-review:stage03": "npm run stadium:sajik:operator-reference-trace:stage03 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage03",
      "operator-reference-target-trace-review:stage03-lower-outer": "npm run stadium:sajik:operator-reference-trace:stage03 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage03-lower-outer",
      "operator-reference-target-trace-review:stage03-upper-outer": "npm run stadium:sajik:operator-reference-trace:stage03 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage03-upper-outer",
      "operator-reference-target-trace-review:stage03-middle-inner": "npm run stadium:sajik:operator-reference-trace:stage03 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage03-middle-inner",
      "operator-reference-target-trace-review:stage03-closeout": "npm run stadium:sajik:operator-reference-trace:stage03 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage03-closeout",
      "operator-reference-target-trace-review:stage04": "npm run stadium:sajik:operator-reference-trace:stage04 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage04",
      "operator-reference-target-trace-review:stage01-pink-inner": "npm run stadium:sajik:operator-reference-trace:stage01 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage01-pink-inner",
      "operator-reference-target-trace-review:stage01-red-lower": "npm run stadium:sajik:operator-reference-trace:stage01 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage01-red-lower",
      "operator-reference-target-trace-review:stage02-marker-adjacent": "npm run stadium:sajik:operator-reference-trace:stage02 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage02-marker-adjacent",
      "operator-reference-target-trace-review:stage02-middle": "npm run stadium:sajik:operator-reference-trace:stage02 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage02-middle",
      "operator-reference-target-trace-review:stage02-yellow-lower": "npm run stadium:sajik:operator-reference-trace:stage02 && node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-target-trace-review --stage stage02-yellow-lower",
      "operator-reference-trace-coverage-closeout": "node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-trace-coverage-closeout",
      "operator-reference-promotion-readiness": "node --import tsx scripts/sajik-seatmap-operator-reference.mjs operator-reference-promotion-readiness",
      "operator-reference-scope-audit": "node scripts/sajik-seatmap-operator-reference.mjs operator-reference-scope-audit",
      "stage01-operator-package": "npm run stadium:sajik:pixel-components && npm run stadium:sajik:zone-precision-worksets && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-operator-package",
      "stage01-operator-input-aid": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-operator-input-aid",
      "stage01-review-board": "npm run stadium:sajik:pixel-components && npm run stadium:sajik:stage01-operator-input-aid && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-review-board",
      "stage01-next-action-packet": "npm run stadium:sajik:stage01-review-board && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-next-action-packet",
      "stage01-target-review-packet": "npm run stadium:sajik:stage01-next-action-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-review-packet",
      "stage01-target-image-analysis-smoke": "npm run stadium:sajik:stage01-target-review-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-image-analysis-smoke",
      "stage01-all-target-review-packets": "npm run stadium:sajik:stage01-next-action-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-review-packet --all-stage01-targets",
      "stage01-all-target-image-analysis-smoke": "npm run stadium:sajik:stage01-all-target-review-packets && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-image-analysis-smoke --all-stage01-targets",
      "stage01-target-entry-template-readiness-smoke": "npm run stadium:sajik:stage01-target-review-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-entry-template-readiness-smoke",
      "stage01-target-entry-preflight": "npm run stadium:sajik:stage01-target-review-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-entry-preflight",
      "stage01-target-entry-preflight-smoke": "node scripts/sajik-seatmap-stage01.mjs stage01-target-entry-preflight-smoke",
      "stage01-target-approval-gate": "npm run stadium:sajik:stage01-target-entry-preflight && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-approval-gate",
      "stage01-target-approval-gate-smoke": "node scripts/sajik-seatmap-stage01.mjs stage01-target-approval-gate-smoke",
      "stage01-all-target-approval-readiness": "npm run stadium:sajik:stage01-all-target-review-packets && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-all-target-approval-readiness",
      "stage01-all-target-approval-readiness-smoke": "npm run stadium:sajik:stage01-all-target-approval-readiness && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-all-target-approval-readiness-smoke",
      "stage01-all-target-approval-input-guide": "npm run stadium:sajik:stage01-all-target-approval-readiness && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-all-target-approval-input-guide",
      "stage01-all-target-approval-input-guide-smoke": "npm run stadium:sajik:stage01-all-target-approval-input-guide && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-all-target-approval-input-guide-smoke",
      "stage01-operator-input-intake-gate": "npm run stadium:sajik:stage01-all-target-review-packets && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-operator-input-intake-gate",
      "stage01-operator-input-intake-gate-smoke": "npm run stadium:sajik:stage01-operator-input-intake-gate && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-operator-input-intake-gate-smoke",
      "stage01-prewrite": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-prewrite",
      "stage01-apply-ready": "npm run stadium:sajik:stage01-prewrite && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-apply-ready",
      "stage01-post-apply-audit": "npm run stadium:sajik:stage01-apply-ready && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-post-apply-audit",
      "stage01-operator-status": "npm run stadium:sajik:stage01-post-apply-audit && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-operator-status",
      "stage01-manual-patch-plan": "npm run stadium:sajik:stage01-operator-status && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-manual-patch-plan",
      "stage01-real-approval-readiness": "npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-manual-patch-plan && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-real-approval-readiness",
      "stage01-target-apply-precheck": "npm run stadium:sajik:stage01-real-approval-readiness && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-target-apply-precheck",
      "stage01-131-apply-path-status": "npm run stadium:sajik:stage01-operator-input-intake-gate && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-131-lifecycle-smoke && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-131-apply-path-status",
      "stage01-prewrite-smoke": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-prewrite-smoke",
      "stage01-approved-dry-run": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-approved-dry-run",
      "stage01-applied-dry-run": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-applied-dry-run",
      "stage01-131-lifecycle-smoke": "npm run stadium:sajik:stage01-target-review-packet && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-131-lifecycle-smoke",
      "stage01-readiness-summary": "node scripts/sajik-seatmap-stage01.mjs stage01-readiness-summary",
      "stage01-readiness-summary-smoke": "node scripts/sajik-seatmap-stage01.mjs stage01-readiness-summary-smoke",
      "stage01-completion-gate": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-completion-gate",
      "stage01-completion-gate:complete": "npm run stadium:sajik:stage01-next-action-packet && npm run stadium:sajik:stage01-target-apply-precheck && npm run stadium:sajik:stage01-readiness-summary && node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-completion-gate --require-complete",
      "stage01-completion-gate-smoke": "node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-completion-gate-smoke",
      "stage01-staged-scope-audit": "npm run stadium:sajik:stage01-pr-scope-guard && node scripts/sajik-seatmap-stage01.mjs stage01-staged-scope-audit",
      "stage01-staged-scope-audit:complete": "npm run stadium:sajik:stage01-pr-scope-guard && node scripts/sajik-seatmap-stage01.mjs stage01-staged-scope-audit --require-complete",
      "stage01-staged-scope-audit-smoke": "node --import tsx scripts/sajik-seatmap-stage01.mjs stage01-staged-scope-audit-smoke",
      "stage01-pr-scope-guard": "node scripts/sajik-seatmap-editor-scope.mjs pr-scope-guard --stage01-partial",
      "editor-regression": "node --import tsx scripts/sajik-seatmap-editor-scope.mjs editor-regression",
      "marker-transition-review": "node --import tsx scripts/sajik-seatmap-editor-scope.mjs marker-transition-review",
      "pr-scope-guard": "node --import tsx scripts/sajik-seatmap-editor-scope.mjs pr-scope-guard",
      "pr-scope-guard-smoke": "node --import tsx scripts/sajik-seatmap-editor-scope.mjs pr-scope-guard-smoke",
    },
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SAJIK'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SAJIK:FULL'],
        },
      ],
      'block-source-duplication-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-block-source-duplication-audit.mjs'],
        },
      ],
      'pixel-components': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'pixel-components'],
        },
      ],
      'trace-manifest': [
        {
          task: 'pixel-components',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'trace-manifest'],
        },
      ],
      'alignment-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'alignment-audit'],
          passArgs: true,
        },
      ],
      evidence: [
        {
          task: 'pixel-components',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'alignment-audit', '--allow-failures'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'trace-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'evidence'],
        },
      ],
      'advisory-playwright': [
        {
          task: 'pixel-components',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'alignment-audit', '--allow-failures'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'advisory-playwright'],
        },
      ],
      'trace-review': [
        {
          task: 'pixel-components',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'alignment-audit', '--allow-failures'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'trace-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'evidence'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'advisory-playwright'],
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SAJIK'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-core-qa.mjs', 'alignment-audit'],
        },
      ],
    },
  },
  daejeon: {
    label: 'Daejeon Hanwha Life Ballpark',
    order: 8,
    qaToken: 'DAEJEON',
    legacyArtifacts: [
      'scripts/daejeon-seatmap-ops.mjs',
    ],
    migrationBuckets: [
      {
        id: 'seatmap-ops',
        status: 'integrated',
        patterns: [
          'daejeon-seatmap-ops.mjs',
        ],
        nextAction: 'Daejeon seatmap script bodies and dispatcher paths are consolidated in daejeon-seatmap-ops.mjs; obsolete compatibility wrappers have been removed.',
      },
    ],
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'DAEJEON'],
        },
      ],
      'pixel-components': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'pixel-components'],
        },
      ],
      'trace-manifest': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'review-manifest'],
        },
      ],
      'anchor-crops': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-review-crops'],
        },
      ],
      'block-crops': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'block-evidence-crops'],
        },
      ],
      'visual-diff': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-visual-diff'],
          passArgs: true,
        },
      ],
      'visual-baseline': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-review-crops'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-visual-diff', '--write-baseline'],
        },
      ],
      'geometry-diff': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'geometry-diff'],
          passArgs: true,
        },
      ],
      'geometry-baseline': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'geometry-diff', '--write-baseline'],
        },
      ],
      'coverage-report': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'coverage-report'],
        },
      ],
      evidence: [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'evidence-crops'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-review-crops'],
        },
      ],
      'trace-review': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'pixel-components'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'review-manifest'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'evidence-crops'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'anchor-review-crops'],
        },
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'DAEJEON'],
          env: { STADIUM_UX_DAEJEON_DEBUG_CAPTURE: '1' },
        },
      ],
      'release-lock': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'release-gate'],
        },
      ],
      'change-guard': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'change-guard'],
        },
      ],
      'operator-handoff': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'change-guard'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-handoff'],
        },
      ],
      'operator-approval': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'change-guard'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-handoff'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-approval'],
        },
      ],
      'operator-approval:status': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-approval', '--status'],
        },
      ],
      'operator-approval:approve': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'change-guard'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-approval', '--approve'],
        },
      ],
      'operator-approval:verify': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-approval', '--require-approved'],
        },
      ],
      'release-approved': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'change-guard'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/daejeon-seatmap-ops.mjs', 'operator-approval', '--require-approved'],
        },
      ],
    },
  },
  incheon: {
    label: 'Incheon SSG Landers Field',
    order: 9,
    qaToken: 'INCHEON',
    legacyArtifacts: [],
    tasks: {
      mobile: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'INCHEON'],
        },
      ],
      full: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'INCHEON:FULL'],
        },
      ],
      'release-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/incheon-seatmap-ops.mjs', 'release-gate'],
        },
      ],
    },
  },
};

const taskAliases = {
  qa: 'mobile',
  review: 'trace-review',
};

function printUsage() {
  const stadiums = Object.entries(STADIUMS)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, config]) => `${id} (${config.label})`)
    .join(', ');

  console.log([
    'Usage: node scripts/stadium-seatmap-ops.mjs <stadium> <task>',
    '',
    `Stadiums: ${stadiums}`,
    'Tasks: status, pixel-components, trace-manifest, evidence, mobile, full, trace-review',
  ].join('\n'));
}

function resolveTaskName(taskName) {
  return taskAliases[taskName] ?? taskName;
}

function printStatus(stadiumId, config) {
  const tasks = [
    ...new Set([
      ...Object.keys(config.tasks),
      ...Object.keys(config.legacyShellTasks ?? {}),
    ]),
  ].sort();

  console.log(JSON.stringify({
    stadium: stadiumId,
    label: config.label,
    order: config.order,
    qaToken: config.qaToken,
    status: 'integrated-entrypoint',
    tasks,
    legacyArtifacts: config.legacyArtifacts,
    migrationBuckets: config.migrationBuckets ?? [],
    cleanupPolicy: 'keep until the stadium-specific task is migrated into shared config/helpers',
  }, null, 2));
}

function runSteps(stadium, steps, passthroughArgs, stack) {
  steps.forEach((step) => runStep(stadium, step, passthroughArgs, stack));
}

function runStep(stadium, step, passthroughArgs, stack) {
  if (step.task) {
    if (stack.includes(step.task)) {
      throw new Error(`Recursive task reference: ${[...stack, step.task].join(' -> ')}`);
    }

    const nestedTask = stadium.tasks[step.task];
    if (!nestedTask) {
      throw new Error(`Unknown nested task: ${step.task}`);
    }

    runSteps(stadium, nestedTask, passthroughArgs, [...stack, step.task]);
    return;
  }

  if (step.shellScript) {
    const result = spawnSync(step.shellScript, {
      cwd: frontendRoot,
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    return;
  }

  const args = step.passArgs ? [...step.args, ...passthroughArgs] : step.args;
  const result = spawnSync(step.command, args, {
    cwd: frontendRoot,
    env: {
      ...process.env,
      ...(step.env ?? {}),
    },
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const [rawStadiumId, rawTaskName = 'status', ...passthroughArgs] = process.argv.slice(2);

if (!rawStadiumId || rawStadiumId === '--help' || rawStadiumId === '-h') {
  printUsage();
  process.exit(rawStadiumId ? 0 : 1);
}

const stadiumId = rawStadiumId.toLowerCase();
const stadium = STADIUMS[stadiumId];

if (!stadium) {
  console.error(`Unknown stadium: ${rawStadiumId}`);
  printUsage();
  process.exit(1);
}

const taskName = resolveTaskName(rawTaskName);

if (taskName === 'status') {
  printStatus(stadiumId, stadium);
  process.exit(0);
}

const task = stadium.tasks[taskName]
  ?? (stadium.legacyShellTasks?.[taskName]
    ? [{ shellScript: stadium.legacyShellTasks[taskName] }]
    : null);

if (!task) {
  console.error(`Unknown task for ${stadiumId}: ${rawTaskName}`);
  console.error(`Available tasks: status, ${Object.keys(stadium.tasks).sort().join(', ')}`);
  process.exit(1);
}

runSteps(stadium, task, passthroughArgs, [taskName]);
