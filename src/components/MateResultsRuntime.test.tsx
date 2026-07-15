import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Party } from '../types/mate';
import MateResultsRuntime from './MateResultsRuntime';

const noop = () => undefined;

type MateResultsRuntimeProps = ComponentProps<typeof MateResultsRuntime>;

const baseProps: MateResultsRuntimeProps = {
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
};

const renderMateResults = (overrides: Partial<MateResultsRuntimeProps> = {}) => (
  renderToStaticMarkup(createElement(MateResultsRuntime, {
    ...baseProps,
    ...overrides,
  }))
);

const createParty = (): Party => ({
  id: 7,
  hostId: 1,
  hostHandle: '@host',
  hostName: '호스트',
  hostBadge: 'TRUSTED',
  hostAverageRating: 4.8,
  hostReviewCount: 3,
  teamId: 'LG',
  cheeringSide: 'HOME',
  gameDate: '2026-03-28',
  gameTime: '18:30',
  stadium: '잠실',
  homeTeam: 'LG',
  awayTeam: 'OB',
  section: '1루 내야',
  maxParticipants: 2,
  currentParticipants: 1,
  description: '같이 응원해요',
  ticketVerified: true,
  status: 'PENDING',
  reservationDepositAmount: null,
  hostTrustMetrics: null,
  createdAt: '2026-03-01T00:00:00',
});

const getButtonMarkup = (html: string, label: string): string => {
  const match = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .find(([buttonMarkup]) => buttonMarkup.includes(label));
  assert.ok(match, `Expected button labeled ${label}`);
  return match[0];
};

test('MateResultsRuntime empty state shows product copy and create CTA', () => {
  const html = renderMateResults();

  assert.match(html, /data-testid="mate-empty-state"/);
  assert.match(html, /아직 개설된 파티가 없습니다/);
  assert.match(html, /원하는 경기와 좌석 조건으로 첫 번째 직관 메이트를 모집해보세요/);
  assert.match(html, /data-testid="mate-empty-create-cta"/);
  assert.match(html, /파티 만들기/);
});

test('MateResultsRuntime loading state exposes a polite status without empty or error content', () => {
  const html = renderMateResults({ isLoading: true });

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="메이트 파티 목록 불러오는 중"/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.doesNotMatch(html, /data-testid="mate-empty-state"/);
});

test('MateResultsRuntime fetch error exposes recovery guidance without empty content', () => {
  const html = renderMateResults({ fetchError: true });

  assert.match(html, /role="alert"/);
  assert.match(html, /파티 목록을 불러오지 못했습니다/);
  assert.match(getButtonMarkup(html, '다시 시도'), /type="button"/);
  assert.doesNotMatch(html, /data-testid="mate-empty-state"/);
});

test('MateResultsRuntime filtered empty state uses tab copy and reset CTA', () => {
  const html = renderMateResults({
    activeTab: 'matched',
    hasActiveFilters: true,
  });

  assert.match(html, /검색 조건에 맞는 매칭 성공 파티가 없습니다/);
  assert.match(getButtonMarkup(html, '필터 초기화'), /type="button"/);
  assert.doesNotMatch(html, /data-testid="mate-empty-create-cta"/);
});

test('MateResultsRuntime pagination disables only the unavailable boundary action', () => {
  const firstPageHtml = renderMateResults({
    parties: [createParty()],
    totalPages: 3,
    queryPage: 0,
  });
  const lastPageHtml = renderMateResults({
    parties: [createParty()],
    totalPages: 3,
    queryPage: 2,
  });

  assert.match(firstPageHtml, /1 \/ 3/);
  assert.match(getButtonMarkup(firstPageHtml, '이전'), /disabled=""/);
  assert.doesNotMatch(getButtonMarkup(firstPageHtml, '다음'), /disabled=""/);

  assert.match(lastPageHtml, /3 \/ 3/);
  assert.doesNotMatch(getButtonMarkup(lastPageHtml, '이전'), /disabled=""/);
  assert.match(getButtonMarkup(lastPageHtml, '다음'), /disabled=""/);
});
