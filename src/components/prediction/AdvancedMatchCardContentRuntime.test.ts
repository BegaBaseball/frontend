import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AdvancedMatchCardSupplementaryRuntime from './AdvancedMatchCardSupplementaryRuntime';
import { shouldRenderPredictionCoachBriefing } from '../../utils/predictionCoachVisibility';
import { getPredictionManualDataUiState } from '../../utils/predictionManualDataCopy';

test('getPredictionManualDataUiState는 수동 야구 데이터 계약의 사용자 문구를 한 곳에서 제공한다', () => {
  const state = getPredictionManualDataUiState('MANUAL_BASEBALL_DATA_REQUIRED');

  assert.ok(state);
  assert.equal(state.code, 'MANUAL_BASEBALL_DATA_REQUIRED');
  assert.match(state.summaryMessage, /임의로 채우지 않습니다/);
  assert.match(state.scoreboardMessage, /최종 스코어만 표시 중입니다/);
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
