import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import GwangjuSeatMapEditor from './GwangjuSeatMapEditor';

test('GwangjuSeatMapEditor는 precision v1 dev editor/export shell 계약을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(GwangjuSeatMapEditor));

  assert.match(html, /data-testid="gwangju-seatmap-editor"/);
  assert.match(html, /gwangju-precision-v1/);
  assert.match(html, /data-summary-total-sections="113"/);
  assert.match(html, /data-summary-enabled-sections="113"/);
  assert.match(html, /data-summary-derived-aggregate-sections="2"/);
  assert.match(html, /data-testid="gwangju-editor-svg"/);
  assert.match(html, /viewBox="0 0 2200 1159"/);
  assert.match(html, /data-testid="gwangju-editor-official-image"/);
  assert.match(html, /data-testid="gwangju-editor-section-k7-121"/);
  assert.match(html, /data-testid="gwangju-editor-draft-controls"/);
  assert.match(html, /data-testid="gwangju-editor-dataset-json"/);
  assert.match(html, /GWANGJU_PRECISION_V1_SECTION_GEOMETRY_PATCH_PREVIEW/);
  assert.match(html, /file-write disabled/);
});

test('GwangjuSeatMapEditor route는 production navigation에 노출되지 않는 dev-only 내부 route다', () => {
  const appRoutesSource = readFileSync(resolve(process.cwd(), 'src/components/AppRoutes.tsx'), 'utf8');
  const publicNavSource = readFileSync(resolve(process.cwd(), 'src/components/publicNavbarNavItems.ts'), 'utf8');

  assert.match(appRoutesSource, /const GwangjuSeatMapEditor = import\.meta\.env\.DEV/);
  assert.match(appRoutesSource, /path="\/internal\/gwangju-seatmap-editor"/);
  assert.match(appRoutesSource, /import\.meta\.env\.DEV && GwangjuSeatMapEditor/);
  assert.doesNotMatch(publicNavSource, /gwangju-seatmap-editor/);
});
