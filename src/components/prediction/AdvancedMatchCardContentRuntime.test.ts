import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as moduleApi from 'node:module';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AdvancedMatchCardSupplementaryRuntime from './AdvancedMatchCardSupplementaryRuntime';
import { shouldRenderPredictionCoachBriefing } from '../../utils/predictionCoachVisibility';
import { getPredictionManualDataUiState } from '../../utils/predictionManualDataCopy';
import type { AdvancedMatchCardContentRuntimeProps } from './AdvancedMatchCardContentRuntime';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/test-team-logo.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const {
  default: AdvancedMatchCardContentRuntime,
  shouldShowPredictionManualScoreboardState,
} = await import('./AdvancedMatchCardContentRuntime');

const readDetailLoadingSkeletonSource = () => readFileSync(
  new URL('./PredictionDetailLoadingSkeleton.tsx', import.meta.url),
  'utf-8'
);

const renderMatchCardContent = (
  overrides: Partial<AdvancedMatchCardContentRuntimeProps> = {},
) => renderToStaticMarkup(createElement(AdvancedMatchCardContentRuntime, {
  game: {
    gameId: '20260625LGKT0',
    gameDate: '2026-06-25',
    awayTeam: 'LG',
    homeTeam: 'KT',
    stadium: '수원',
    startTime: '18:30',
  },
  gameDetail: null,
  gameDetailLoading: false,
  gameDetailRefreshing: false,
  gameDetailError: null,
  gameDetailErrorCode: null,
  gameDetailActions: createElement('button', { type: 'button' }, '다시 시도'),
  coachBriefing: null,
  awayColor: '#c30452',
  homeColor: '#000000',
  awayTeamName: 'LG',
  homeTeamName: 'KT',
  awayPitcherName: '발표 전',
  homePitcherName: '발표 전',
  awayScoreForDisplay: '-',
  homeScoreForDisplay: '-',
  isDarkMode: false,
  isPostponedOrCancelled: false,
  isCancelledStatus: false,
  statusCode: 'SCHEDULED',
  shouldHideResultSections: false,
  isScoreboardLoading: false,
  inningRows: {},
  ...overrides,
}));

