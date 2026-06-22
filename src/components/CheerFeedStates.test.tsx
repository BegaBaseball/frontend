import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CheerFeedEmptyState, CheerFeedLoadingSkeleton } from './CheerFeedStates';

test('CheerFeedLoadingSkeleton은 응원글 로딩 상태를 제품 문구와 skeleton row로 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(CheerFeedLoadingSkeleton));

  assert.match(html, /data-testid="cheer-feed-skeleton"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /응원글을 불러오는 중/);
  assert.equal(html.match(/data-testid="cheer-feed-skeleton-row"/g)?.length, 3);
});

test('CheerFeedEmptyState는 빈 전체 피드에서 작성 CTA를 렌더링한다', () => {
  const html = renderToStaticMarkup(createElement(CheerFeedEmptyState, {
    feedTab: 'all',
    teamColor: '#16a34a',
    onWriteClick: () => {},
  }));

  assert.match(html, /data-testid="cheer-feed-empty-state"/);
  assert.match(html, /아직 작성된 응원글이 없습니다/);
  assert.match(html, /첫 번째 응원글을 남겨보세요/);
  assert.match(html, /data-testid="cheer-feed-empty-write"/);
  assert.match(html, /첫 글 작성하기/);
});

test('CheerFeedEmptyState는 팔로잉 빈 상태에서 작성 CTA를 숨긴다', () => {
  const html = renderToStaticMarkup(createElement(CheerFeedEmptyState, {
    feedTab: 'following',
    teamColor: '#16a34a',
    onWriteClick: () => {},
  }));

  assert.match(html, /data-testid="cheer-feed-empty-state"/);
  assert.match(html, /팔로우한 유저가 없습니다/);
  assert.match(html, /다른 유저를 팔로우하면 여기에 글이 표시됩니다/);
  assert.doesNotMatch(html, /cheer-feed-empty-write/);
});
