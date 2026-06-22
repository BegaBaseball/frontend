import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MateResultsRuntime from './MateResultsRuntime';

const noop = () => undefined;

test('MateResultsRuntime empty state shows product copy and create CTA', () => {
  const html = renderToStaticMarkup(createElement(MateResultsRuntime, {
    parties: [],
    totalPages: 0,
    queryPage: 0,
    activeTab: 'all',
    authUserId: 123,
    isLoading: false,
    fetchError: false,
    hasActiveFilters: false,
    onRetry: noop,
    onResetFilters: noop,
    onCreateParty: noop,
    onPartyClick: noop,
    onPageChange: noop,
  }));

  assert.match(html, /data-testid="mate-empty-state"/);
  assert.match(html, /아직 개설된 파티가 없습니다/);
  assert.match(html, /원하는 경기와 좌석 조건으로 첫 번째 직관 메이트를 모집해보세요/);
  assert.match(html, /data-testid="mate-empty-create-cta"/);
  assert.match(html, /파티 만들기/);
});
