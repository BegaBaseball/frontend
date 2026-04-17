import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import { fetchGamesData } from '@/api/home';
import { formatDateForAPI } from '@/utils/home';
import { normalizePredictionDate } from '@/utils/predictionHomeLogic';
import type { Game } from '@/types/home';

function daysInMonth(year: number, month: number): Date[] {
  const last = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => new Date(year, month, i + 1));
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(
    () => daysInMonth(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const queries = useQueries({
    queries: days.map((d) => ({
      queryKey: ['games', formatDateForAPI(d)],
      queryFn: () => fetchGamesData(d),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });

  const games = useMemo<Game[]>(() => {
    const merged: Game[] = [];
    queries.forEach((q) => {
      if (Array.isArray(q.data)) merged.push(...q.data);
    });
    return merged;
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const hasError = queries.some((q) => q.isError);

  const handleMonthChange = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      setCursor((prev) => {
        if (prev.getFullYear() === y && prev.getMonth() === m - 1) return prev;
        return new Date(y, m - 1, 1);
      });
    }
  };

  const handleSelectPrediction = (game: Game) => {
    const targetDate = normalizePredictionDate(
      game.sourceDate || game.gameDate || formatDateForAPI(cursor),
    );
    navigate('/prediction', {
      state: {
        sourcePage: 'schedule',
        gameId: game.gameId,
        date: targetDate,
        game: {
          gameId: game.gameId,
          homeTeam: game.homeTeam,
          homeTeamFull: game.homeTeamFull,
          awayTeam: game.awayTeam,
          awayTeamFull: game.awayTeamFull,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          sourceDate: game.sourceDate,
          date: targetDate,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {isLoading && (
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-6">
          <div className="rounded-md bg-white/80 px-3 py-2 text-xs text-slate-500 shadow-sm sm:text-sm">
            경기 일정을 불러오는 중…
          </div>
        </div>
      )}
      {hasError && !isLoading && (
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-6">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:text-sm">
            일부 날짜의 경기 정보를 불러오지 못했습니다.
          </div>
        </div>
      )}
      <ScheduleCalendar
        games={games}
        initialMonth={cursor}
        onMonthChange={handleMonthChange}
        onSelectPrediction={handleSelectPrediction}
      />
    </div>
  );
}
