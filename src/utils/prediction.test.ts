import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COACH_BRIEFING_DISPLAY_MESSAGE,
  COACH_BRIEFING_MANUAL_HINT,
  buildCoachBriefingRequestDescriptor,
  CoachRequestMode,
  getCoachBriefingDataQualityNotice,
  getCoachBriefingGroundingReasonLabels,
  parseAiBriefing,
  resolveCoachAnalysisPresentation,
  resolveCoachBriefingPolicy,
} from './prediction';
import type { Game } from '../types/prediction';

const buildCoachBriefingDescriptor = ({
  game,
  requestMode = 'auto_brief',
  focus = ['recent_form'],
  requestSeasonYear = 2026,
  requestLeagueTypeCode = 0,
  homePitcherName = '발표 전',
  awayPitcherName = '발표 전',
  homeSeasonContext = { rank: 2, gamesBehind: 1.5, remainingGames: 18 },
  awaySeasonContext = { rank: 7, gamesBehind: 6.5, remainingGames: 18 },
}: {
  game?: Partial<Game>;
  requestMode?: CoachRequestMode;
  focus?: string[];
  requestSeasonYear?: number;
  requestLeagueTypeCode?: number;
  homePitcherName?: string;
  awayPitcherName?: string;
  homeSeasonContext?: { rank: number; gamesBehind: number; remainingGames: number } | null;
  awaySeasonContext?: { rank: number; gamesBehind: number; remainingGames: number } | null;
} = {}) => buildCoachBriefingRequestDescriptor({
  game: {
    gameId: '20260324WOLG0',
    gameDate: '2026-03-24',
    homeTeam: 'LG',
    awayTeam: 'WO',
    stadium: '잠실',
    seasonId: 265,
    leagueType: 'REGULAR',
    postSeasonSeries: 'REGULAR',
    seriesGameNo: 1,
    ...game,
  },
  requestMode,
  focus,
  requestSeasonYear,
  requestLeagueTypeCode,
  homePitcherName,
  awayPitcherName,
  homeSeasonContext,
  awaySeasonContext,
});

test('CoachRequestMode는 auto_brief/manual_detail 두 값만 허용한다', () => {
  const supportedModes: CoachRequestMode[] = ['auto_brief', 'manual_detail'];
  assert.equal(supportedModes.length, 2);
  assert.equal(supportedModes.includes('auto_brief' as CoachRequestMode), true);
  assert.equal(supportedModes.includes('manual_detail' as CoachRequestMode), true);
});

test('resolveCoachAnalysisPresentation: 지난 경기는 경기 리뷰 라벨을 사용한다', () => {
  const presentation = resolveCoachAnalysisPresentation({ isPastGame: true });

  assert.equal(presentation.mode, 'review');
  assert.equal(presentation.title, 'AI 코치 경기 리뷰');
  assert.equal(presentation.buttonLabel, 'AI 코치 경기 리뷰');
  assert.equal(presentation.runButtonLabel, 'AI 코치 경기 리뷰 시작');
});

test('resolveCoachAnalysisPresentation: 예정 경기는 경기 예측 라벨을 사용한다', () => {
  const presentation = resolveCoachAnalysisPresentation({ isFutureGame: true });

  assert.equal(presentation.mode, 'prediction');
  assert.equal(presentation.title, 'AI 코치 경기 예측');
  assert.equal(presentation.buttonLabel, 'AI 코치 경기 예측');
  assert.equal(presentation.runButtonLabel, 'AI 코치 경기 예측 시작');
});

test('resolveCoachAnalysisPresentation: 같은 날 예정 경기여도 SCHEDULED 상태면 경기 예측 라벨을 사용한다', () => {
  const presentation = resolveCoachAnalysisPresentation({ gameStatusBucket: 'SCHEDULED' });

  assert.equal(presentation.mode, 'prediction');
  assert.equal(presentation.title, 'AI 코치 경기 예측');
  assert.equal(presentation.buttonLabel, 'AI 코치 경기 예측');
  assert.equal(presentation.runButtonLabel, 'AI 코치 경기 예측 시작');
});

test('resolveCoachAnalysisPresentation: 진행 중 경기는 기본 상세 분석 라벨을 유지한다', () => {
  const presentation = resolveCoachAnalysisPresentation({ gameStatusBucket: 'LIVE' });

  assert.equal(presentation.mode, 'analysis');
  assert.equal(presentation.title, 'AI 코치 상세 분석');
  assert.equal(presentation.buttonLabel, 'AI 코치 상세 분석');
  assert.equal(presentation.runButtonLabel, 'AI 코치 상세 분석 시작');
});

