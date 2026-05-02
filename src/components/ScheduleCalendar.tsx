import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game } from '@/types/home';
import TeamLogo from '@/components/TeamLogo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GameCard from '@/components/GameCard';
import ScheduledGameCard from '@/components/ScheduledGameCard';
import { isManualBaseballDataRequiredCode, MANUAL_BASEBALL_DATA_REQUIRED_CODE } from '@/utils/errorUtils';
import { normalizePredictionDate } from '@/utils/predictionHomeLogic';
import {
  buildScheduleMonthDates,
  formatScheduleDateKey,
  formatScheduleMonthKey,
  isScheduleDateKeyInMonth,
  resolveScheduleInitialSelectedDate,
} from '@/utils/scheduleCalendar';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-red-100 text-red-700 animate-pulse',
  FINAL: 'bg-emerald-100 text-emerald-700',
  POSTPONED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-zinc-200 text-zinc-500 line-through',
};

function buildMonthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const gameDateKey = (g: Game): string | null => (
  normalizePredictionDate(g.sourceDate || '')
  || normalizePredictionDate(g.gameDate || '')
);

const isScheduledLike = (status: string) => {
  const s = (status || '').toUpperCase();
  return s === 'SCHEDULED' || s === 'POSTPONED' || s === 'CANCELLED';
};

const formatSelectedDateLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
};

interface Props {
  games: Game[];
  initialMonth?: Date;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  errorCode?: string | null;
  onMonthChange?: (ym: string) => void;
  onSelectPrediction?: (game: Game) => void;
}

