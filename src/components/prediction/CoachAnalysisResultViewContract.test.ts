import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const resultViewSource = readSource('./CoachAnalysisResultView.tsx');
const outcomeSource = readSource('../../utils/coachReviewOutcome.ts');

test('CoachAnalysisResultView는 완료 경기 점수 outcome을 큰 승률 영역에 우선 표시한다', () => {
  assert.match(resultViewSource, /resolveCoachReviewOutcome/);
  assert.match(resultViewSource, /gameStatusBucket: analysisData\.game_status_bucket/);
  assert.match(resultViewSource, /homeScore,\s*\n\s*awayScore,/);
  assert.match(resultViewSource, /getCoachReviewOutcomeLabel\(outcome\)/);
  assert.match(resultViewSource, /outcome \? getCoachReviewOutcomeLabel\(outcome\) : \(pct === null \? '--' : pct\)/);
  assert.match(resultViewSource, /!outcome && pct !== null/);
});

test('CoachAnalysisResultView는 완료 경기에서도 예측 승률 숫자를 보조 정보로 노출한다', () => {
  assert.match(resultViewSource, /outcome && pct !== null/);
  assert.match(resultViewSource, /예측 승률/);
});

test('CoachAnalysisResultView 사이드바는 데이터 부족 문구 대신 현재 순위를 표시한다', () => {
  assert.match(resultViewSource, /현재 순위/);
  assert.match(resultViewSource, /homeRank\?: number \| null;/);
  assert.match(resultViewSource, /awayRank\?: number \| null;/);
  assert.match(resultViewSource, /\{homeName\} 순위/);
  assert.match(resultViewSource, /\{awayName\} 순위/);
  assert.doesNotMatch(resultViewSource, /generationMode === 'evidence_fallback'/);
  assert.doesNotMatch(resultViewSource, /근거가 제한적이라 보수적으로 요약했습니다/);
  assert.doesNotMatch(resultViewSource, />데이터<\/span>/);
  assert.match(resultViewSource, /분석에 반영한 정보/);
  assert.match(resultViewSource, />갱신<\/span>/);
});

test('coachReviewOutcome은 승 패 무 라벨과 완료 상태 버킷을 명시한다', () => {
  assert.match(outcomeSource, /'COMPLETED'/);
  assert.match(outcomeSource, /'FINAL'/);
  assert.match(outcomeSource, /'DRAW'/);
  assert.match(outcomeSource, /if \(outcome === 'win'\) return '승';/);
  assert.match(outcomeSource, /if \(outcome === 'loss'\) return '패';/);
  assert.match(outcomeSource, /return '무';/);
});
