import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COACH_BRIEFING_DISPLAY_MESSAGE,
  COACH_BRIEFING_MANUAL_HINT,
  CoachRequestMode,
  parseAiBriefing,
  resolveCoachBriefingPolicy,
} from './prediction';

test('CoachRequestMode는 auto_brief/manual_detail 두 값만 허용한다', () => {
  const supportedModes: CoachRequestMode[] = ['auto_brief', 'manual_detail'];
  assert.equal(supportedModes.length, 2);
  assert.equal(supportedModes.includes('auto_brief' as CoachRequestMode), true);
  assert.equal(supportedModes.includes('manual_detail' as CoachRequestMode), true);
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
