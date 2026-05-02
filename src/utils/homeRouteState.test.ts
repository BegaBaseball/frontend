import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDateForAPI } from './home';
import {
  buildHomeRouteSearchParams,
  coerceHomeRouteTab,
  parseHomeRouteTab,
  resolveHomeRouteDate,
  resolveHomeRouteState,
} from './homeRouteState';

const fallbackDate = new Date('2026-04-29T12:00:00');

test('resolveHomeRouteState는 유효한 date와 tab query를 복원한다', () => {
  const result = resolveHomeRouteState(
    new URLSearchParams('date=2026-05-02&tab=scheduled'),
    fallbackDate,
  );

  assert.equal(formatDateForAPI(result.date), '2026-05-02');
  assert.equal(result.tab, 'scheduled');
  assert.equal(result.hasExplicitTab, true);
  assert.equal(result.hasRouteQuery, true);
});

test('resolveHomeRouteDate는 유효하지 않은 날짜를 fallback 날짜로 보정한다', () => {
  const result = resolveHomeRouteDate('2026-02-31', fallbackDate);

  assert.equal(formatDateForAPI(result), '2026-04-29');
});

test('parseHomeRouteTab은 알 수 없는 tab query를 무시한다', () => {
  assert.equal(parseHomeRouteTab('unknown'), null);
  assert.equal(parseHomeRouteTab(' postseason '), 'postseason');
});

test('coerceHomeRouteTab은 현재 보이지 않는 tab을 regular로 보정한다', () => {
  const result = coerceHomeRouteTab('koreanseries', [
    { value: 'regular' },
    { value: 'scheduled' },
  ]);

  assert.equal(result, 'regular');
});

test('buildHomeRouteSearchParams는 기존 query를 유지하면서 date와 tab을 갱신한다', () => {
  const result = buildHomeRouteSearchParams({
    searchParams: new URLSearchParams('utm=test&date=2026-04-01&tab=regular'),
    date: new Date('2026-05-03T12:00:00'),
    tab: 'scheduled',
  });

  assert.equal(result.get('utm'), 'test');
  assert.equal(result.get('date'), '2026-05-03');
  assert.equal(result.get('tab'), 'scheduled');
});
