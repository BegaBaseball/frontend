import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import IncheonSeatMap from './IncheonSeatMap';

test('IncheonSeatMap은 공식 인천 좌석도와 처음 인천 가이드 markup을 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(IncheonSeatMap)));

  assert.match(html, /data-testid="stadium-seat-map"/);
  assert.match(html, /인천SSG랜더스필드/);
  assert.match(html, /인천 SSG 공식 좌석도/);
  assert.match(html, /처음 인천 가이드/);
  assert.match(html, /블록\/좌석 검색/);
  assert.match(html, /홈 응원/);
  assert.match(html, /원정\/3루/);
  assert.match(html, /중앙\/테이블/);
  assert.match(html, /외야/);
  assert.match(html, /휠체어석/);
  assert.match(html, /목적을 선택하거나 블록을 검색하세요/);
  assert.match(html, /SSG 랜더스 공식 티켓 안내 2026 좌석도/);
  assert.match(html, /incheon-ssg-seatmap-official-2026\.webp/);
  assert.doesNotMatch(html, /data-testid="incheon-official-seatmap-required"/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});