test('parseAiBriefing: markdown 문법을 텍스트로 정리한다', () => {
  const raw = `
### 핵심 포인트

- **타격**이 상승했습니다.
- \`OPS\`가 0.920으로 개선됨.
1. 불안한 수비도 부분적으로 보완 필요.
`;
  const normalized = parseAiBriefing({ title: 'AI 분석', message: raw }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.title, 'AI 분석 리포트');
  assert.equal(normalized.message, normalized.displayText);
  assert.equal(normalized.message.includes('**'), false);
  assert.equal(normalized.message.includes('`'), false);
  assert.equal(normalized.message.includes('-'), false);
  assert.equal(normalized.message.includes('1.'), false);
  assert.equal(normalized.message.includes('타격'), true);
});

test('parseAiBriefing: 구조화 응답(answer)에서 표시용 텍스트를 추출한다', () => {
  const normalized = parseAiBriefing({
    answer: '```json\n{"headline":"요약","coach_note":"**강점**: `OPS`가 0.920"}\n```',
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.title, 'AI 분석 리포트');
  assert.equal(normalized.message, normalized.displayText);
  assert.equal(normalized.message.includes('**'), false);
  assert.equal(normalized.message.includes('`'), false);
  assert.equal(normalized.message.includes('OPS'), true);
});

test('parseAiBriefing: 구조화 응답(summary)도 마크다운 없이 텍스트로 정리한다', () => {
  const normalized = parseAiBriefing({
    answer: '```json\n{"summary":"**핵심 요약**: `OPS`가 0.920으로 상승했습니다."}\n```',
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.message, '핵심 요약: OPS가 0.920으로 상승했습니다.');
  assert.equal(normalized.message.includes('**'), false);
  assert.equal(normalized.message.includes('`'), false);
});

test('parseAiBriefing: answer가 있을 때 structuredData.summary보다 우선한다', () => {
  const normalized = parseAiBriefing({
    answer: '실시간 타격 지표인 **OPS**가 0.980로 크게 상승했습니다.',
    structuredData: {
      summary: '구조화 응답 요약에는 **OPS** 0.900',
      analysis: {
        strengths: ['`OPS`가 높습니다.'],
      },
    },
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.message.includes('구조화 응답 요약'), false);
  assert.equal(normalized.message.includes('실시간 타격 지표인 OPS가 0.980로 크게 상승했습니다.'), true);
});

test('parseAiBriefing: structuredData.summary가 answer 없이 fallback 우선권을 가진다', () => {
  const normalized = parseAiBriefing({
    structuredData: {
      summary: '**구조화 요약**: `OPS`가 0.920으로 개선됨',
      analysis: {
        strengths: ['`OPS`가 높음'],
        weaknesses: ['상대 불펜이 강함'],
      },
    },
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.message, '구조화 요약: OPS가 0.920으로 개선됨');
  assert.equal(normalized.message.includes('**'), false);
});

test('parseAiBriefing: structuredData.summary는 message보다 우선한다', () => {
  const normalized = parseAiBriefing({
    message: '- 메시지는 목록으로 시작하므로 후보 우선순위가 낮음',
    structuredData: {
      summary: '구조화 요약이 message보다 우선합니다.',
      analysis: {
        strengths: ['강점 요약입니다.'],
      },
    },
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.message, '구조화 요약이 message보다 우선합니다.');
});

test('parseAiBriefing: analysis.verdict와 why_it_matters도 브리핑 후보로 사용한다', () => {
  const normalized = parseAiBriefing({
    structuredData: {
      analysis: {
        verdict: 'LG가 OPS 우위로 먼저 앞서지만 후반 불펜 변수는 남아 있습니다.',
        why_it_matters: ['OPS 차이가 선취점 확률에 직접 연결됩니다.'],
      },
    },
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(
    normalized.message,
    'LG가 OPS 우위로 먼저 앞서지만 후반 불펜 변수는 남아 있습니다.',
  );
});

test('parseAiBriefing: 빈 응답은 fallback 텍스트를 반환한다', () => {
  const normalized = parseAiBriefing({
    answer: '',
    message: '',
    structuredData: {},
  }, {
    fallbackMessage: COACH_BRIEFING_DISPLAY_MESSAGE,
    fallbackHintMessage: COACH_BRIEFING_MANUAL_HINT,
  });

  assert.equal(normalized.message, COACH_BRIEFING_DISPLAY_MESSAGE);
});

test('buildCoachBriefingRequestDescriptor: 점수 변화는 fingerprint를 바꾸지 않는다', () => {
  const withoutScores = buildCoachBriefingDescriptor({
    game: {
      homeScore: undefined,
      awayScore: undefined,
    },
  });
  const withScores = buildCoachBriefingDescriptor({
    game: {
      homeScore: 7,
      awayScore: 2,
      winner: 'LG',
    },
  });

  assert.ok(withoutScores);
  assert.ok(withScores);
  assert.equal(withoutScores.requestFingerprint, withScores.requestFingerprint);
});

test('buildCoachBriefingRequestDescriptor: 선발/순위 컨텍스트/focus/mode가 바뀌면 fingerprint를 갱신한다', () => {
  const baseline = buildCoachBriefingDescriptor();
  const pitcherChanged = buildCoachBriefingDescriptor({
    homePitcherName: '임찬규',
  });
  const seasonContextChanged = buildCoachBriefingDescriptor({
    homeSeasonContext: { rank: 1, gamesBehind: 0, remainingGames: 18 },
  });
  const focusAndModeChanged = buildCoachBriefingDescriptor({
    requestMode: 'manual_detail',
    focus: ['matchup', 'recent_form'],
  });

  assert.ok(baseline);
  assert.ok(pitcherChanged);
  assert.ok(seasonContextChanged);
  assert.ok(focusAndModeChanged);
  assert.notEqual(baseline.requestFingerprint, pitcherChanged.requestFingerprint);
  assert.notEqual(baseline.requestFingerprint, seasonContextChanged.requestFingerprint);
  assert.notEqual(baseline.requestFingerprint, focusAndModeChanged.requestFingerprint);
});

test('getCoachBriefingGroundingReasonLabels: 지원되는 코드만 지정 순서의 한국어 라벨로 정리한다', () => {
  const labels = getCoachBriefingGroundingReasonLabels([
    'missing_summary',
    'missing_starters',
    'focus_data_unavailable',
    'unknown_reason',
    'missing_lineups',
    'missing_clutch_moments',
    'missing_summary',
  ]);

  assert.deepEqual(labels, [
    '선발 미발표',
    '라인업 미발표',
    '경기 요약 부족',
    '승부처 데이터 부족',
    '요청 항목 근거 부족',
  ]);
});

test('getCoachBriefingDataQualityNotice: 알 수 없는 코드만 있으면 generic 안내로 축약한다', () => {
  const notice = getCoachBriefingDataQualityNotice('partial', ['unsupported_reason']);

  assert.deepEqual(notice, {
    message: '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.',
    reasons: ['실데이터 근거가 제한적입니다.'],
    details: [],
  });
});

test('getCoachBriefingDataQualityNotice: 중복 기본 경고는 숨기고 구체 경고만 상세 노출한다', () => {
  const notice = getCoachBriefingDataQualityNotice(
    'partial',
    ['missing_clutch_moments', 'focus_data_unavailable'],
    [
      'WPA 기반 승부처 데이터가 부족합니다.',
      '요청한 focus 중 상대 전적, 타격 생산성 근거가 부족해 확인 가능한 항목만 분석합니다.',
      '요청한 focus 근거가 부족해 확인 가능한 항목만 분석하거나 보수 요약으로 전환합니다.',
    ],
  );

  assert.deepEqual(notice, {
    message: '현재 브리핑은 실데이터 일부가 비어 있어 최근 흐름 중심으로 요약했습니다.',
    reasons: ['승부처 데이터 부족', '요청 항목 근거 부족'],
    details: ['요청한 focus 중 상대 전적, 타격 생산성 근거가 부족해 확인 가능한 항목만 분석합니다.'],
  });
});

test('resolveCoachBriefingPolicy: 경기 조건별 auto/manual 분기 정책을 반환한다', () => {
  const postseasonPolicy = resolveCoachBriefingPolicy({
    canCallAI: true,
    isScheduledGame: false,
    isPostseasonGame: true,
    isMeaningfulGame: false,
  });

  assert.equal(postseasonPolicy.autoEnabled, true);
  assert.equal(postseasonPolicy.forceManual, false);
  assert.equal(postseasonPolicy.requestMode, 'auto_brief');

  const scheduledNonMeaningful = resolveCoachBriefingPolicy({
    canCallAI: true,
    isScheduledGame: true,
    isPostseasonGame: false,
    isMeaningfulGame: false,
  });

  assert.equal(scheduledNonMeaningful.autoEnabled, false);
  assert.equal(scheduledNonMeaningful.forceManual, true);
  assert.equal(scheduledNonMeaningful.requestMode, 'manual_detail');

  const meaningfulPolicy = resolveCoachBriefingPolicy({
    canCallAI: true,
    isScheduledGame: true,
    isPostseasonGame: false,
    isMeaningfulGame: true,
  });

  assert.equal(meaningfulPolicy.autoEnabled, true);
  assert.equal(meaningfulPolicy.forceManual, false);
  assert.equal(meaningfulPolicy.requestMode, 'auto_brief');

  const noSelectionPolicy = resolveCoachBriefingPolicy({
    hasSelectedGame: false,
    canCallAI: true,
    isScheduledGame: true,
    isPostseasonGame: false,
    isMeaningfulGame: false,
  });

  assert.equal(noSelectionPolicy.autoEnabled, false);
  assert.equal(noSelectionPolicy.forceManual, true);
  assert.equal(noSelectionPolicy.requestMode, 'manual_detail');
});
