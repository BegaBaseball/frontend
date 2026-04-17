import { useEffect, useMemo, useState } from 'react';
import type { Game } from '@/types/home';
import TeamLogo from '@/components/TeamLogo';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import GameCard from '@/components/GameCard';
import ScheduledGameCard from '@/components/ScheduledGameCard';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-red-100 text-red-700 animate-pulse',
  FINAL: 'bg-emerald-100 text-emerald-700',
  POSTPONED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-zinc-200 text-zinc-500 line-through',
};

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toYm = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

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

const gameDateKey = (g: Game): string | null => g.gameDate ?? g.sourceDate ?? null;

const isScheduledLike = (status: string) => {
  const s = (status || '').toUpperCase();
  return s === 'SCHEDULED' || s === 'POSTPONED' || s === 'CANCELLED';
};

interface Props {
  games: Game[];
  initialMonth?: Date;
  onMonthChange?: (ym: string) => void;
  onSelectPrediction?: (game: Game) => void;
}

export default function ScheduleCalendar({
  games,
  initialMonth,
  onMonthChange,
  onSelectPrediction,
}: Props) {
  const [cursor, setCursor] = useState<Date>(() => {
    const base = initialMonth ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    onMonthChange?.(toYm(cursor));
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
  const title = `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = toKey(new Date());
  const selectedGames = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  const goPrev = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));

  return (
    <section className="mx-auto w-full max-w-5xl p-3 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold sm:text-2xl">KBO 경기 일정</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goPrev} aria-label="이전 달">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0L5.586 10l5.707-5.707a1 1 0 111.414 1.414L8.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Button>
          <span className="min-w-[5rem] text-center text-sm font-semibold sm:text-base">{title}</span>
          <Button variant="ghost" size="icon" onClick={goNext} aria-label="다음 달">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0L14.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-slate-200 text-xs sm:text-sm">
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
          const key = toKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayGames = byDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
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

      {selectedDate && (
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold sm:text-base">{selectedDate} 경기</h2>
          {selectedGames.length === 0 ? (
            <Card className="p-4 text-center text-sm text-slate-500">경기가 없습니다.</Card>
          ) : (
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
          )}
        </div>
      )}
    </section>
  );
}
