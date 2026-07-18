import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAccessibleCheerTextColor,
  normalizeCheerSearchQuery,
  parseLinkedTarget,
  resolveCheerSurface,
  resolveCheerTabFromParam,
} from './CheerPresentation';

test('연결 작성 경로는 정확한 타입과 양의 정수 원본 ID 조합만 허용한다', () => {
  assert.deepEqual(parseLinkedTarget('CHECKIN', '12', null), {
    postType: 'CHECKIN',
    diaryId: 12,
  });
  assert.deepEqual(parseLinkedTarget('RECRUITMENT', null, '44'), {
    postType: 'RECRUITMENT',
    partyId: 44,
  });

  const invalidTargets: Array<[string | null, string | null, string | null]> = [
    ['CHECKIN', '12', '44'],
    ['RECRUITMENT', '12', '44'],
    [null, null, null],
    ['CHECKIN', null, null],
    ['RECRUITMENT', null, null],
    ['CHECKIN', null, '44'],
    ['RECRUITMENT', '12', null],
    ['CHECKIN', '', null],
    ['RECRUITMENT', null, ''],
    ['CHECKIN', '1.5', null],
    ['RECRUITMENT', null, '1e2'],
    ['CHECKIN', '0', null],
    ['RECRUITMENT', null, '-1'],
    ['CHECKIN', ' 12', null],
    ['RECRUITMENT', null, '44 '],
    ['NORMAL', '12', null],
    ['checkin', '12', null],
    ['FUTURE_TYPE', null, '44'],
  ];

  invalidTargets.forEach(([postType, diaryId, partyId]) => {
    assert.equal(
      parseLinkedTarget(postType, diaryId, partyId),
      null,
      `${postType ?? 'null'}:${diaryId ?? 'null'}:${partyId ?? 'null'}`,
    );
  });
});

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
