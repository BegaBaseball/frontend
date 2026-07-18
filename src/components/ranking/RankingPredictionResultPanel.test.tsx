import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { SavedPredictionResponse } from '../../types/ranking';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/test-team-logo.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const { default: RankingPredictionResultPanel } = await import('./RankingPredictionResultPanel');

const buildResult = (overrides: Partial<SavedPredictionResponse> = {}): SavedPredictionResponse => ({
  id: 1,
  shareId: null,
  seasonYear: 2026,
  teamIdsInOrder: ['LG', 'SS'],
  teamDetails: [
    { teamId: 'LG', teamName: 'LG', currentRank: 1, lastSeasonRank: 2 },
    { teamId: 'SS', teamName: '삼성', currentRank: 3, lastSeasonRank: 1 },
  ],
  createdAt: '2025-11-01T00:00:00',
  exactMatchCount: 1,
  settledAt: '2026-11-01T01:00:00',
  ...overrides,
});

test('정확히 맞춘 팀은 체크 아이콘, 틀린 팀은 실제 순위를 보여준다', () => {
  const html = renderToStaticMarkup(createElement(RankingPredictionResultPanel, {
    result: buildResult(),
  }));

  assert.match(html, /2026 시즌 결과/);
  assert.match(html, /2개 중 1개 적중/);
  assert.match(html, /aria-label="정확히 적중"/);
  assert.match(html, /실제 3위/);
});

test('teamDetails가 비어 있어도 렌더링이 깨지지 않는다', () => {
  const html = renderToStaticMarkup(createElement(RankingPredictionResultPanel, {
    result: buildResult({ teamDetails: [], exactMatchCount: 0 }),
  }));

  assert.match(html, /0개 중 0개 적중/);
});
