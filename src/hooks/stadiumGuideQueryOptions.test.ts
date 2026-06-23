import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStadiumGuidePlacesQueryOptions,
  getStadiumGuideStadiumsQueryOptions,
} from './stadiumGuideQueryOptions';

test('stadium guide query options expose stable keys', () => {
  assert.deepEqual(getStadiumGuideStadiumsQueryOptions().queryKey, ['stadium-guide', 'stadiums']);
  assert.deepEqual(
    getStadiumGuidePlacesQueryOptions('jamsil', 'food').queryKey,
    ['stadium-guide', 'stadiums', 'jamsil', 'places', 'food'],
  );
});

test('stadium guide places query is enabled only for DB categories with a stadium id', () => {
  assert.equal(getStadiumGuidePlacesQueryOptions('jamsil', 'food').enabled, true);
  assert.equal(getStadiumGuidePlacesQueryOptions('', 'food').enabled, false);
  assert.equal(getStadiumGuidePlacesQueryOptions('jamsil', 'store').enabled, false);
  assert.equal(getStadiumGuidePlacesQueryOptions('jamsil', 'parking').enabled, false);
});
