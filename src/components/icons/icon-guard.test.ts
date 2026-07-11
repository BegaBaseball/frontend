import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const frontendRoot = path.resolve(srcRoot, '..');
const retiredLucidePackageName = ['lucide', 'react'].join('-');
const retiredLucideShimFile = `${retiredLucidePackageName}.tsx`;
const inlineSvgElementPattern = new RegExp(
  ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon']
    .map((tagName) => `<${tagName}\\b`)
    .join('|'),
);

const iconModulePaths = [
  'components/AdminIcons.tsx',
  'components/MateIcons.tsx',
  'components/NotificationIcons.tsx',
  'components/admin/AdminDetailIcons.tsx',
  'components/admin/AdminPanelIcons.tsx',
  'components/chatbot/ChatBotIcons.tsx',
  'components/home/HomeIcons.tsx',
  'components/icons/CheerIcons.tsx',
  'components/icons/FirstLoadIcons.tsx',
  'components/icons/PublicFeatureIcons.tsx',
  'components/icons/PublicShellIcons.tsx',
  'components/icons/SharedLeafIcons.tsx',
  'components/mypage/MyPageIcons.tsx',
  'components/prediction/PredictionShellIcons.tsx',
  'components/profile/ProfileIcons.tsx',
];

const isSourceFilePath = (filePath: string) => /\.(ts|tsx)$/.test(filePath) && !filePath.endsWith('.d.ts');

const parseSourceFile = (filePath: string) => ts.createSourceFile(
  filePath,
  fs.readFileSync(filePath, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);

const walkSourceFiles = (rootDir: string): string[] => {
  const files: string[] = [];

  const walk = (currentDir: string) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const filePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
        continue;
      }

      if (isSourceFilePath(filePath)) {
        files.push(filePath);
      }
    }
  };

  walk(rootDir);

  return files;
};

test('frontend source does not import the retired Lucide shim', () => {
  const lucideImports: string[] = [];

  for (const filePath of walkSourceFiles(srcRoot)) {
    const sourceFile = parseSourceFile(filePath);
    for (const statement of sourceFile.statements) {
      if (
        ts.isImportDeclaration(statement)
        && ts.isStringLiteral(statement.moduleSpecifier)
        && statement.moduleSpecifier.text === retiredLucidePackageName
      ) {
        lucideImports.push(path.relative(frontendRoot, filePath));
      }
    }
  }

  assert.deepEqual(lucideImports.sort(), []);
});

test('compatibility icon modules use Phosphor instead of inline SVG paths', () => {
  const offenders: string[] = [];

  for (const relativePath of iconModulePaths) {
    const source = fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
    if (inlineSvgElementPattern.test(source)) {
      offenders.push(relativePath);
    }
  }

  assert.deepEqual(offenders, []);
});

test('Lucide shim file is not restored', () => {
  assert.equal(fs.existsSync(path.join(srcRoot, 'shims', retiredLucideShimFile)), false);
});
