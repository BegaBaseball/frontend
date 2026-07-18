#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHARED_PATTERNS = [
  'bega_frontend/package.json',
  'bega_frontend/package-lock.json',
  '.github/workflows/_frontend-node-suite.yml',
  '.github/workflows/frontend-ui-qa.yml',
];

export const UI_SUITE_PATTERNS = {
  pages: [
    'bega_frontend/src/**',
    'bega_frontend/cypress/e2e/**',
    'bega_frontend/cypress.config.ts',
    'bega_frontend/cypress/support/**',
    'bega_frontend/scripts/qa-presets.mjs',
    'bega_frontend/scripts/test-e2e.mjs',
    ...SHARED_PATTERNS,
  ],
  auth: [
    'bega_frontend/src/api/authPublic.ts',
    'bega_frontend/src/api/authPublic.test.ts',
    'bega_frontend/src/api/publicClient.ts',
    'bega_frontend/src/components/auth/AuthLayout.tsx',
    'bega_frontend/src/components/AppRoutes.tsx',
    'bega_frontend/src/components/Login.tsx',
    'bega_frontend/src/components/SignUp.tsx',
    'bega_frontend/src/components/PasswordReset.tsx',
    'bega_frontend/src/components/PasswordResetConfirm.tsx',
    'bega_frontend/src/components/AccountDeletionRecovery.tsx',
    'bega_frontend/src/components/ui/auth-primitives.tsx',
    'bega_frontend/src/components/ui/button.tsx',
    'bega_frontend/src/components/ui/input.tsx',
    'bega_frontend/src/components/ui/select.tsx',
    'bega_frontend/src/components/ui/label.tsx',
    'bega_frontend/src/hooks/useSignUpForm.ts',
    'bega_frontend/src/index.css',
    'bega_frontend/src/types/auth.ts',
    'bega_frontend/src/utils/loginRedirect.ts',
    'bega_frontend/src/utils/validation.ts',
    'bega_frontend/cypress/e2e/auth*.cy.ts',
    'bega_frontend/cypress/support/**',
    'bega_frontend/scripts/auth-qa.mjs',
    'bega_frontend/scripts/cypress-run.mjs',
    'bega_frontend/scripts/test-e2e.mjs',
    ...SHARED_PATTERNS,
  ],
  home: [
    'bega_frontend/src/api/home.ts',
    'bega_frontend/src/components/AppShellRuntime.tsx',
    'bega_frontend/src/components/DeferredPretendardFont.tsx',
    'bega_frontend/src/components/Home.tsx',
    'bega_frontend/src/components/HomeRuntime.tsx',
    'bega_frontend/src/components/home/**',
    'bega_frontend/src/index.css',
    'bega_frontend/scripts/bundle-guard.mjs',
    'bega_frontend/scripts/home-first-load-audit.mjs',
    'bega_frontend/scripts/lib/react-dev-artifact-policy.mjs',
    'bega_frontend/scripts/react-dev-artifact-policy.test.mjs',
    'bega_frontend/scripts/vite-production-env-policy.test.ts',
    'bega_frontend/tailwind.config.js',
    'bega_frontend/vite.config.ts',
    ...SHARED_PATTERNS,
  ],
  landing: [
    'bega_frontend/src/components/Landing.tsx',
    'bega_frontend/src/components/FeatureCard.tsx',
    'bega_frontend/src/components/LaptopMockup.tsx',
    'bega_frontend/src/assets/landing/**',
    'bega_frontend/src/components/ThemeToggleButton.tsx',
    'bega_frontend/src/components/ViewportDeferred.tsx',
    'bega_frontend/src/components/common/OptimizedImage.tsx',
    'bega_frontend/src/components/icons/FirstLoadIcons.tsx',
    'bega_frontend/src/components/ui/button.tsx',
    'bega_frontend/src/components/ui/card.tsx',
    'bega_frontend/src/components/ui/page-primitives.tsx',
    'bega_frontend/src/hooks/useLandingScroll.ts',
    'bega_frontend/src/constants/landing.ts',
    'bega_frontend/src/types/landing.tsx',
    'bega_frontend/src/index.css',
    'bega_frontend/scripts/landing-qa.mjs',
    'bega_frontend/scripts/landing-first-load-audit.mjs',
    ...SHARED_PATTERNS,
  ],
  stadium: [
    'bega_frontend/src/components/StadiumGuide.tsx',
    'bega_frontend/src/hooks/useStadiumGuide.ts',
    'bega_frontend/src/hooks/useKakaoMap.ts',
    'bega_frontend/src/utils/kakaoMap.ts',
    'bega_frontend/src/utils/stadiumGuideUtils.ts',
    'bega_frontend/src/types/stadium.ts',
    'bega_frontend/cypress/e2e/stadium.cy.ts',
    'bega_frontend/cypress/support/**',
    'bega_frontend/cypress.config.ts',
    ...SHARED_PATTERNS,
  ],
};

const globToRegExp = (pattern) => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*')}$`);
};

const removeFrontendPrefix = (path) => path.replace(/^bega_frontend\//, '');
const matches = (path, pattern) => globToRegExp(removeFrontendPrefix(pattern))
  .test(removeFrontendPrefix(path));

export function detectFrontendUiImpact(changedPaths, suiteInput = 'all', eventName = 'pull_request') {
  const result = Object.fromEntries(
    Object.keys(UI_SUITE_PATTERNS).map((name) => [`${name}_changed`, false]),
  );

  if (suiteInput !== 'all') {
    if (`${suiteInput}_changed` in result) result[`${suiteInput}_changed`] = true;
    return result;
  }
  if (eventName !== 'pull_request') {
    return Object.fromEntries(Object.keys(result).map((name) => [name, true]));
  }

  for (const [suite, patterns] of Object.entries(UI_SUITE_PATTERNS)) {
    result[`${suite}_changed`] = changedPaths.some((path) =>
      patterns.some((pattern) => matches(path, pattern)),
    );
  }
  return result;
}

function main() {
  const changedFileArg = process.argv.find((argument) => argument.startsWith('--changed-file='));
  if (!changedFileArg) throw new Error('Provide --changed-file=/path/to/changed-files.txt');
  const changedFile = changedFileArg.slice('--changed-file='.length);
  const changedPaths = readFileSync(changedFile, 'utf8').split(/\r?\n/).filter(Boolean);
  const result = detectFrontendUiImpact(
    changedPaths,
    process.env.SUITE_INPUT ?? 'all',
    process.env.GITHUB_EVENT_NAME ?? 'workflow_dispatch',
  );
  const output = Object.entries(result)
    .map(([name, enabled]) => `${name}=${enabled ? 'true' : 'false'}`)
    .join('\n');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
  else console.log(output);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(`[frontend-ui-impact] ${error.message}`);
    process.exitCode = 1;
  }
}
