import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ScheduleCalendar from '@/components/ScheduleCalendar';
import { fetchGamesRangeData } from '@/api/home';
import { formatDateForAPI } from '@/utils/home';
import { buildPredictionMatchHandoff } from '@/utils/predictionDeepLink';
import { isManualBaseballDataRequiredCode, parseError } from '@/utils/errorUtils';
import type { Game } from '@/types/home';

function getMonthRange(cursor: Date) {
  const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  return {
    startDate: formatDateForAPI(start),
    endDate: formatDateForAPI(end),
  };
}

export default function SchedulePage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthRange = useMemo(
    () => getMonthRange(cursor),
    [cursor],
  );

  const monthQuery = useQuery({
    queryKey: ['games', 'month', monthRange.startDate, monthRange.endDate],
    queryFn: () => fetchGamesRangeData(monthRange.startDate, monthRange.endDate),
    retry: (failureCount, error) => {
      const parsed = parseError(error);
      return !isManualBaseballDataRequiredCode(parsed.responseCode) && failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const games = useMemo<Game[]>(
    () => monthQuery.data ?? [],
    [monthQuery.data],
  );
  const isLoading = monthQuery.isLoading;
  const hasError = monthQuery.isError;
  const parsedError = useMemo(() => {
    if (!monthQuery.error) {
      return null;
    }

    return parseError(monthQuery.error);
  }, [monthQuery.error]);
  const errorMessage = parsedError?.message || '경기 정보를 불러오지 못했습니다.';
  const errorCode = parsedError?.responseCode ?? null;

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
    const handoff = buildPredictionMatchHandoff({
      sourcePage: 'schedule',
      game,
      fallbackDate: formatDateForAPI(cursor),
    });

    navigate(handoff.path, {
      state: handoff.state,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ScheduleCalendar
        games={games}
        initialMonth={cursor}
        isLoading={isLoading}
        isError={hasError && !isLoading}
        errorMessage={errorMessage}
        errorCode={errorCode}
        onMonthChange={handleMonthChange}
        onSelectPrediction={handleSelectPrediction}
      />
    </div>
  );
}
