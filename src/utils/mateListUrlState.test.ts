import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMateListReturnPath,
  canonicalizeMateListSearchParams,
  mateListDateToLocalDate,
  parseMateListUrlState,
  serializeMateListUrlState,
} from './mateListUrlState';

const parse = (value: string, favoriteTeamId: string | null = 'HH') => (
  parseMateListUrlState(new URLSearchParams(value), { favoriteTeamId })
);

test('parses defaults and converts the one-based URL page to a zero-based query page', () => {
  assert.deepEqual(parse(''), {
    searchQuery: '',
    date: null,
    activeTab: 'all',
    myTeamOnly: false,
    activeSortKey: 'latest',
    queryPage: 0,
  });
  assert.equal(parse('page=3').queryPage, 2);
});

test('round-trips the complete committed state and preserves unrelated parameters', () => {
  const current = new URLSearchParams('campaign=summer&party=42');
  const serialized = serializeMateListUrlState({
    searchQuery: ' 잠실   블루존 ',
    date: '2026-07-18',
    activeTab: 'matched',
    myTeamOnly: true,
    activeSortKey: 'dDay',
    queryPage: 1,
  }, current);

  assert.deepEqual([...serialized.entries()], [
    ['campaign', 'summer'],
    ['party', '42'],
    ['q', '잠실 블루존'],
    ['date', '2026-07-18'],
    ['tab', 'matched'],
    ['team', 'mine'],
    ['sort', 'dDay'],
    ['page', '2'],
  ]);
  assert.deepEqual(parse(serialized.toString()), {
    searchQuery: '잠실 블루존',
    date: '2026-07-18',
    activeTab: 'matched',
    myTeamOnly: true,
    activeSortKey: 'dDay',
    queryPage: 1,
  });
});

test('removes invalid known values and defaults while retaining unknown and legacy values', () => {
  const canonical = canonicalizeMateListSearchParams(
    new URLSearchParams('q=%20%20&date=2026-02-30&tab=closed&team=other&sort=oldest&page=0&campaign=a&party=7'),
    { favoriteTeamId: 'HH' },
  );

  assert.equal(canonical.toString(), 'campaign=a&party=7');
});

test('removes team=mine when the authenticated user has no favorite team', () => {
  const canonical = canonicalizeMateListSearchParams(
    new URLSearchParams('team=mine&campaign=a'),
    { favoriteTeamId: null },
  );

  assert.equal(canonical.toString(), 'campaign=a');
  assert.equal(parse('team=mine', null).myTeamOnly, false);
});

test('validates calendar dates without UTC conversion', () => {
  const leapDay = mateListDateToLocalDate('2028-02-29');
  assert.equal(leapDay?.getFullYear(), 2028);
  assert.equal(leapDay?.getMonth(), 1);
  assert.equal(leapDay?.getDate(), 29);
  assert.equal(mateListDateToLocalDate('2027-02-29'), null);
  assert.equal(mateListDateToLocalDate('2026-2-09'), null);
});

test('builds a canonical mate return path without a trailing question mark', () => {
  assert.equal(buildMateListReturnPath(new URLSearchParams()), '/mate');
  assert.equal(
    buildMateListReturnPath(new URLSearchParams('tab=matched&q=%EC%9E%A0%EC%8B%A4')),
    '/mate?tab=matched&q=%EC%9E%A0%EC%8B%A4',
  );
});
