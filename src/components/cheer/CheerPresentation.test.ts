import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAccessibleCheerTextColor,
  normalizeCheerSearchQuery,
  resolveCheerSurface,
  resolveCheerTabFromParam,
} from './CheerPresentation';

test('팀 액센트 위 글자는 실제 명암비가 더 높은 색을 선택한다', () => {
  assert.equal(getAccessibleCheerTextColor('#F37321'), '#0F172A');
  assert.equal(getAccessibleCheerTextColor('#315288'), '#FFFFFF');
});

test('응원석 검색어는 앞뒤와 중복 공백을 정리한다', () => {
  assert.equal(normalizeCheerSearchQuery('  #직관인증   창원  '), '#직관인증 창원');
  assert.equal(normalizeCheerSearchQuery('   '), '');
});

test('검색어가 있으면 탭보다 검색 결과 화면을 우선한다', () => {
  assert.equal(resolveCheerSurface('live', 'NC 다이노스'), 'search');
  assert.equal(resolveCheerSurface('live', ''), 'live');
  assert.equal(resolveCheerSurface('popular', ''), 'feed');
});

test('URL 탭은 지원하는 값만 복원하고 나머지는 전체 탭으로 정규화한다', () => {
  assert.equal(resolveCheerTabFromParam('live'), 'live');
  assert.equal(resolveCheerTabFromParam('following'), 'following');
  assert.equal(resolveCheerTabFromParam('unknown'), 'all');
  assert.equal(resolveCheerTabFromParam(null), 'all');
});
