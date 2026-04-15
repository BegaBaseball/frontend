import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeStructuredInlineText,
    normalizeStructuredInsightList,
    normalizeStructuredMultilineText,
} from './coachAnalysisText';

test('normalizeStructuredInlineText는 clean structured 문장을 그대로 유지한다', () => {
    const message = '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.';

    assert.equal(normalizeStructuredInlineText(message), message);
});

test('normalizeStructuredMultilineText는 markdown 껍데기만 제거하고 본문 문장은 보존한다', () => {
    const message = [
        '## 최근 전력',
        '- 한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
        '',
        '## 불펜 상태',
        '- SSG 랜더스는 불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다.',
    ].join('\n');

    assert.equal(
        normalizeStructuredMultilineText(message),
        [
            '최근 전력',
            '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
            '',
            '불펜 상태',
            'SSG 랜더스는 불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다.',
        ].join('\n'),
    );
    assert.doesNotMatch(
        normalizeStructuredMultilineText(message),
        /최근 흐름 근거가 부족합니다/,
    );
});

test('normalizeStructuredInsightList는 scheduled swing factor 문구를 훼손하지 않는다', () => {
    const swingFactor = '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.';

    assert.deepEqual(
        normalizeStructuredInsightList([swingFactor, '', null]),
        [swingFactor],
    );
});
