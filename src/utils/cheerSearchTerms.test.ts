import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHEER_RECENT_SEARCH_LIMIT,
  addCheerRecentSearch,
  normalizeRecordableCheerSearchTerm,
  removeCheerRecentSearch,
} from './cheerSearchTerms';

test('응원글 최근 검색어는 공백을 정리하고 두 글자 이상만 기록한다', () => {
  assert.equal(normalizeRecordableCheerSearchTerm('  승리   요정 '), '승리 요정');
  assert.equal(normalizeRecordableCheerSearchTerm('승'), null);
});

test('응원글 최근 검색어는 중복을 앞으로 이동하고 최대 개수를 유지한다', () => {
  const initial = Array.from({ length: CHEER_RECENT_SEARCH_LIMIT }, (_, index) => `검색${index}`);
  const withDuplicate = addCheerRecentSearch(initial, '검색3');
  assert.equal(withDuplicate[0], '검색3');
  assert.equal(withDuplicate.length, CHEER_RECENT_SEARCH_LIMIT);

  const withNewTerm = addCheerRecentSearch(withDuplicate, '새 검색');
  assert.equal(withNewTerm[0], '새 검색');
  assert.equal(withNewTerm.length, CHEER_RECENT_SEARCH_LIMIT);
  assert.equal(withNewTerm.includes('검색5'), false);
});

test('응원글 최근 검색어는 대소문자와 공백을 무시해 삭제한다', () => {
  assert.deepEqual(removeCheerRecentSearch(['Walk Off', '직관 인증'], ' walk   off '), ['직관 인증']);
});
