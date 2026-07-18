import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getInitialPredictionTab,
  getPredictionOtherGamesLinkState,
  getPredictionTabActivationState,
  preloadPredictionRankingTabResources,
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

test('PredictionRuntime는 ranking 탭 청크를 post-paint idle에 선로딩한다', () => {
  const source = readRuntimeSource();

  assert.match(
    source,
    /import \{ schedulePredictionPostPaintIdleWork \} from '\.\.\/\.\.\/utils\/predictionDeferredWork';/
  );
  assert.match(source, /const loadPredictionRankingTab = \(\) => import\('\.\/PredictionRankingTab'\);/);
  assert.match(source, /const loadPredictionAnimatedSections = \(\) => import\('\.\.\/PredictionAnimatedSections'\);/);
  assert.match(source, /const loadRankingPrediction = \(\) => import\('\.\.\/RankingPrediction'\);/);
  assert.match(source, /const loadPredictionStatsPanel = \(\) => import\('\.\/PredictionStatsPanel'\);/);
  assert.match(source, /schedulePredictionPostPaintIdleWork\(\(\) => \{\s*preloadPredictionRankingTabResources\(isLoggedIn\);/);
});

test('PredictionRuntime는 탭 표시 후 다음 paint에서 ranking 콘텐츠 렌더를 시작한다', () => {
  const source = readRuntimeSource();
  const handler = source.match(
    /const handleTabChange = \(nextTab: 'match' \| 'ranking'\) => \{[\s\S]*?\n  \};/
  );

  assert.ok(handler);
  assert.match(source, /import \{ lazy, Suspense, startTransition, useEffect, useState \} from 'react';/);
  assert.match(source, /scheduleAfterNextPaint/);
  assert.match(source, /const \[contentTab, setContentTab\] = useState<'match' \| 'ranking'>\('match'\);/);
  assert.match(handler[0], /setActiveTab\(nextTab\);/);
  assert.doesNotMatch(handler[0], /startTransition/);
  assert.doesNotMatch(handler[0], /preloadPredictionRankingTabResources/);
  assert.match(
    source,
    /scheduleAfterNextPaint\(\(\) => \{\s*startTransition\(\(\) => \{\s*setContentTab\(activeTab\);/
  );
  assert.doesNotMatch(source, /onPointerEnter=\{/);
  assert.doesNotMatch(source, /onFocus=\{/);
});

test('preloadPredictionRankingTabResources는 호출 가능한 public preload contract를 유지한다', () => {
  assert.equal(typeof preloadPredictionRankingTabResources, 'function');
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

test('getInitialPredictionTab은 ?tab=ranking이면 ranking 탭으로 진입한다', () => {
  assert.equal(getInitialPredictionTab('ranking'), 'ranking');
});

test('getInitialPredictionTab은 tab 파라미터가 없거나 알 수 없으면 match 탭으로 진입한다', () => {
  assert.equal(getInitialPredictionTab(null), 'match');
  assert.equal(getInitialPredictionTab('unknown'), 'match');
});
