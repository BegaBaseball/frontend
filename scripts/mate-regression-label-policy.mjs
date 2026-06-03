import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, matchesGlob, resolve } from 'node:path';

export const FULL_MATE_REGRESSION_LABEL = 'full-mate-regression';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, '..');
export const LABELER_CONFIG_PATH = '.github/labeler.yml';
const FRONTEND_PATH_PREFIX = 'bega_frontend/';

const normalizePath = (value) =>
  value
    .replace(/\\/g, '/')
    .replace(new RegExp(`^\\.?/?${FRONTEND_PATH_PREFIX}`), '')
    .replace(/^\.\//, '');

export const extractLabelGlobs = (contents, labelName = FULL_MATE_REGRESSION_LABEL) => {
  const lines = contents.split(/\r?\n/);
  const globs = [];
  let isInLabel = false;

  for (const line of lines) {
    if (!isInLabel) {
      if (line.trim() === `${labelName}:`) {
        isInLabel = true;
      }
      continue;
    }

    if (/^[^\s].*:\s*$/.test(line)) {
      break;
    }

    const match = line.match(/^\s*-\s+"([^"]+)"\s*$/);
    if (match) {
      globs.push(match[1]);
    }
  }

  return globs;
};

export const loadFullMateRegressionGlobs = (repoRoot = DEFAULT_REPO_ROOT) => {
  const configPath = resolve(repoRoot, LABELER_CONFIG_PATH);
  const contents = readFileSync(configPath, 'utf8');
  return extractLabelGlobs(contents).map((glob) => normalizePath(glob));
};

export const findFullMateRegressionMatches = (changedFiles, globs) => {
  const normalizedFiles = changedFiles.map(normalizePath);
  return normalizedFiles.filter((filePath) => globs.some((glob) => matchesGlob(filePath, glob)));
};

export const shouldApplyFullMateRegressionLabel = (changedFiles, globs) =>
  findFullMateRegressionMatches(changedFiles, globs).length > 0;
