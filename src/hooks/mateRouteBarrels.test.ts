import test from 'node:test';
import assert from 'node:assert/strict';

import * as mateApplyRoute from './mateApplyRoute';
import * as mateChatRoute from './mateChatRoute';
import * as mateCheckInRoute from './mateCheckInRoute';
import * as mateDetailRoute from './mateDetailRoute';
import * as mateList from './mateList';
import * as mateManageRoute from './mateManageRoute';
import * as mateRoute from './mateRoute';

const exportKeys = (module: Record<string, unknown>) => Object.keys(module).sort();

test('mateRoute public surface는 route hook만 노출한다', () => {
  assert.deepEqual(exportKeys(mateRoute), [
    'useMatePartyFromRoute',
  ]);
});

test('mateList public surface는 list seed helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateList), [
    'seedMatePartyQueryData',
  ]);
});

test('mateDetailRoute public surface는 상세 화면 helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateDetailRoute), [
    'MATE_KEYS',
    'getMatePartyApplicationsQueryOptions',
    'getMatePartyMyApplicationQueryOptions',
    'getMatePartyReviewsQueryOptions',
    'invalidateMatePartyQueries',
    'removeMatePartyFromCollections',
    'setMatePartyMyApplicationQueryData',
    'syncMatePartyQueryData',
    'updateMatePartyApplicationsQueryData',
    'updateMatePartyCollectionQueryData',
    'useMatePartyFromRoute',
  ]);
});

test('mateManageRoute public surface는 관리 화면 helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateManageRoute), [
    'getMatePartyApplicationsQueryOptions',
    'removeMatePartyFromCollections',
    'removeMatePartyQueries',
    'syncMatePartyQueryData',
    'updateMatePartyApplicationQueryData',
    'updateMatePartyCollectionQueryData',
    'useMatePartyFromRoute',
  ]);
});

test('mateChatRoute public surface는 채팅 화면 helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateChatRoute), [
    'MATE_KEYS',
    'getMatePartyMessagesQueryOptions',
    'getMatePartyMyApplicationQueryOptions',
    'useMatePartyFromRoute',
  ]);
});

test('mateCheckInRoute public surface는 체크인 화면 helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateCheckInRoute), [
    'appendMatePartyCheckInQueryData',
    'getMatePartyCheckInsQueryOptions',
    'updateMatePartyCollectionQueryData',
    'useMatePartyFromRoute',
  ]);
});

test('mateApplyRoute public surface는 신청 화면 helper만 노출한다', () => {
  assert.deepEqual(exportKeys(mateApplyRoute), [
    'setMatePartyMyApplicationQueryData',
    'updateMatePartyApplicationsQueryData',
    'useMatePartyFromRoute',
  ]);
});
