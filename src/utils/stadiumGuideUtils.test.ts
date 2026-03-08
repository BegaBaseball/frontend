import test from 'node:test';
import assert from 'node:assert/strict';
import type { Place } from '../types/stadium';
import {
  filterAndSortPlaces,
  formatOptionalText,
  hasValidCoordinates,
  resolveAsyncStatus,
} from './stadiumGuideUtils';

const basePlaces: Place[] = [
  {
    id: 1,
    stadiumName: '잠실야구장',
    category: 'food',
    name: '브뤼셀프라이',
    description: null,
    lat: 37.5122,
    lng: 127.0719,
    address: null,
    phone: null,
    rating: 4.1,
    openTime: null,
    closeTime: null,
  },
  {
    id: 2,
    stadiumName: '잠실야구장',
    category: 'food',
    name: '통밥',
    description: null,
    lat: 37.5122,
    lng: 127.0719,
    address: null,
    phone: null,
    rating: 4.8,
    openTime: null,
    closeTime: null,
  },
  {
    id: 3,
    stadiumName: '잠실야구장',
    category: 'food',
    name: '이가네떡볶이',
    description: null,
    lat: null,
    lng: null,
    address: null,
    phone: null,
    rating: null,
    openTime: null,
    closeTime: null,
  },
];

test('filterAndSortPlaces: 검색어로 장소명을 필터링한다', () => {
  const filtered = filterAndSortPlaces(basePlaces, '떡볶이', 'default');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, '이가네떡볶이');
});

test('filterAndSortPlaces: 평점순 정렬 시 null 평점은 뒤로 간다', () => {
  const sorted = filterAndSortPlaces(basePlaces, '', 'rating');
  assert.deepEqual(sorted.map((place) => place.id), [2, 1, 3]);
});

test('filterAndSortPlaces: 이름순 정렬은 한글 로케일 비교를 사용한다', () => {
  const sorted = filterAndSortPlaces(basePlaces, '', 'name');
  assert.deepEqual(sorted.map((place) => place.name), ['브뤼셀프라이', '이가네떡볶이', '통밥']);
});

test('formatOptionalText: null/빈 문자열은 동일하게 fallback으로 처리한다', () => {
  assert.equal(formatOptionalText(null, '-'), '-');
  assert.equal(formatOptionalText('   ', '-'), '-');
  assert.equal(formatOptionalText('정상', '-'), '정상');
});

test('hasValidCoordinates: 유효한 좌표만 true를 반환한다', () => {
  assert.equal(hasValidCoordinates(37.5, 127.0), true);
  assert.equal(hasValidCoordinates(null, 127.0), false);
  assert.equal(hasValidCoordinates(37.5, undefined), false);
});

test('resolveAsyncStatus: loading > error > empty > success 우선순위를 보장한다', () => {
  assert.equal(resolveAsyncStatus(true, null, [1]), 'loading');
  assert.equal(resolveAsyncStatus(false, 'error', [1]), 'error');
  assert.equal(resolveAsyncStatus(false, null, []), 'empty');
  assert.equal(resolveAsyncStatus(false, null, [1]), 'success');
});
