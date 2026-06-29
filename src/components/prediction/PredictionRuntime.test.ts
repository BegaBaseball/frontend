import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getPredictionOtherGamesLinkState,
  getPredictionTabActivationState,
} from './PredictionRuntime';

const readRuntimeSource = () => readFileSync(
  new URL('./PredictionRuntime.tsx', import.meta.url),
  'utf-8'
);

test('getPredictionTabActivationState는 ranking 탭 진입 시 즉시 ranking feature를 활성화한다', () => {
  const nextState = getPredictionTabActivationState('ranking', false, false);

  assert.deepEqual(nextState, {
    hasVisitedRankingTab: true,
    rankingFeatureReady: true,
  });
});

test('getPredictionTabActivationState는 match 탭 복귀 시에도 ranking warm state를 유지한다', () => {
  const nextState = getPredictionTabActivationState('match', true, true);

  assert.deepEqual(nextState, {
    hasVisitedRankingTab: true,
    rankingFeatureReady: true,
  });
});

test('PredictionRuntime는 prediction 전용 우측 상단 toast 영역을 렌더링한다', () => {
  const source = readRuntimeSource();

  assert.match(source, /import \{ Toaster \} from '\.\.\/ui\/sonner';/);
  assert.match(source, /<Toaster position="top-right" \/>/);
});

test('getPredictionOtherGamesLinkState는 상세 날짜로 경기 목록 링크를 만든다', () => {
  assert.deepEqual(getPredictionOtherGamesLinkState('2026-06-27'), {
    date: '2026-06-27',
    path: '/prediction?date=2026-06-27',
  });
});

test('getPredictionOtherGamesLinkState는 date가 비어 있으면 기본 경기 목록으로 이동한다', () => {
  assert.deepEqual(getPredictionOtherGamesLinkState('  '), {
    date: '',
    path: '/prediction',
  });
});
