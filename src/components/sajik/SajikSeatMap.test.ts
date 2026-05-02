import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import SajikSeatMap from './SajikSeatMap';

test('SajikSeatMap은 공식 사직 좌석도와 대표 블럭 markup을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SajikSeatMap)));

  assert.match(html, /data-testid="stadium-seat-map"/);
  assert.match(html, /부산 사직야구장/);
  assert.match(html, /사직 롯데 공식 좌석도/);
  assert.match(html, /롯데자이언츠 공식 좌석안내 2026 시즌/);
  assert.match(html, /1루 내야필드석 111블록/);
  assert.match(html, /중앙탁자석 021블록/);
  assert.match(html, /다이어리에서 시야 사진을 공유/);
  assert.match(html, /sajik-lotte-seatmap-official-2026\.png/);
  assert.doesNotMatch(html, /data-testid="sajik-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /SAJIK SEAT VIEW/);
  assert.doesNotMatch(html, /사진은 데모 상태/);
});
