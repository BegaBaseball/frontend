import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(scriptDir, '..', 'package.json');
const packageJsonSource = readFileSync(packageJsonPath, 'utf8');

const findJsonStringEnd = (source, startIndex) => {
  for (let index = startIndex + 1; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }

    if (source[index] === '"') {
      return index;
    }
  }

  throw new Error(`Unterminated JSON string starting at ${startIndex}`);
};

const extractObjectBody = (source, propertyName) => {
  const propertyMatch = new RegExp(`"${propertyName}"\\s*:`).exec(source);
  assert.ok(propertyMatch, `${propertyName} property exists`);

  const openingBraceIndex = source.indexOf('{', propertyMatch.index + propertyMatch[0].length);
  assert.notEqual(openingBraceIndex, -1, `${propertyName} object starts with an opening brace`);

  let depth = 0;
  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      index = findJsonStringEnd(source, index);
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openingBraceIndex + 1, index);
      }
    }
  }

  throw new Error(`Unterminated ${propertyName} object`);
};

const extractTopLevelKeys = (objectBody) => {
  const keys = [];
  let nestedDepth = 0;

  for (let index = 0; index < objectBody.length; index += 1) {
    const char = objectBody[index];
    if (char === '"') {
      const endIndex = findJsonStringEnd(objectBody, index);
      if (nestedDepth === 0) {
        let cursor = endIndex + 1;
        while (/\s/.test(objectBody[cursor] || '')) {
          cursor += 1;
        }
        if (objectBody[cursor] === ':') {
          keys.push(JSON.parse(objectBody.slice(index, endIndex + 1)));
        }
      }
      index = endIndex;
      continue;
    }

    if (char === '{' || char === '[') {
      nestedDepth += 1;
    } else if (char === '}' || char === ']') {
      nestedDepth -= 1;
    }
  }

  return keys;
};

const findDuplicates = (values) => {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates].sort();
};

test('package.json scripts do not contain duplicate raw keys', () => {
  const scriptsBody = extractObjectBody(packageJsonSource, 'scripts');
  assert.deepEqual(findDuplicates(extractTopLevelKeys(scriptsBody)), []);
});

test('navbar/auth related QA scripts remain registered once', () => {
  const packageJson = JSON.parse(packageJsonSource);

  assert.equal(packageJson.scripts['ci:workflow-policy'], 'node scripts/ci-workflow-policy.mjs');
  assert.equal(
    packageJson.scripts['qa:prediction:mobile:smoke:ranking'],
    'node scripts/qa-presets.mjs prediction-mobile smoke-ranking',
  );
  assert.equal(
    packageJson.scripts['qa:prediction:mobile:smoke:ranking:attached'],
    'node scripts/qa-presets.mjs prediction-mobile smoke-ranking-attached',
  );
});

test('SEO test script covers runtime and static prerender smoke contracts', () => {
  const packageJson = JSON.parse(packageJsonSource);
  const testSeoScript = packageJson.scripts['test:seo'];

  assert.match(testSeoScript, /src\/seo\/\*\*\/\*\.test\.ts/);
  assert.match(testSeoScript, /scripts\/prerender-seo\.test\.mjs/);
  assert.match(testSeoScript, /scripts\/seo-postdeploy-smoke\.test\.mjs/);
});
