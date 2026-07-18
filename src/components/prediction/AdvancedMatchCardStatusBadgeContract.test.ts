import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readOptionalSource = (path: string) => {
  try {
    return readFileSync(new URL(path, import.meta.url), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    return '';
  }
};

const advancedMatchCardSource = readOptionalSource('./AdvancedMatchCard.tsx');
const advancedMatchCardContentRuntimeSource = readOptionalSource('./AdvancedMatchCardContentRuntime.tsx');
const predictionVotePanelSource = readOptionalSource('./PredictionVotePanel.tsx');
const predictionRuntimeSource = readOptionalSource('./PredictionRuntime.tsx');

test('AdvancedMatchCard는 공용 StatusBadge 메타로 경기 상태 배지를 렌더링한다', () => {
  assert.match(advancedMatchCardSource, /import \{ StatusBadge \} from '\.\.\/ui\/status-badge';/);
  assert.match(advancedMatchCardSource, /import \{ getGameStatusBadgeMeta \} from '\.\.\/\.\.\/utils\/statusBadgeMeta';/);
  assert.match(advancedMatchCardSource, /<StatusBadge\s+data-testid="prediction-status-badge"/);
  assert.match(advancedMatchCardSource, /\{\.\.\.getGameStatusBadgeMeta\(statusCode, scheduledStateLabel\)\}/);
  assert.match(advancedMatchCardSource, /className={`absolute top-0 backdrop-blur \${isScheduledLayout \? 'text-sky-700 dark:text-sky-300' : ''}`}/);
  assert.doesNotMatch(advancedMatchCardSource, /PredictionWarningTriangleIcon/);
});

test('AdvancedMatchCard는 투표 패널을 독립 컴포넌트로 렌더링한다', () => {
  assert.match(advancedMatchCardSource, /const PredictionVotePanel = lazy\(\(\) => import\('\.\/PredictionVotePanel'\)\);/);
  assert.match(advancedMatchCardSource, /<PredictionVotePanel\s+[\s\S]*userVote=\{userVote\}[\s\S]*votePercentages=\{votePercentages\}[\s\S]*isDarkMode=\{isDarkMode\}[\s\S]*onVote=\{onVote\}/);
  assert.match(advancedMatchCardSource, /votePanel,\s*\n\s*awayColor/);
  assert.match(advancedMatchCardContentRuntimeSource, /votePanel\?: ReactNode/);
  assert.match(advancedMatchCardContentRuntimeSource, /\{votePanel\}/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /VotePercentageGauge/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /cheering-gauge-caption/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /응원 현황/);
});

test('예측 런타임은 탭 왼쪽에 해당 날짜 경기 목록 조회 버튼을 제공한다', () => {
  assert.match(predictionRuntimeSource, /import \{ Link, useSearchParams \} from 'react-router-dom';/);
  assert.match(predictionRuntimeSource, /import \{ buildPredictionListPath \} from '\.\.\/\.\.\/utils\/predictionDeepLink';/);
  assert.match(predictionRuntimeSource, /export function getPredictionOtherGamesLinkState\(dateParam: string \| null\)/);
  assert.match(predictionRuntimeSource, /const date = dateParam\?\.trim\(\) \|\| '';/);
  assert.match(predictionRuntimeSource, /path: buildPredictionListPath\(\{ date \}\)/);
  assert.match(predictionRuntimeSource, /const \{ date: otherGamesDate, path: otherGamesPath \} = getPredictionOtherGamesLinkState\(/);
  assert.match(predictionRuntimeSource, /searchParams\.get\('date'\)/);
  assert.match(predictionRuntimeSource, /data-testid="prediction-other-games-link"/);
  assert.match(predictionRuntimeSource, /다른 경기 조회/);
});

test('AdvancedMatchCard는 dark mode에서 주요 상태 텍스트를 흰색으로 유지한다', () => {
  assert.match(predictionVotePanelSource, /'vote-disabled-away-btn'/);
  assert.match(predictionVotePanelSource, /'vote-disabled-home-btn'/);
  assert.match(predictionVotePanelSource, /data-testid=\{team === 'away' \? 'vote-disabled-away-btn' : 'vote-disabled-home-btn'\}[\s\S]*dark:text-white/);
  assert.match(advancedMatchCardSource, /text-gray-300 dark:text-white">:<\/span>/);
  assert.match(advancedMatchCardSource, /font-bold text-gray-500 dark:text-white sm:text-body/);
  assert.match(advancedMatchCardSource, /text-slate-600 dark:text-white/);
  assert.match(advancedMatchCardSource, /경기 상세 섹션을 준비하고 있습니다\./);
  assert.match(advancedMatchCardSource, /dark:bg-secondary\/40 dark:text-white/);
});

test('PredictionVotePanel은 투표 CTA와 참여 수만 제공하고 하단 결과 바를 렌더링하지 않는다', () => {
  assert.match(predictionVotePanelSource, /승리 팀 예측/);
  assert.match(predictionVotePanelSource, /승리할 것으로 예상하는 팀을 선택해 주세요\./);
  assert.match(predictionVotePanelSource, /경기 시작 전까지 변경할 수 있어요\./);
  assert.match(predictionVotePanelSource, /참여 \{totalVotes\.toLocaleString\(\)\}명/);
  assert.match(predictionVotePanelSource, /선택됨/);
  assert.match(predictionVotePanelSource, /선택/);
  assert.match(predictionVotePanelSource, /예측 취소/);
  assert.match(predictionVotePanelSource, /처리 중\.\.\./);
  assert.match(predictionVotePanelSource, /aria-labelledby=\{votePanelTitleId\}/);
  assert.match(predictionVotePanelSource, /aria-describedby=\{`\$\{votePanelHelperId\} \$\{votePanelParticipantsId\}`\}/);
  assert.match(predictionVotePanelSource, /id=\{votePanelTitleId\}/);
  assert.match(predictionVotePanelSource, /id=\{votePanelHelperId\}/);
  assert.match(predictionVotePanelSource, /id=\{votePanelParticipantsId\}/);
  assert.match(predictionVotePanelSource, /data-testid="prediction-vote-participants"/);
  assert.match(predictionVotePanelSource, /aria-pressed=\{isSelected\}/);
  assert.match(predictionVotePanelSource, /aria-label=\{buttonAriaLabel\}/);
  assert.match(predictionVotePanelSource, /다시 누르면 예측 취소/);
  assert.match(predictionVotePanelSource, /data-testid="prediction-vote-cancel-btn"/);
  assert.match(predictionVotePanelSource, /aria-label=\{`\$\{selectedVoteOption\?\.teamName \?\? '선택한 팀'\} 승리 예측 취소`\}/);
  assert.match(predictionVotePanelSource, /data-testid=\{team === 'away' \? 'prediction-vote-away-btn' : 'vote-home-btn'\}/);
  assert.match(predictionVotePanelSource, /data-testid=\{team === 'away' \? 'vote-disabled-away-btn' : 'vote-disabled-home-btn'\}/);
  assert.match(predictionVotePanelSource, /aria-label=\{`\$\{teamName\} 승리 예측 불가`\}/);
  assert.match(predictionVotePanelSource, /PredictionCheckCircleIcon/);
  assert.doesNotMatch(predictionVotePanelSource, /data-testid="prediction-vote-result-bar"/);
  assert.doesNotMatch(predictionVotePanelSource, /shouldShowVoteDistribution/);
  assert.doesNotMatch(predictionVotePanelSource, /votePercentages\.awayPercentage/);
  assert.doesNotMatch(predictionVotePanelSource, /votePercentages\.homePercentage/);
  assert.doesNotMatch(predictionVotePanelSource, /전체 예측/);
  assert.doesNotMatch(predictionVotePanelSource, /응원 현황/);
  assert.doesNotMatch(predictionVotePanelSource, /아직 참여한 사람이 없어요\. 첫 번째 예측을 남겨보세요\./);
  assert.doesNotMatch(predictionVotePanelSource, /EMPTY_VOTE_RESULT_MESSAGE/);
  assert.doesNotMatch(predictionVotePanelSource, /hasVoteResults/);
  assert.doesNotMatch(predictionVotePanelSource, /toFixed\(1\)%/);
  assert.doesNotMatch(predictionVotePanelSource, /카드를 눌러 이길 팀을 선택하세요\./);
  assert.doesNotMatch(predictionVotePanelSource, /승리로 예측했어요\./);
  assert.doesNotMatch(predictionVotePanelSource, /승리 예측하기/);
  assert.doesNotMatch(predictionVotePanelSource, /내 예측 · 다시 누르면 취소/);
  assert.doesNotMatch(predictionVotePanelSource, /이 팀으로 변경/);
  assert.doesNotMatch(predictionVotePanelSource, /opacity-70/);
  assert.doesNotMatch(predictionVotePanelSource, /totalVotes === 0 \? 50/);
});

test('PredictionVotePanel은 다크모드에서 어두운 카드와 팀 컬러 선택 테두리를 사용한다', () => {
  assert.match(predictionVotePanelSource, /isDarkMode: boolean/);
  assert.match(predictionVotePanelSource, /dark:bg-slate-950\/70/);
  assert.match(predictionVotePanelSource, /dark:bg-slate-950\/60/);
  assert.match(predictionVotePanelSource, /dark:border-slate-700/);
  assert.match(predictionVotePanelSource, /dark:text-white\/55/);
  assert.match(predictionVotePanelSource, /dark:text-white/);
  assert.match(predictionVotePanelSource, /isDarkMode\s*\?\s*'rgba\(15, 23, 42, 0\.82\)'/);
  assert.match(predictionVotePanelSource, /`0 0 0 1px \$\{color\}33/);
});

test('Prediction 상세 런타임은 중복 응원 현황 컴포넌트를 제거한다', () => {
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /VotePercentageGauge/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /cheeringCaption/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /awayPercent/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /homePercent/);
  assert.doesNotMatch(advancedMatchCardContentRuntimeSource, /totalVotes === 0 \? 50/);
});
