import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { Game } from '../../types/prediction';
import PredictionMatchTab from './PredictionMatchTab';

const noop = () => {};
const noopVote = () => {};

const currentGame: Game = {
  gameId: 'NAV-GAME-1',
  gameDate: '2026-03-07',
  awayTeam: 'LG',
  homeTeam: 'OB',
  stadium: '잠실',
  startTime: '18:30',
  gameStatus: 'SCHEDULED',
};

test('PredictionMatchTab does not render detached detail navigation actions', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchTab, {
    currentDateGames: [currentGame],
    currentDate: '2026-03-07',
    currentGame,
    currentGameId: currentGame.gameId,
    currentGameDetail: null,
    currentGameDetailLoading: false,
    currentGameDetailRefreshing: false,
    currentGameDetailError: null,
    currentGameDetailErrorCode: null,
    userVote: {},
    currentUserVoteResolutionState: 'resolved',
    votes: {},
    isLoggedIn: false,
    isAuthLoading: false,
    shouldRenderMatchCard: true,
    isVoteActionLocked: false,
    predictionRecoveryPath: '/prediction/matches/NAV-GAME-1?date=2026-03-07',
    canMovePrevDate: false,
    canMoveNextDate: false,
    isDetailRetryLoading: false,
    nearestNavigationDate: null,
    isToday: false,
    onVote: noopVote,
    onPrevDate: noop,
    onNextDate: noop,
    onNearestNavigation: noop,
    reloadCurrentGameDetail: noop,
  }));

  assert.doesNotMatch(html, /data-testid="prediction-same-day-switcher"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-game-switch"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-nav-list"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-nav"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-nav-leaderboard"/);
  assert.doesNotMatch(html, /data-testid="prediction-detail-nav-schedule"/);
  assert.doesNotMatch(html, />목록</);
  assert.doesNotMatch(html, />랭킹</);
  assert.doesNotMatch(html, />일정</);
  assert.doesNotMatch(html, /href="\/schedule/);
});
