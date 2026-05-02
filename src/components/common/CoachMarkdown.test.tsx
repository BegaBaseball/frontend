import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import CoachMarkdown from './CoachMarkdown';

const render = (children: string, className?: string) =>
    renderToStaticMarkup(createElement(CoachMarkdown, { children, className }));

test('빈 문자열은 null을 반환한다', () => {
    const html = renderToStaticMarkup(
        createElement(CoachMarkdown, { children: '' }),
    );
    assert.equal(html, '');
});

test('공백만 있는 문자열도 null을 반환한다', () => {
    const html = renderToStaticMarkup(
        createElement(CoachMarkdown, { children: '   \n\n  ' }),
    );
    assert.equal(html, '');
});

test('## 헤딩은 h3 엘리먼트로 렌더된다', () => {
    const html = render('## 경기 전 스냅샷');
    assert.match(html, /<h3[^>]*>/);
    assert.match(html, /경기 전 스냅샷/);
});

test('**강조**는 strong 엘리먼트로 렌더된다', () => {
    const html = render('한화 이글스는 **5승 2패**를 기록했습니다.');
    assert.match(html, /<strong[^>]*>5승 2패<\/strong>/);
});

test('- 불릿 리스트는 ul > li 구조로 렌더된다', () => {
    const html = render('- 첫 번째 항목\n- 두 번째 항목');
    assert.match(html, /<ul[^>]*>/);
    assert.match(html, /<li[^>]*>/);
    assert.match(html, /첫 번째 항목/);
    assert.match(html, /두 번째 항목/);
});

test('복합 마크다운 구조(## + - + **)가 모두 적절히 렌더된다', () => {
    const markdown = [
        '## 경기 전 스냅샷',
        '- **한화 이글스**: 최근 **5승 2패**, 정규시즌 OPS **0.742**',
        '- **SSG 랜더스**: 최근 표본 부족',
        '',
        '## 코치 판단',
        '- 초반 선발 운영이 흐름을 좌우합니다.',
    ].join('\n');

    const html = render(markdown);

    assert.match(html, /<h3[^>]*>/);
    assert.match(html, /경기 전 스냅샷/);
    assert.match(html, /<ul[^>]*>/);
    assert.match(html, /<strong[^>]*>한화 이글스<\/strong>/);
    assert.match(html, /0\.742/);
    assert.match(html, /코치 판단/);
});

test('className prop이 래퍼 div에 적용된다', () => {
    const html = render('테스트 내용', 'custom-class');
    assert.match(html, /class="custom-class"/);
});

test('HTML 태그는 skipHtml로 인해 렌더되지 않는다', () => {
    const html = render('<b>볼드</b> 일반 텍스트');
    assert.doesNotMatch(html, /<b>/);
});

test('GFM 표는 스크롤 가능한 표 컨테이너로 렌더된다', () => {
    const html = render([
        '| 지표 | 수치 |',
        '| --- | --- |',
        '| OPS | 0.837 |',
    ].join('\n'));

    assert.match(html, /overflow-x-auto/);
    assert.match(html, /<table[^>]*>/);
    assert.match(html, /<th[^>]*>지표<\/th>/);
    assert.match(html, /<td[^>]*>0\.837<\/td>/);
});
