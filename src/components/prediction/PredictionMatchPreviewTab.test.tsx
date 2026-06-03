import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Game } from '../../types/prediction';
import {
  buildPredictionScheduleDateRail,
  buildPredictionScheduleRowViewModel,
  resolvePredictionScheduleStatus,
  resolvePredictionScheduleMonthDate,
} from '../../utils/predictionSchedulePreviewModel';
import PredictionMatchPreviewTab from './PredictionMatchPreviewTab';

const noop = () => {};
const noopGame = () => {};

const firstGame: Game = {
  gameId: 'PREVIEW-1',
  gameDate: '2099-05-01',
  awayTeam: 'KIA',
  homeTeam: 'NC',
  stadium: '창원',
  startTime: '18:30:00',
  gameStatus: 'SCHEDULED',
  awayPitcher: {
    name: '이의리',
  },
  homePitcher: {
    name: '구창모',
  },
};

const secondGame: Game = {
  gameId: 'PREVIEW-2',
  gameDate: '2099-05-01',
  awayTeam: 'LG',
  homeTeam: 'KT',
  stadium: '수원',
  startTime: '18:30:00',
  gameStatus: 'SCHEDULED',
  awayPitcher: {
    name: '이정용',
  },
  homePitcher: {
    name: '소형준',
  },
};

const renderPreview = (games: Game[], currentDate = '2099-05-01') => renderToStaticMarkup(createElement(PredictionMatchPreviewTab, {
  currentDateGames: games,
  currentDate,
  nearestNavigationDate: null,
  isToday: false,
  onEnterMatchDetail: noopGame,
  onGoToDate: noop,
  onNearestNavigation: noop,
}));

test('PredictionMatchPreviewTab는 선택 날짜의 모든 경기 행을 일정 리스트로 보여준다', () => {
  const html = renderPreview([firstGame, secondGame]);

  assert.match(html, /2099\.05/);
  assert.match(html, /KBO리그/);
  assert.match(html, /KIA[\s\S]*예정[\s\S]*NC[\s\S]*전력/);
  assert.match(html, /LG[\s\S]*예정[\s\S]*KT[\s\S]*전력/);
  assert.match(html, /창원/);
  assert.match(html, /수원/);
  assert.match(html, /이의리/);
  assert.match(html, /구창모/);
  assert.match(html, /이정용/);
  assert.match(html, /소형준/);
  assert.equal((html.match(/prediction-schedule-match-row/g) || []).length, 2);
  assert.equal((html.match(/prediction-match-enter-detail-btn/g) || []).length, 2);
  assert.doesNotMatch(html, /경기 상세 보기/);
  assert.doesNotMatch(html, /응원/);
});

test('PredictionMatchPreviewTab는 선발 누락과 불가 상태를 일정 행 안에서 처리한다', () => {
  const html = renderPreview([
    {
      ...firstGame,
      gameId: 'PREVIEW-FALLBACK',
      awayPitcher: undefined,
      homePitcher: undefined,
    },
    {
      ...secondGame,
      gameId: 'PREVIEW-POSTPONED',
      gameStatus: 'POSTPONED',
    },
    {
      ...firstGame,
      gameId: 'PREVIEW-CANCELLED',
      awayTeam: 'SSG',
      homeTeam: 'HH',
      gameStatus: 'CANCELLED',
    },
  ]);

  assert.match(html, /발표 전/);
  assert.match(html, /연기/);
  assert.match(html, /취소/);
  assert.equal((html.match(/prediction-match-enter-detail-btn/g) || []).length, 1);
});

test('buildPredictionScheduleDateRail은 월 경계 안에서 13일 날짜 레일을 만든다', () => {
  const monthStart = buildPredictionScheduleDateRail('2099-05-01');
  assert.equal(monthStart.length, 13);
  assert.equal(monthStart[0]?.date, '2099-05-01');
  assert.equal(monthStart[12]?.date, '2099-05-13');
  assert.equal(monthStart[0]?.isSelected, true);

  const monthMiddle = buildPredictionScheduleDateRail('2099-05-15');
  assert.equal(monthMiddle[0]?.date, '2099-05-09');
  assert.equal(monthMiddle[12]?.date, '2099-05-21');

  const monthEnd = buildPredictionScheduleDateRail('2099-05-31');
  assert.equal(monthEnd[0]?.date, '2099-05-19');
  assert.equal(monthEnd[12]?.date, '2099-05-31');

  const leapYearFebruaryEnd = buildPredictionScheduleDateRail('2028-02-29');
  assert.equal(leapYearFebruaryEnd.length, 13);
  assert.equal(leapYearFebruaryEnd[0]?.date, '2028-02-17');
  assert.equal(leapYearFebruaryEnd[12]?.date, '2028-02-29');
});

test('resolvePredictionScheduleMonthDate는 월 이동 시 말일을 보정한다', () => {
  assert.equal(resolvePredictionScheduleMonthDate('2026-03-31', -1), '2026-02-28');
  assert.equal(resolvePredictionScheduleMonthDate('2028-03-31', -1), '2028-02-29');
  assert.equal(resolvePredictionScheduleMonthDate('2026-01-31', 1), '2026-02-28');
});

test('buildPredictionScheduleRowViewModel은 행 표시 데이터를 같은 규칙으로 만든다', () => {
  const row = buildPredictionScheduleRowViewModel({
    ...firstGame,
    awayPitcher: null,
    homePitcher: undefined,
  }, '2099-05-01', new Date('2099-05-01T12:00:00'));

  assert.equal(row.startTimeLabel, '18:30');
  assert.equal(row.stadiumLabel, '창원 · NC파크');
  assert.equal(row.awayTeam.shortName, 'KIA');
  assert.equal(row.homeTeam.shortName, 'NC');
  assert.equal(row.awayTeam.pitcherName, '발표 전');
  assert.equal(row.homeTeam.pitcherName, '발표 전');
  assert.equal(row.status.label, '예정');
  assert.equal(row.status.tone, 'scheduled');
  assert.equal(row.status.hasScore, false);
  assert.equal(row.canEnterDetail, true);
});

test('resolvePredictionScheduleStatus는 스코어와 불가 상태를 preview 규칙으로 정규화한다', () => {
  const completedStatus = resolvePredictionScheduleStatus({
    ...firstGame,
    gameStatus: 'FINAL',
    awayScore: 4,
    homeScore: 3,
  }, '2099-05-01', new Date('2099-05-01T22:00:00'));

  assert.equal(completedStatus.label, '종료');
  assert.equal(completedStatus.tone, 'closed');
  assert.equal(completedStatus.hasScore, true);
  assert.equal(completedStatus.scoreLabel, '4 : 3');

  const postponedRow = buildPredictionScheduleRowViewModel({
    ...secondGame,
    gameStatus: 'POSTPONED',
  }, '2099-05-01', new Date('2099-05-01T12:00:00'));

  assert.equal(postponedRow.status.label, '연기');
  assert.equal(postponedRow.status.tone, 'unavailable');
  assert.equal(postponedRow.canEnterDetail, false);
});
