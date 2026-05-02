import assert from 'node:assert/strict';
import test from 'node:test';

import { filterDisplayableGameSummaries, isJsonObjectOrArrayString } from './predictionSummary';
import type { GameSummary } from '../types/prediction';

test('filterDisplayableGameSummaries excludes structured internal summary types', () => {
  const summaries: GameSummary[] = [
    { type: '결승타', playerName: '김태연', detail: '5회말 결승타' },
    { type: '리뷰_WPA', playerName: '기록', detail: '{"game_id":"20260419HHLT0"}' },
    { type: ' 프리뷰 ', playerName: '기록', detail: '{"game_id":"20260419HHLT0"}' },
  ];

  assert.deepEqual(filterDisplayableGameSummaries(summaries), [
    { type: '결승타', playerName: '김태연', detail: '5회말 결승타' },
  ]);
});

test('filterDisplayableGameSummaries excludes JSON object and array detail strings', () => {
  const summaries: GameSummary[] = [
    { type: '기타', playerName: '기록', detail: '{"game_id":"20260419HHLT0"}' },
    { type: '기타', playerName: '기록', detail: '[{"inning":"5회말"}]' },
    { type: '심판', playerName: '문승훈', detail: '주심 문승훈' },
  ];

  assert.deepEqual(filterDisplayableGameSummaries(summaries), [
    { type: '심판', playerName: '문승훈', detail: '주심 문승훈' },
  ]);
});

test('filterDisplayableGameSummaries keeps regular text and invalid JSON-like text', () => {
  const summaries: GameSummary[] = [
    { type: '홈런', playerName: '레이예스', detail: '3회말 우월 홈런' },
    { type: '기타', playerName: '기록', detail: '{"game_id":' },
  ];

  assert.deepEqual(filterDisplayableGameSummaries(summaries), summaries);
});

test('filterDisplayableGameSummaries excludes rows that would need synthetic labels', () => {
  const summaries: GameSummary[] = [
    { type: null, playerName: '기록', detail: '타자 기록' },
    { type: '  ', playerName: '기록', detail: '타자 기록' },
    { type: '기타', playerName: '', detail: '   ' },
    { type: '홈런', playerName: '레이예스', detail: '3회말 우월 홈런' },
  ];

  assert.deepEqual(filterDisplayableGameSummaries(summaries), [
    { type: '홈런', playerName: '레이예스', detail: '3회말 우월 홈런' },
  ]);
});

test('isJsonObjectOrArrayString only treats parsed objects and arrays as structured detail', () => {
  assert.equal(isJsonObjectOrArrayString('{"game_id":"20260419HHLT0"}'), true);
  assert.equal(isJsonObjectOrArrayString('[{"inning":"5회말"}]'), true);
  assert.equal(isJsonObjectOrArrayString('"plain string"'), false);
  assert.equal(isJsonObjectOrArrayString('5'), false);
  assert.equal(isJsonObjectOrArrayString('{not-json}'), false);
});
