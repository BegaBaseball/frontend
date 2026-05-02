import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeStructuredInlineText,
    normalizeStructuredInsightList,
    normalizeStructuredMultilineText,
    sanitizeMarkdown,
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

test('sanitizeMarkdown은 마크다운 구조를 그대로 보존한다', () => {
    const markdown = [
        '## 경기 전 스냅샷',
        '- **한화 이글스**: 최근 **5승 2패**, 정규시즌 OPS **0.742**',
        '- **SSG 랜더스**: 최근 표본 부족',
        '',
        '## 코치 판단',
        '- 초반 선발 운영이 흐름을 좌우합니다.',
    ].join('\n');

    const result = sanitizeMarkdown(markdown);
    assert.match(result, /^## 경기 전 스냅샷/);
    assert.match(result, /- \*\*한화 이글스\*\*/);
    assert.match(result, /OPS \*\*0\.742\*\*/);
});

test('sanitizeMarkdown은 HTML 태그와 제어 문자를 제거하고 빈 입력에 fallback을 쓴다', () => {
    assert.equal(sanitizeMarkdown('<script>alert(1)</script>안녕\u0000'), '안녕');
    assert.equal(sanitizeMarkdown('', '기본 메시지'), '기본 메시지');
    assert.equal(sanitizeMarkdown('   \n\n\n  ', '기본 메시지'), '기본 메시지');
});
