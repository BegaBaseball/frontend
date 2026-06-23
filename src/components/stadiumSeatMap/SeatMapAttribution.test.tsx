import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { SeatMapAttribution } from './SeatMapAttribution';

test('SeatMapAttribution은 수동 데이터 계약 코드를 사용자에게 노출하지 않는다', () => {
  const html = renderToStaticMarkup(createElement(SeatMapAttribution, {
    source: {
      sourceLabel: '운영자 제공 좌석도 준비 중',
      assetStatus: 'MANUAL_BASEBALL_DATA_REQUIRED',
    },
  }));

  assert.match(html, /좌석 배치 기준:/);
  assert.match(html, /운영자 제공 좌석도 준비 중/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});
