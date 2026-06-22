import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StadiumSeatMapManualRequired } from './StadiumSeatMapStates';

test('StadiumSeatMapManualRequired keeps manual data code as metadata only', () => {
  const html = renderToStaticMarkup(createElement(StadiumSeatMapManualRequired, {
    stadiumName: '잠실야구장',
  }));

  assert.match(html, /data-testid="stadium-seatmap-manual-required"/);
  assert.match(html, /data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"/);
  assert.match(html, /잠실야구장 좌석도는 준비 중입니다/);
  assert.match(html, /공식 좌석도와 선택 영역 검수가 끝나면/);
  assert.doesNotMatch(html.replace(/data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"/, ''), /MANUAL_BASEBALL_DATA_REQUIRED/);
});
