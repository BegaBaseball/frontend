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
    publicTasks: [
      'mobile',
      'operator-handoff',
      'operator-status',
      'pixel-components',
      'release-gate',
      'release-verify',
      'status',
      'trace-manifest',
    ],
    historicalTaskPolicy: 'image alignment, block-source audit, runtime-layer, trace-review, release package/audit/scope guard, PR staging, and granular release verification tasks remain dispatcher-internal; package aliases expose only mobile/runtime release and current operator status/handoff gates.',
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
          passArgs: true,
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
      'official-third-infield-trace': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-core-qa.mjs', 'official-third-infield-trace'],
        },
      ],
      'block-source-duplication-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-block-source-duplication-audit.mjs'],
        },
      ],
      'artifact-scope-audit': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-artifact-scope-audit.mjs'],
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
        { task: 'artifact-scope-audit' },
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
      'precision-editor-dataset': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'dataset-summary'],
        },
      ],
      'precision-editor-patch:validate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'editor-patch-validate'],
          passArgs: true,
        },
      ],
      'precision-editor-patch:apply-plan': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'editor-patch-apply-plan'],
          passArgs: true,
        },
      ],
      'precision-editor-patch:gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'editor-patch-gate'],
          passArgs: true,
        },
      ],
      'precision-editor-patch:write-guard': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'editor-patch-write-guard'],
          passArgs: true,
        },
      ],
      'precision-editor-patch:postwrite-gate': [
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-precision-v1-editor-ops.mjs', 'editor-postwrite-gate'],
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
        { task: 'trace-review' },
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
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-artifact-scope-audit.mjs'],
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
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-artifact-scope-audit.mjs'],
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
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/gwangju-seatmap-artifact-scope-audit.mjs'],
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
    cleanupPolicy: 'public package aliases expose only mobile/runtime release, current operator status/handoff, status, pixel components, and trace manifest; image-alignment, trace-review, runtime-layer, release packaging/audit/scope, and PR staging tasks stay available through the integrated dispatcher',
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
    publicTasks: [
      'full',
      'mobile',
      'release-gate',
      'status',
    ],
    historicalTaskPolicy: 'responsive QA remains dispatcher-internal; package aliases expose only mobile/full runtime QA, release lock, and status.',
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
    cleanupPolicy: 'public package aliases expose only mobile/full runtime QA, release lock, and status; responsive QA stays available through the integrated dispatcher',
  },
  daegu: {
    label: 'Daegu Samsung Lions Park',
    order: 5,
    qaToken: 'DAEGU',
    legacyArtifacts: [
      'scripts/daegu-seatmap-ops.mjs',
      'scripts/daegu-seatmap-core-qa.mjs',
      'scripts/daegu-seatmap-source-baseline-audit.mjs',
      'scripts/daegu-seatmap-canonical-decision-table.mjs',
      'scripts/daegu-seatmap-qa-ownership-audit.mjs',
      'scripts/daegu-seatmap-canonical-block-decision-guard.mjs',
      'scripts/daegu-seatmap-canonical-official-only-retrace-workset.mjs',
      'scripts/daegu-seatmap-canonical-retrace-batch.mjs',
      'scripts/daegu-seatmap-precision-audit.mjs',
      'scripts/daegu-seatmap-render-safety-audit.mjs',
    ],
    migrationBuckets: [
      {
        id: 'canonical-runtime-release',
        status: 'integrated',
        patterns: [
          'daegu-seatmap-ops.mjs',
          'daegu-seatmap-core-qa.mjs',
          'daegu-seatmap-canonical-*.mjs',
          'daegu-seatmap-precision-audit.mjs',
          'daegu-seatmap-render-safety-audit.mjs',
        ],
        nextAction: 'Daegu runtime/release QA commands delegate to daegu-seatmap-ops.mjs; historical operator-reference stage scripts have been removed and are recoverable from Git history only.',
      },
    ],
    cleanupPolicy: 'historical operator-reference stage scripts are recoverable from Git history only',
    tasks: {
      mobile: [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'mobile'] }],
      full: [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'full'] }],
      'pixel-components': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'pixel-components'] }],
      'trace-manifest': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'trace-manifest'] }],
      'alignment-audit': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'alignment-audit'] }],
      'operator-handoff': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'operator-handoff'] }],
      'handoff-evidence': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'handoff-evidence'] }],
      'source-baseline-audit': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'source-baseline-audit'] }],
      'canonical-decision-table': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-decision-table'] }],
      'qa-ownership-audit': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'qa-ownership-audit'] }],
      'canonical-block-decision-guard': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-block-decision-guard'] }],
      'canonical-official-only-retrace-workset': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-official-only-retrace-workset'] }],
      'canonical-retrace-batch': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-retrace-batch'], passArgs: true }],
      'canonical-retrace-gate': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-retrace-gate'], passArgs: true }],
      'canonical-retrace-gate:require-approved': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'canonical-retrace-gate:require-approved'], passArgs: true }],
      'precision-audit': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'precision-audit'], passArgs: true }],
      'render-safety-audit': [{ command: 'node', args: ['scripts/daegu-seatmap-ops.mjs', 'render-safety-audit'], passArgs: true }],
    },
  },
  suwon: {
    label: 'Suwon KT Wiz Park',
    order: 6,
    qaToken: 'SUWON',
    legacyArtifacts: [
      'scripts/suwon-seatmap-ops.mjs',
    ],
    publicTasks: [
      'full',
      'mobile',
      'release-gate',
      'status',
    ],
    historicalTaskPolicy: 'responsive QA, visual review, and precision workset generation remain dispatcher-internal; package aliases expose only mobile/full runtime QA, release lock, and status.',
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
      responsive: [
        {
          command: 'node',
          args: ['scripts/run-stadium-isolated-qa.mjs', 'SUWON:RESPONSIVE'],
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
    cleanupPolicy: 'public package aliases expose only mobile/full runtime QA, release lock, and status; responsive, visual-review, and precision-workset tasks stay available through the integrated dispatcher',
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
    publicTasks: [
      'alignment-audit',
      'block-source-duplication-audit',
      'dataset-export',
      'editor-regression',
      'full',
      'marker-transition-review',
      'mobile',
      'pixel-components',
      'pr-scope-guard',
      'pr-scope-guard-smoke',
      'release-lock',
      'source-audit',
      'trace-manifest',
    ],
    historicalTaskPolicy: 'stage01 and operator-reference tasks are callable only as direct historical tasks; package aliases are not public release commands.',
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
      'release-lock': [
        {
          task: 'block-source-duplication-audit',
        },
        {
          command: 'node',
          args: ['--import', 'tsx', 'scripts/sajik-seatmap-export-dataset.mjs', '--check'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', '--test', 'src/data/sajikSeatData.test.ts', 'src/components/sajik/SajikSeatMap.test.ts'],
        },
        {
          command: 'node',
          args: ['--import', 'tsx', '--test', '--test-name-pattern', '사직|Sajik', 'src/components/StadiumGuideRuntimeSeatMaps.test.ts'],
        },
        {
          task: 'full',
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
    cleanupPolicy: 'public package aliases expose only canonical/runtime release tasks; stage01 and operator-reference tasks are historical reference workflows',
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
    publicTasks: [
      'full',
      'mobile',
      'release-gate',
      'status',
    ],
    historicalTaskPolicy: 'package aliases expose only mobile/full runtime QA, release lock, and status; no responsive, trace-review, or pixel-components public aliases are required for the current official-source map.',
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
    cleanupPolicy: 'public package aliases expose only mobile/full runtime QA, release lock, and status; additional review modes must stay dispatcher-internal unless a release gate explicitly promotes them',
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
  const tasks = (config.publicTasks
    ? [...config.publicTasks]
    : [
      ...new Set([
        ...Object.keys(config.tasks),
        ...Object.keys(config.legacyShellTasks ?? {}),
      ]),
    ]).sort();
  const historicalTaskCount = config.publicTasks ? Object.keys(config.legacyShellTasks ?? {}).length : undefined;

  console.log(JSON.stringify({
    stadium: stadiumId,
    label: config.label,
    order: config.order,
    qaToken: config.qaToken,
    status: 'integrated-entrypoint',
    tasks,
    historicalTaskCount,
    historicalTaskPolicy: config.historicalTaskPolicy,
    legacyArtifacts: config.legacyArtifacts,
    migrationBuckets: config.migrationBuckets ?? [],
    cleanupPolicy: config.cleanupPolicy ?? 'keep until the stadium-specific task is migrated into shared config/helpers',
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
