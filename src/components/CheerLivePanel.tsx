import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useGamesData } from '../api/home';
import { fetchGameLiveSnapshot } from '../api/prediction';
import type { Game as HomeGame } from '../types/home';
import { cn } from '../lib/utils';
import {
  isManualBaseballDataRequiredCode,
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
  parseError,
} from '../utils/errorUtils';
import { LIVE_GAME_EVENT_LIMIT, LIVE_GAME_POLL_INTERVAL_MS, normalizeLiveStatus } from '../utils/liveGame';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import TeamLogo from './TeamLogo';
import { getAccessibleCheerTextColor } from './cheer/CheerPresentation';
import CheerLiveEventSummary from './CheerLiveEventSummary';

interface CheerLivePanelProps {
  favoriteTeamId: string | null;
  favoriteTeamLabel: string | null;
  favoriteTeamFull: string | null;
  teamAccent: string;
  onGoPrediction: () => void;
}

const isLiveStatus = (status?: string) => (
  ['PLAYING', 'LIVE', 'IN_PROGRESS', 'INPROGRESS'].includes((status || '').trim().toUpperCase())
);

export default function CheerLivePanel({
  favoriteTeamId,
  favoriteTeamLabel,
  favoriteTeamFull,
  teamAccent,
  onGoPrediction,
}: CheerLivePanelProps) {
  const today = useMemo(() => new Date(), []);
  const {
    data: todaysGames = [],
    isLoading,
    isError,
    error: gamesError,
    refetch: refetchGames,
  } = useGamesData(today);
  const featuredGame = useMemo(() => {
    const liveGames = todaysGames.filter((game) => (
      ['PLAYING', 'LIVE', 'IN_PROGRESS', 'INPROGRESS'].includes(normalizeLiveStatus(game.gameStatus))
    ));
    if (liveGames.length === 0) return null;
    if (!favoriteTeamId) return liveGames[0];

    const favoriteNames = [favoriteTeamId, favoriteTeamLabel, favoriteTeamFull]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return liveGames.find((game: HomeGame) => (
      [game.homeTeam, game.awayTeam, game.homeTeamFull, game.awayTeamFull]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .some((team) => favoriteNames.some((favorite) => team.includes(favorite)))
    )) ?? liveGames[0];
  }, [favoriteTeamFull, favoriteTeamId, favoriteTeamLabel, todaysGames]);
  const {
    data: liveSnapshot = null,
    error: liveSnapshotError,
    isLoading: isLiveSnapshotLoading,
  } = useQuery({
    queryKey: ['cheer-live-snapshot', featuredGame?.gameId],
    queryFn: ({ signal }) => fetchGameLiveSnapshot(featuredGame!.gameId, {
      limit: LIVE_GAME_EVENT_LIMIT,
      signal,
    }),
    enabled: Boolean(featuredGame?.gameId),
    retry: false,
    refetchInterval: featuredGame ? LIVE_GAME_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
  const parsedLiveSnapshotError = liveSnapshotError ? parseError(liveSnapshotError) : null;
  const parsedGamesError = gamesError ? parseError(gamesError) : null;
  const isManualGamesError = isManualBaseballDataRequiredCode(parsedGamesError?.responseCode);
  const teamAccentText = getAccessibleCheerTextColor(teamAccent);
  if (isLoading) {
    return (
      <section className="mx-4 mt-4 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
        <div className="h-5 w-32 rounded bg-slate-200 dark:bg-secondary" />
        <div className="mt-5 h-24 rounded-xl bg-slate-100 dark:bg-secondary" />
        <div className="mt-4 h-11 rounded-full bg-slate-100 dark:bg-secondary" />
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20"
        data-error-code={parsedGamesError?.responseCode || undefined}
      >
        <h2 className="font-black text-red-700 dark:text-red-200">
          {isManualGamesError ? MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE : '라이브 경기 정보를 불러오지 못했습니다.'}
        </h2>
        {isManualGamesError ? (
          <code className="mt-2 inline-flex rounded border border-red-300/70 bg-red-100/70 px-2 py-0.5 text-[11px] text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100">
            {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
          </code>
        ) : null}
        <button
          type="button"
          onClick={() => void refetchGames()}
          className="mt-4 min-h-11 rounded-full border border-red-300 px-4 text-body font-black text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/30"
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (!featuredGame) {
    return (
      <section className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-border dark:bg-card">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">오늘 진행 중인 경기가 없습니다.</h2>
        <p className="mt-2 text-body font-semibold text-slate-500 dark:text-slate-300">
          예정 경기와 분석은 전력분석실에서 확인할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={onGoPrediction}
          className="mt-5 min-h-11 rounded-full px-5 text-body font-black text-white active:scale-[0.98]"
          style={{ backgroundColor: teamAccent, color: teamAccentText }}
        >
          경기 일정 보기
        </button>
      </section>
    );
  }

  const isLive = isLiveStatus(liveSnapshot?.gameStatus || featuredGame.gameStatus);
  const homeScore = liveSnapshot?.homeScore ?? featuredGame.homeScore;
  const awayScore = liveSnapshot?.awayScore ?? featuredGame.awayScore;
  const hasScore = homeScore != null && awayScore != null;

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-border">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">오늘 경기</h2>
          <p className="mt-1 text-caption font-bold text-slate-500 dark:text-slate-300">
            {formatStadiumDisplayName(featuredGame.stadium)} {featuredGame.time ? `/ ${featuredGame.time}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex min-h-8 items-center rounded-full px-3 text-caption font-black',
            isLive
              ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200'
              : 'bg-slate-100 text-slate-600 dark:bg-secondary dark:text-white',
          )}
        >
          {isLive ? 'LIVE' : featuredGame.gameStatusKr || '경기 예정'}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-7">
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamLogo team={featuredGame.awayTeam} size={48} />
          <span className="truncate text-body font-black text-slate-900 dark:text-white">{featuredGame.awayTeamFull || featuredGame.awayTeam}</span>
        </div>
        <div className="min-w-[88px] text-center">
          {hasScore ? (
            <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
              {awayScore} <span className="text-slate-300 dark:text-slate-600">:</span> {homeScore}
            </p>
          ) : (
            <p className="text-sm font-black text-slate-400">VS</p>
          )}
          <p className="mt-1 text-caption font-bold text-slate-500 dark:text-slate-300">
            {isLive ? '실시간 경기' : featuredGame.gameStatusKr || '경기 예정'}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamLogo team={featuredGame.homeTeam} size={48} />
          <span className="truncate text-body font-black text-slate-900 dark:text-white">{featuredGame.homeTeamFull || featuredGame.homeTeam}</span>
        </div>
      </div>
      <CheerLiveEventSummary
        snapshot={liveSnapshot}
        isLoading={isLiveSnapshotLoading}
        errorMessage={parsedLiveSnapshotError?.message}
        errorCode={parsedLiveSnapshotError?.responseCode}
      />
      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={onGoPrediction}
          className="min-h-11 w-full rounded-full text-body font-black text-white active:scale-[0.98]"
          style={{ backgroundColor: teamAccent, color: teamAccentText }}
        >
          경기 상세 보기
        </button>
      </div>
    </section>
  );
}
