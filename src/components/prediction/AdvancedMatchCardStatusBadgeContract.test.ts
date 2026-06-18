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
