import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePredictionResultLabel } from './predictionResultLabel';

test('resolvePredictionResultLabel은 진행중 경기 점수 우위만으로 승리 라벨을 표시하지 않는다', () => {
  const label = resolvePredictionResultLabel({
    statusCode: 'LIVE',
    awayScore: 5,
    homeScore: 2,
    awayTeamName: '한화',
    homeTeamName: 'SSG',
  });

  assert.equal(label, '');
});

test('resolvePredictionResultLabel은 경기 종료 후에만 승리 팀 라벨을 표시한다', () => {
  const awayWinLabel = resolvePredictionResultLabel({
    statusCode: 'COMPLETED',
    awayScore: 5,
    homeScore: 2,
    awayTeamName: '한화',
    homeTeamName: 'SSG',
  });
  const homeWinLabel = resolvePredictionResultLabel({
    statusCode: 'COMPLETED',
    awayScore: 1,
    homeScore: 4,
    awayTeamName: '한화',
    homeTeamName: 'SSG',
  });

  assert.equal(awayWinLabel, '한화 승');
  assert.equal(homeWinLabel, 'SSG 승');
});

test('resolvePredictionResultLabel은 종료된 동점 경기를 무승부로 표시한다', () => {
  const label = resolvePredictionResultLabel({
    statusCode: 'DRAW',
    awayScore: 3,
    homeScore: 3,
    awayTeamName: '한화',
    homeTeamName: 'SSG',
  });

  assert.equal(label, '무승부');
});