test('getPredictionManualDataUiState는 수동 야구 데이터 계약의 사용자 문구를 한 곳에서 제공한다', () => {
  const state = getPredictionManualDataUiState('MANUAL_BASEBALL_DATA_REQUIRED');

  assert.ok(state);
  assert.equal(state.code, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.match(state.summaryMessage, /임의로 채우지 않습니다/);
  assert.match(state.scoreboardMessage, /game_inning_scores 또는 game_events 데이터/);
  assert.match(state.coachMessage, /AI 코치 분석 캐시가 있으면/);
  assert.equal(getPredictionManualDataUiState('SERVER'), null);
});

test('shouldRenderPredictionCoachBriefing는 수동 데이터 상태를 코치 조회 차단 조건으로 보지 않는다', () => {
  assert.equal(shouldRenderPredictionCoachBriefing({
    gameDetailLoading: false,
    isPostponedOrCancelled: false,
    gameDetailErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
  }), true);
  assert.equal(shouldRenderPredictionCoachBriefing({
    gameDetailLoading: true,
    isPostponedOrCancelled: false,
    gameDetailErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
  }), false);
  assert.equal(shouldRenderPredictionCoachBriefing({
    gameDetailLoading: false,
    isPostponedOrCancelled: true,
    gameDetailErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
  }), false);
});

test('AdvancedMatchCardContentRuntime는 최초 상세 로딩을 카드 내부 skeleton으로 표시한다', () => {
  const html = renderMatchCardContent({
    gameDetailLoading: true,
    gameDetail: null,
    gameDetailError: null,
    isScoreboardLoading: true,
  });

  assert.match(html, /data-testid="prediction-detail-loading-skeleton"/);
  assert.match(html, /data-testid="prediction-detail-refresh-indicator"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-error-banner"/);
  assert.doesNotMatch(html, /경기 정보를 불러오는 중입니다/);
  assert.doesNotMatch(html, /상세 데이터를 준비 중입니다/);
});

test('PredictionDetailLoadingSkeleton는 상세 영역 안의 최소 placeholder만 렌더링한다', () => {
  const source = readDetailLoadingSkeletonSource();

  assert.match(source, /data-testid="prediction-detail-loading-skeleton"/);
  assert.match(source, /min-h-\[/);
  assert.doesNotMatch(source, /상세 데이터를 준비 중입니다/);
  assert.doesNotMatch(source, /PredictionLoaderIcon/);
});

test('AdvancedMatchCardContentRuntime는 상세 갱신 중 기존 콘텐츠와 작은 갱신 표시를 함께 유지한다', () => {
  const html = renderMatchCardContent({
    gameDetail: {
      gameId: '20260625LGKT0',
      gameDate: '2026-06-25',
      awayTeam: 'LG',
      homeTeam: 'KT',
      stadium: '수원',
      startTime: '18:30',
      homePitcher: '홈투수',
      awayPitcher: '원정투수',
    },
    gameDetailLoading: false,
    gameDetailRefreshing: true,
    isScoreboardLoading: false,
    awayPitcherName: '원정투수',
    homePitcherName: '홈투수',
  });

  assert.match(html, /data-testid="prediction-detail-refresh-indicator"/);
  assert.match(html, /선발 투수/);
  assert.match(html, /홈투수/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-loading-skeleton"/);
});

test('AdvancedMatchCardContentRuntime는 상세 에러 배너와 재시도 액션을 유지한다', () => {
  const html = renderMatchCardContent({
    gameDetailLoading: false,
    gameDetailError: '경기 상세를 불러오지 못했습니다.',
    gameDetailActions: createElement('button', { type: 'button' }, '다시 시도'),
  });

  assert.match(html, /data-testid="prediction-detail-error-banner"/);
  assert.match(html, /경기 상세를 불러오지 못했습니다/);
  assert.match(html, /다시 시도/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-loading-skeleton"/);
});

test('shouldShowPredictionManualScoreboardState는 LIVE 경기의 빈 스코어보드를 수동 데이터 필요 상태로 본다', () => {
  assert.equal(shouldShowPredictionManualScoreboardState({
    gameDetailErrorCode: null,
    liveStatusErrorCode: null,
    gameDetailLoading: false,
    shouldHideResultSections: false,
    inningRowCount: 0,
    statusCode: 'LIVE',
    awayScoreForDisplay: '-',
    homeScoreForDisplay: '-',
  }), true);

  assert.equal(shouldShowPredictionManualScoreboardState({
    gameDetailErrorCode: null,
    liveStatusErrorCode: null,
    gameDetailLoading: false,
    shouldHideResultSections: false,
    inningRowCount: 0,
    statusCode: 'SCHEDULED',
    awayScoreForDisplay: '-',
    homeScoreForDisplay: '-',
  }), false);

  assert.equal(shouldShowPredictionManualScoreboardState({
    gameDetailErrorCode: null,
    liveStatusErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    gameDetailLoading: false,
    shouldHideResultSections: false,
    inningRowCount: 0,
    statusCode: 'SCHEDULED',
    awayScoreForDisplay: '-',
    homeScoreForDisplay: '-',
  }), true);
});

test('AdvancedMatchCardContentRuntime는 투표 패널만 표시하고 중복 응원 현황을 렌더링하지 않는다', () => {
  const html = renderMatchCardContent({
    votePanel: createElement('section', { 'data-testid': 'prediction-vote-panel' }, '승리 팀 예측'),
  });

  const votePanelIndex = html.indexOf('data-testid="prediction-vote-panel"');

  assert.ok(votePanelIndex >= 0);
  assert.doesNotMatch(html, /응원 현황/);
  assert.doesNotMatch(html, /data-testid="cheering-gauge-caption"/);
});

test('AdvancedMatchCardSupplementaryRuntime는 주요 기록 결측을 일반 빈 상태와 구분한다', () => {
  const html = renderToStaticMarkup(createElement(AdvancedMatchCardSupplementaryRuntime, {
    awayColor: '#f37321',
    homeColor: '#041e42',
    timelineEntries: [],
    summaryGroups: {},
    inningRowCount: 0,
    shouldHideResultSections: false,
    gameDetailLoading: false,
    attendanceLabel: null,
    weatherLabel: null,
    gameTimeLabel: null,
    shouldShowMatchEnvironmentLoading: false,
    isDarkMode: false,
    isManualBaseballDataRequired: true,
  }));

  assert.match(html, /경기 주요 기록/);
  assert.match(html, /game_summary 데이터를 입력하면/);
  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /표시할 경기 상세 정보가 없습니다/);
});

test('AdvancedMatchCardSupplementaryRuntime는 원문 문자중계 playDescription을 표시한다', () => {
  const html = renderToStaticMarkup(createElement(AdvancedMatchCardSupplementaryRuntime, {
    awayColor: '#f37321',
    homeColor: '#041e42',
    timelineEntries: [],
    summaryGroups: {},
    inningRowCount: 0,
    shouldHideResultSections: false,
    gameDetailLoading: false,
    attendanceLabel: null,
    weatherLabel: null,
    gameTimeLabel: null,
    shouldShowMatchEnvironmentLoading: false,
    isDarkMode: false,
    liveEvents: [{
      relayId: 15,
      inning: 7,
      inningHalf: 'BOTTOM',
      pitcherName: '김투수',
      batterName: '김도영',
      playDescription: '김도영 : 좌익수 왼쪽 2루타',
      eventType: 'PLAY',
      result: '2루타',
      updatedAt: '2026-04-29T20:15:00',
    }],
  }));

  assert.match(html, /문자중계/);
  assert.match(html, /김도영 : 좌익수 왼쪽 2루타/);
  assert.match(html, /투수 김투수/);
  assert.doesNotMatch(html, /wpa/i);
  assert.doesNotMatch(html, /winExpectancy/i);
});

test('AdvancedMatchCardSupplementaryRuntime는 문자중계 manual 상태를 score polling과 구분해 표시한다', () => {
  const html = renderToStaticMarkup(createElement(AdvancedMatchCardSupplementaryRuntime, {
    awayColor: '#f37321',
    homeColor: '#041e42',
    timelineEntries: [],
    summaryGroups: {},
    inningRowCount: 2,
    shouldHideResultSections: false,
    gameDetailLoading: false,
    attendanceLabel: null,
    weatherLabel: null,
    gameTimeLabel: null,
    shouldShowMatchEnvironmentLoading: false,
    isDarkMode: false,
    liveEvents: [],
    liveRelayError: '문자중계 데이터 준비가 필요합니다.',
    liveRelayErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
  }));

  assert.match(html, /문자중계 데이터 준비가 필요합니다/);
  assert.match(html, /score\/inning polling은 계속 진행됩니다/);
  assert.match(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
});
