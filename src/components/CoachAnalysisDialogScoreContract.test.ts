import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const coachBriefingSource = readSource('./CoachBriefing.tsx');
const coachBriefingContentSource = readSource('./CoachBriefingContentCardRuntime.tsx');
const dialogSource = readSource('./CoachAnalysisDialog.tsx');
const dialogRuntimeSource = readSource('./CoachAnalysisDialogRuntime.tsx');
const resultRuntimeSource = readSource('./CoachAnalysisDialogResultRuntime.tsx');

test('CoachBriefing은 gameDetail 점수를 우선해 AI Coach 리뷰 다이얼로그로 전달한다', () => {
  assert.match(coachBriefingSource, /homeScore=\{gameDetail\?\.homeScore \?\? game\?\.homeScore \?\? null\}/);
  assert.match(coachBriefingSource, /awayScore=\{gameDetail\?\.awayScore \?\? game\?\.awayScore \?\? null\}/);
  assert.match(coachBriefingContentSource, /homeScore\?: number \| string \| null;/);
  assert.match(coachBriefingContentSource, /awayScore\?: number \| string \| null;/);
  assert.match(coachBriefingContentSource, /homeScore=\{homeScore\}/);
  assert.match(coachBriefingContentSource, /awayScore=\{awayScore\}/);
});

test('AI Coach 다이얼로그 런타임은 점수를 분석 요청 payload가 아닌 결과 뷰 prop으로만 전달한다', () => {
  assert.match(dialogSource, /homeScore\?: number \| string \| null;/);
  assert.match(dialogSource, /awayScore\?: number \| string \| null;/);
  assert.match(dialogRuntimeSource, /homeScore\?: number \| string \| null;/);
  assert.match(dialogRuntimeSource, /awayScore\?: number \| string \| null;/);
  assert.match(dialogRuntimeSource, /homeScore=\{homeScore\}/);
  assert.match(dialogRuntimeSource, /awayScore=\{awayScore\}/);
  assert.doesNotMatch(dialogRuntimeSource, /home_score/);
  assert.doesNotMatch(dialogRuntimeSource, /away_score/);
});

test('CoachAnalysisDialogResultRuntime은 점수를 CoachAnalysisResultView로 전달한다', () => {
  assert.match(resultRuntimeSource, /homeScore\?: number \| string \| null;/);
  assert.match(resultRuntimeSource, /awayScore\?: number \| string \| null;/);
  assert.match(resultRuntimeSource, /homeScore=\{homeScore\}/);
  assert.match(resultRuntimeSource, /awayScore=\{awayScore\}/);
});

test('CoachAnalysisDialogResultRuntime은 백엔드 승률을 우선하고 초기 승률을 fallback으로 전달한다', () => {
  assert.match(resultRuntimeSource, /initialWinProbabilityHome\?: number \| null;/);
  assert.match(
    resultRuntimeSource,
    /winProbabilityHome=\{result\?\.win_probability_home \?\? initialWinProbabilityHome \?\? null\}/,
  );
});

test('CoachBriefing은 자동 브리핑 승률이 없어도 기존 경기 승률을 fallback으로 넘긴다', () => {
  assert.match(
    coachBriefingSource,
    /winProbabilityHome=\{briefingMeta\?\.winProbabilityHome \?\? game\?\.winProbability\?\.home \?\? null\}/,
  );
});

test('AI Coach 상세 다이얼로그는 경기 카드의 양 팀 순위를 결과 뷰까지 전달한다', () => {
  assert.match(coachBriefingSource, /homeRank=\{seasonContext\?\.home\?\.rank \?\? null\}/);
  assert.match(coachBriefingSource, /awayRank=\{seasonContext\?\.away\?\.rank \?\? null\}/);
  assert.match(coachBriefingContentSource, /homeRank\?: number \| null;/);
  assert.match(coachBriefingContentSource, /awayRank\?: number \| null;/);
  assert.match(coachBriefingContentSource, /initialHomeRank=\{homeRank\}/);
  assert.match(coachBriefingContentSource, /initialAwayRank=\{awayRank\}/);
  assert.match(dialogSource, /initialHomeRank\?: number \| null;/);
  assert.match(dialogSource, /initialAwayRank\?: number \| null;/);
  assert.match(dialogRuntimeSource, /initialHomeRank\?: number \| null;/);
  assert.match(dialogRuntimeSource, /initialAwayRank\?: number \| null;/);
  assert.match(dialogRuntimeSource, /initialHomeRank=\{initialHomeRank\}/);
  assert.match(dialogRuntimeSource, /initialAwayRank=\{initialAwayRank\}/);
  assert.match(resultRuntimeSource, /initialHomeRank\?: number \| null;/);
  assert.match(resultRuntimeSource, /initialAwayRank\?: number \| null;/);
  assert.match(resultRuntimeSource, /homeRank=\{initialHomeRank\}/);
  assert.match(resultRuntimeSource, /awayRank=\{initialAwayRank\}/);
});
