import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('AdvancedMatchCard는 공용 StatusBadge 메타로 경기 상태 배지를 렌더링한다', () => {
  const source = readFileSync(new URL('./AdvancedMatchCard.tsx', import.meta.url), 'utf8');

  assert.match(source, /import \{ StatusBadge \} from '\.\.\/ui\/status-badge';/);
  assert.match(source, /import \{ getGameStatusBadgeMeta \} from '\.\.\/\.\.\/utils\/statusBadgeMeta';/);
  assert.match(source, /<StatusBadge\s+data-testid="prediction-status-badge"/);
  assert.match(source, /\{\.\.\.getGameStatusBadgeMeta\(statusCode, scheduledStateLabel\)\}/);
  assert.doesNotMatch(source, /PredictionWarningTriangleIcon/);
});

test('AdvancedMatchCard는 상세 런타임 statusCode 전달 계약을 유지한다', () => {
  const source = readFileSync(new URL('./AdvancedMatchCard.tsx', import.meta.url), 'utf8');

  assert.match(source, /const contentRuntimeProps: AdvancedMatchCardContentRuntimeProps = \{[\s\S]*\n    statusCode,\n    isDarkMode,/);
});

test('AdvancedMatchCard는 dark mode에서 주요 상태 텍스트를 흰색으로 유지한다', () => {
  const source = readFileSync(new URL('./AdvancedMatchCard.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="vote-disabled-away-btn"[\s\S]*dark:text-white/);
  assert.match(source, /data-testid="vote-disabled-home-btn"[\s\S]*dark:text-white/);
  assert.match(source, /text-gray-300 dark:text-white">:<\/span>/);
  assert.match(source, /font-bold text-gray-500 dark:text-white sm:text-\[16px\]/);
  assert.match(source, /text-slate-600 dark:text-white/);
  assert.match(source, /경기 상세 섹션을 준비하고 있습니다\./);
  assert.match(source, /dark:bg-secondary\/40 dark:text-white/);
});
