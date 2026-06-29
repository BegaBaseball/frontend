import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScheduleMonthDates,
  formatScheduleDateKey,
  formatScheduleMonthKey,
  getScheduleMonthStartKey,
  normalizeScheduleDateKey,
  resolveScheduleInitialCursor,
  resolveScheduleInitialSelectedDate,
} from './scheduleCalendar';

test('formatScheduleDateKey는 Date를 yyyy-mm-dd로 변환한다', () => {
  assert.equal(formatScheduleDateKey(new Date(2026, 3, 5)), '2026-04-05');
});

test('formatScheduleMonthKey는 Date를 yyyy-mm으로 변환한다', () => {
  assert.equal(formatScheduleMonthKey(new Date(2026, 10, 1)), '2026-11');
});

test('getScheduleMonthStartKey는 월 1일 key를 반환한다', () => {
  assert.equal(getScheduleMonthStartKey(new Date(2026, 4, 20)), '2026-05-01');
});

test('buildScheduleMonthDates는 해당 월 날짜만 생성한다', () => {
  const dates = buildScheduleMonthDates(new Date(2026, 1, 1));

  assert.equal(dates.length, 28);
  assert.equal(formatScheduleDateKey(dates[0]), '2026-02-01');
  assert.equal(formatScheduleDateKey(dates[27]), '2026-02-28');
});

test('resolveScheduleInitialSelectedDate는 오늘이 현재 월이면 오늘을 우선한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 3, 1),
    todayKey: '2026-04-15',
    gameDateKeys: ['2026-04-02'],
  });

  assert.equal(selected, '2026-04-15');
});

test('resolveScheduleInitialSelectedDate는 date query 요청 날짜를 최우선으로 선택한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 3, 1),
    todayKey: '2026-04-15',
    requestedDateKey: '2026-04-18',
    gameDateKeys: ['2026-04-02', '2026-04-18'],
  });

  assert.equal(selected, '2026-04-18');
});

test('resolveScheduleInitialSelectedDate는 현재 월 밖 date query를 무시한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 3, 1),
    todayKey: '2026-04-15',
    requestedDateKey: '2026-05-18',
    gameDateKeys: ['2026-04-02'],
  });

  assert.equal(selected, '2026-04-15');
});

test('resolveScheduleInitialSelectedDate는 오늘이 현재 월 밖이면 첫 경기일을 선택한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 4, 1),
    todayKey: '2026-04-15',
    gameDateKeys: ['2026-05-18', '2026-05-03', '2026-04-30'],
  });

  assert.equal(selected, '2026-05-03');
});

test('resolveScheduleInitialSelectedDate는 경기일이 없으면 월 1일을 선택한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 5, 1),
    todayKey: '2026-04-15',
    gameDateKeys: [],
  });

  assert.equal(selected, '2026-06-01');
});

test('resolveScheduleInitialSelectedDate는 월 이동 후 새 월 기준으로 계산한다', () => {
  const selected = resolveScheduleInitialSelectedDate({
    cursor: new Date(2026, 6, 1),
    todayKey: '2026-04-15',
    gameDateKeys: ['2026-06-28', '2026-07-04', '2026-07-02'],
  });

  assert.equal(selected, '2026-07-02');
});

test('resolveScheduleInitialCursor는 date query가 유효하면 해당 월을 사용한다', () => {
  const cursor = resolveScheduleInitialCursor(
    new URLSearchParams('date=2026-05-18'),
    new Date(2026, 3, 25),
  );

  assert.equal(formatScheduleDateKey(cursor), '2026-05-01');
});

test('resolveScheduleInitialCursor는 date query가 무효하면 fallback 월을 유지한다', () => {
  const cursor = resolveScheduleInitialCursor(
    new URLSearchParams('date=2026-99-99'),
    new Date(2026, 3, 25),
  );

  assert.equal(formatScheduleDateKey(cursor), '2026-04-01');
});

test('normalizeScheduleDateKey는 유효한 date query만 yyyy-mm-dd로 보존한다', () => {
  assert.equal(normalizeScheduleDateKey('2026-05-18'), '2026-05-18');
  assert.equal(normalizeScheduleDateKey('2026-99-99'), null);
  assert.equal(normalizeScheduleDateKey('not-a-date'), null);
});