export default function ScheduleCalendar({
  games,
  initialMonth,
  isLoading = false,
  isError = false,
  errorMessage,
  errorCode,
  onMonthChange,
  onSelectPrediction,
}: Props) {
  const [cursor, setCursor] = useState<Date>(() => {
    const base = initialMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const autoSelectedDateRef = useRef<string | null>(null);
  const previousMonthKeyRef = useRef<string>(formatScheduleMonthKey(cursor));
  const selectedDateButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    onMonthChange?.(formatScheduleMonthKey(cursor));
  }, [cursor, onMonthChange]);

  const byDate = useMemo(() => {
    const map = new Map<string, Game[]>();
    games.forEach((g) => {
      const key = gameDateKey(g);
      if (!key) return;
      const list = map.get(key) ?? [];
      list.push(g);
      map.set(key, list);
    });
    return map;
  }, [games]);

  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const monthDates = useMemo(() => buildScheduleMonthDates(cursor), [cursor]);
  const title = `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = formatScheduleDateKey(new Date());
  const monthKey = formatScheduleMonthKey(cursor);
  const gameDateKeys = useMemo(
    () => Array.from(byDate.keys())
      .filter((dateKey) => isScheduleDateKeyInMonth(dateKey, cursor))
      .sort(),
    [byDate, cursor],
  );
  const autoSelectedDate = useMemo(
    () => resolveScheduleInitialSelectedDate({
      cursor,
      todayKey,
      gameDateKeys,
    }),
    [cursor, gameDateKeys, todayKey],
  );
  const selectedDateKey = selectedDate ?? autoSelectedDate;
  const selectedGames = byDate.get(selectedDateKey) ?? [];
  const monthlyGameCount = gameDateKeys.reduce(
    (count, dateKey) => count + (byDate.get(dateKey)?.length ?? 0),
    0,
  );
  const isManualDataRequired = isManualBaseballDataRequiredCode(errorCode);
  const selectedDateLabel = formatSelectedDateLabel(selectedDateKey);
  const statusSummary = isLoading
    ? '일정을 확인 중입니다'
    : isError
    ? isManualDataRequired ? '야구 데이터 준비가 필요합니다' : '일정을 불러오지 못했습니다'
    : `이번 달 ${monthlyGameCount}경기 · 선택한 날 ${selectedGames.length}경기`;

  useEffect(() => {
    const monthChanged = previousMonthKeyRef.current !== monthKey;
    const shouldApplyAutoSelection =
      monthChanged ||
      selectedDate === null ||
      selectedDate === autoSelectedDateRef.current;

    if (shouldApplyAutoSelection) {
      autoSelectedDateRef.current = autoSelectedDate;
      setSelectedDate(autoSelectedDate);
    }

    previousMonthKeyRef.current = monthKey;
  }, [autoSelectedDate, monthKey, selectedDate]);

  useEffect(() => {
    selectedDateButtonRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }, [isLoading, selectedDateKey]);

  const goPrev = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));

  const renderSelectedDateContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-2">
          <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-200/80" />
        </div>
      );
    }

    if (isError) {
      return (
        <Card className={`p-4 text-sm ${
          isManualDataRequired
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}
        >
          <p className="font-semibold">
            {isManualDataRequired ? '야구 데이터 준비가 필요합니다' : '경기 정보를 불러오지 못했습니다.'}
          </p>
          <p className="mt-1">
            {errorMessage || '경기 정보를 불러오지 못했습니다.'}
          </p>
          {isManualDataRequired ? (
            <p className="mt-3 inline-flex rounded-md border border-amber-200 bg-white/70 px-2 py-1 font-mono text-xs font-bold text-amber-800">
              {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
            </p>
          ) : null}
        </Card>
      );
    }

    if (selectedGames.length === 0) {
      return (
        <Card className="border-dashed p-4 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {monthlyGameCount === 0 ? '이번 달에 등록된 경기가 없습니다.' : '선택한 날짜에는 경기가 없습니다.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {monthlyGameCount === 0 ? '운영자가 경기 데이터를 등록하면 이곳에 표시됩니다.' : '날짜 레일에서 다른 날짜를 선택해 보세요.'}
          </p>
        </Card>
      );
    }

    return (
      <ul className="grid gap-3 sm:grid-cols-2">
        {selectedGames.map((g) => (
          <li key={g.gameId}>
            {isScheduledLike(g.gameStatus) ? (
              <ScheduledGameCard
                game={g}
                onSelectPrediction={() => onSelectPrediction?.(g)}
              />
            ) : (
              <GameCard
                game={g}
                onSelectPrediction={() => onSelectPrediction?.(g)}
              />
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <section className="mx-auto w-full max-w-5xl p-3 sm:p-6">
      <header className="mb-4 space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-lg font-bold sm:text-2xl">KBO 경기 일정</h1>
          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{statusSummary}</p>
        </div>
        <div className="flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:justify-normal">
          <Button
            variant="ghost"
            size="iconTouch"
            onClick={goPrev}
            aria-label="이전 달"
            data-testid="schedule-month-prev"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0L5.586 10l5.707-5.707a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Button>
          <span className="min-w-[5rem] text-center text-sm font-semibold sm:text-base">{title}</span>
          <Button
            variant="ghost"
            size="iconTouch"
            onClick={goNext}
            aria-label="다음 달"
            data-testid="schedule-month-next"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0L14.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      </header>

      <div
        className="-mx-3 mb-4 overflow-x-auto px-3 pb-2 sm:hidden"
        data-testid="schedule-mobile-date-rail"
      >
        <div className="flex gap-2">
          {isLoading
            ? Array.from({ length: 7 }, (_, index) => (
              <div
                key={`schedule-date-skeleton-${index}`}
                className="h-[58px] min-w-[54px] animate-pulse rounded-xl bg-slate-200"
              />
            ))
            : monthDates.map((d) => {
              const key = formatScheduleDateKey(d);
              const dayGames = byDate.get(key) ?? [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDateKey;
              const weekday = d.getDay();

              return (
                <button
                  key={key}
                  ref={isSelected ? selectedDateButtonRef : undefined}
                  type="button"
                  data-testid="schedule-mobile-date-button"
                  data-date={key}
                  aria-label={`${key} ${dayGames.length}경기`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-[58px] min-w-[54px] rounded-xl border px-2 py-2 text-center transition active:scale-[0.98] ${
                    isSelected
                      ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  <span
                    className={`block text-[11px] font-semibold ${
                      isSelected
                        ? 'text-white/90'
                        : weekday === 0
                        ? 'text-red-500'
                        : weekday === 6
                        ? 'text-blue-500'
                        : 'text-slate-500'
                    }`}
                  >
                    {WEEKDAYS[weekday]}
                  </span>
                  <span className="mt-0.5 block text-base font-bold">{d.getDate()}</span>
                  <span
                    className={`mt-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      dayGames.length > 0
                        ? isSelected
                          ? 'bg-white text-sky-700'
                          : 'bg-emerald-100 text-emerald-700'
                        : isToday && !isSelected
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {dayGames.length}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      <div
        className="hidden grid-cols-7 gap-px overflow-hidden rounded-lg border bg-slate-200 text-xs sm:grid sm:text-sm"
        data-testid="schedule-desktop-month-grid"
      >
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`bg-white py-2 text-center font-medium ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((d) => {
          const key = formatScheduleDateKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayGames = byDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          const weekday = d.getDay();

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`flex min-h-[72px] flex-col gap-1 bg-white p-1 text-left transition sm:min-h-[108px] sm:p-2 ${
                inMonth ? '' : 'bg-slate-50 text-slate-300'
              } ${isSelected ? 'ring-2 ring-sky-500' : 'hover:bg-slate-50'}`}
            >
              <span
                className={`text-[11px] font-semibold sm:text-sm ${
                  isToday
                    ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white'
                    : weekday === 0
                    ? 'text-red-500'
                    : weekday === 6
                    ? 'text-blue-500'
                    : ''
                }`}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayGames.slice(0, 3).map((g) => {
                  const status = (g.gameStatus || '').toUpperCase();
                  const badgeClass = STATUS_BADGE[status] ?? 'bg-slate-100 text-slate-600';
                  return (
                    <div
                      key={g.gameId}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] sm:text-xs ${badgeClass}`}
                    >
                      <TeamLogo team={g.awayTeam} size="sm" className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">vs</span>
                      <TeamLogo team={g.homeTeam} size="sm" className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                  );
                })}
                {dayGames.length > 3 && (
                  <span className="text-[10px] text-slate-500">+{dayGames.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="mt-4 space-y-3"
        data-testid="schedule-selected-date-panel"
        data-date={selectedDateKey}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold sm:text-base">{selectedDateKey} 경기</h2>
            <p className="text-xs text-slate-500">{selectedDateLabel}</p>
          </div>
          {!isLoading && !isError && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {selectedGames.length}경기
            </span>
          )}
        </div>
        {renderSelectedDateContent()}
      </div>
    </section>
  );
}
