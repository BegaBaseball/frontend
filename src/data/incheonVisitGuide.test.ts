import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INCHEON_STADIUM_GUIDE_ALIASES,
  INCHEON_VISIT_QUICK_ACTIONS,
  isIncheonStadium,
} from './incheonVisitGuide';

test('인천 visit guide는 인천/SSG/문학 별칭으로 구장을 식별한다', () => {
  assert.ok(isIncheonStadium('INCHEON', null));
  assert.ok(isIncheonStadium(null, '인천SSG랜더스필드'));
  assert.ok(isIncheonStadium(null, '문학 경기장'));
  assert.ok(isIncheonStadium('SSG', '랜더스필드'));
  assert.equal(isIncheonStadium('JAMSIL', '서울잠실야구장'), false);
  assert.ok(INCHEON_STADIUM_GUIDE_ALIASES.includes('인천'));
});

test('인천 visit guide 빠른 동선은 좌석도와 주변 정보 카테고리를 모두 연결한다', () => {
  const seatMapActions = INCHEON_VISIT_QUICK_ACTIONS.filter((action) => action.kind === 'seatmap');
  const categoryActions = INCHEON_VISIT_QUICK_ACTIONS.filter((action) => action.kind === 'category');

  assert.equal(seatMapActions.length, 1);
  assert.deepEqual(
    categoryActions.map((action) => action.category).sort(),
    ['delivery', 'food', 'parking', 'store'].sort(),
  );
  INCHEON_VISIT_QUICK_ACTIONS.forEach((action) => {
    assert.ok(action.label);
    assert.ok(action.description);
    assert.ok(action.actionLabel);
  });
});
