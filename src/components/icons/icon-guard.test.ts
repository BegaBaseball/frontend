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

const compatibilityIconModulePaths = [
  'components/MateIcons.tsx',
  'components/NotificationIcons.tsx',
  'components/chatbot/ChatBotIcons.tsx',
  'components/home/HomeIcons.tsx',
  'components/icons/CheerIcons.tsx',
  'components/icons/FirstLoadIcons.tsx',
  'components/icons/PublicFeatureIcons.tsx',
  'components/icons/PublicShellIcons.tsx',
  'components/icons/SharedLeafIcons.tsx',
  'components/mypage/MyPageIcons.tsx',
  'components/profile/ProfileIcons.tsx',
];

const routeScopedInlineIconModulePaths = [
  'components/AdminIcons.tsx',
  'components/admin/AdminDetailIcons.tsx',
  'components/admin/AdminPanelIcons.tsx',
  'components/icons/AuthFlowIcons.tsx',
  'components/icons/CalendarIcons.tsx',
  'components/icons/CheerCardIcons.tsx',
  'components/icons/CheerComposerIcons.tsx',
  'components/icons/CheerDetailArticleIcons.tsx',
  'components/icons/CheerFlowIcons.tsx',
  'components/icons/CheerModalIcons.tsx',
  'components/icons/CheerShellIcons.tsx',
  'components/icons/CoachAnalysisResultIcons.tsx',
  'components/icons/EmojiPickerIcons.tsx',
  'components/icons/EndOfFeedIcons.tsx',
  'components/icons/ImageGridIcons.tsx',
  'components/icons/LandingIcons.tsx',
  'components/icons/MateApplyIcons.tsx',
  'components/icons/MateDetailIcons.tsx',
  'components/icons/MateCreateIcons.tsx',
  'components/icons/MateFlowIcons.tsx',
  'components/icons/NavbarIcons.tsx',
  'components/icons/NoticePageIcons.tsx',
  'components/icons/NotificationPanelIcons.tsx',
  'components/icons/OffseasonIcons.tsx',
  'components/icons/OptimizedImageIcons.tsx',
  'components/icons/SeatCategoryIcons.tsx',
  'components/icons/StadiumGuideIcons.tsx',
  'components/icons/TeamRecommendationTestIcons.tsx',
  'components/icons/TicketUploadIcons.tsx',
  'components/icons/VerificationDialogIcons.tsx',
  'components/chatbot/ChatBotConversationIcons.tsx',
  'components/chatbot/ChatBotSessionIcons.tsx',
  'components/cheer/CommentItemIcons.tsx',
  'components/dm/DirectMessageIcons.tsx',
  'components/home/HomeSecondaryIcons.tsx',
  'components/mypage/DiaryEditModeIcons.tsx',
  'components/mypage/DiaryformIcons.tsx',
  'components/mypage/MyPageFlowIcons.tsx',
  'components/mypage/ProfileEditSectionIcons.tsx',
  'components/prediction/PredictionShellIcons.tsx',
  'components/profile/UserProfileIcons.tsx',
  'components/ranking/RankingPredictionIcons.tsx',
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

  for (const relativePath of compatibilityIconModulePaths) {
    const source = fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
    if (inlineSvgElementPattern.test(source)) {
      offenders.push(relativePath);
    }
  }

  assert.deepEqual(offenders, []);
});

test('route-scoped inline icon modules do not import Phosphor', () => {
  const offenders: string[] = [];

  for (const relativePath of routeScopedInlineIconModulePaths) {
    const sourceFile = parseSourceFile(path.join(srcRoot, relativePath));
    for (const statement of sourceFile.statements) {
      if (
        ts.isImportDeclaration(statement)
        && ts.isStringLiteral(statement.moduleSpecifier)
        && statement.moduleSpecifier.text === '@phosphor-icons/react'
      ) {
        offenders.push(relativePath);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test('Lucide shim file is not restored', () => {
  assert.equal(fs.existsSync(path.join(srcRoot, 'shims', retiredLucideShimFile)), false);
});
