import type { Game as HomeGame } from '../types/home';
import type {
  Game,
  GameDetail,
  GameLiveEvent,
  GameLiveSnapshot,
  GameLiveSummary,
  GameRelayEvent,
  GameRelaySnapshot,
} from '../types/prediction';

export const LIVE_GAME_POLL_INTERVAL_MS = 5000;
export const LIVE_GAME_EVENT_LIMIT = 50;
export const LIVE_RELAY_EVENT_LIMIT = 50;
export const LIVE_GAME_EVENT_CACHE_LIMIT = 200;
export const LIVE_RELAY_EVENT_CACHE_LIMIT = 200;
export const HOME_LIVE_SUMMARY_TIMEOUT_WARN_THRESHOLD = 3;

export interface HomeLiveSummaryTimeoutWarningState {
  consecutiveTimeoutCount: number;
  timeoutWarningLogged: boolean;
}

export const createHomeLiveSummaryTimeoutWarningState = (): HomeLiveSummaryTimeoutWarningState => ({
  consecutiveTimeoutCount: 0,
  timeoutWarningLogged: false,
});

export const resetHomeLiveSummaryTimeoutWarningState = (
  state: HomeLiveSummaryTimeoutWarningState,
): void => {
  state.consecutiveTimeoutCount = 0;
  state.timeoutWarningLogged = false;
};

export const recordHomeLiveSummaryTimeoutFailure = (
  state: HomeLiveSummaryTimeoutWarningState,
  warnThreshold = HOME_LIVE_SUMMARY_TIMEOUT_WARN_THRESHOLD,
): boolean => {
  state.consecutiveTimeoutCount += 1;
  if (state.consecutiveTimeoutCount >= warnThreshold && !state.timeoutWarningLogged) {
    state.timeoutWarningLogged = true;
    return true;
  }
  return false;
};

type LiveMergeTarget = {
  gameId: string;
  gameStatus?: string | null;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  liveLastEventSeq?: number | null;
  liveLastUpdatedAt?: string | null;
};

const LIVE_STATUSES = new Set(['LIVE', 'IN_PROGRESS', 'INPROGRESS', 'PLAYING']);
const SKIP_LIVE_POLL_STATUSES = new Set(['CANCELLED', 'POSTPONED']);

export const normalizeLiveStatus = (value?: string | null): string => (
  value?.trim().toUpperCase() || ''
);

const toEventKey = (event: GameLiveEvent, index: number): string => (
  event.eventSeq == null
    ? `pending-${event.inning ?? 'x'}-${event.inningHalf ?? 'x'}-${event.description ?? ''}-${index}`
    : `seq-${event.eventSeq}`
);

const toRelayEventKey = (event: GameRelayEvent, index: number): string => (
  event.relayId == null
    ? `pending-${event.inning ?? 'x'}-${event.inningHalf ?? 'x'}-${event.playDescription ?? ''}-${index}`
    : `relay-${event.relayId}`
);

export const mergeLiveEvents = (
  existing: GameLiveEvent[] = [],
  incoming: GameLiveEvent[] = [],
  maxEvents = LIVE_GAME_EVENT_CACHE_LIMIT,
): GameLiveEvent[] => {
  const byKey = new Map<string, GameLiveEvent>();
  [...existing, ...incoming].forEach((event, index) => {
    byKey.set(toEventKey(event, index), event);
  });

  return Array.from(byKey.values())
    .sort((left, right) => {
      const leftSeq = left.eventSeq ?? Number.MAX_SAFE_INTEGER;
      const rightSeq = right.eventSeq ?? Number.MAX_SAFE_INTEGER;
      if (leftSeq !== rightSeq) {
        return leftSeq - rightSeq;
      }
      return `${left.updatedAt ?? ''}`.localeCompare(`${right.updatedAt ?? ''}`);
    })
    .slice(-maxEvents);
};

export const mergeRelayEvents = (
  existing: GameRelayEvent[] = [],
  incoming: GameRelayEvent[] = [],
  maxEvents = LIVE_RELAY_EVENT_CACHE_LIMIT,
): GameRelayEvent[] => {
  const byKey = new Map<string, GameRelayEvent>();
  [...existing, ...incoming].forEach((event, index) => {
    byKey.set(toRelayEventKey(event, index), event);
  });

  return Array.from(byKey.values())
    .sort((left, right) => {
      const leftId = left.relayId ?? Number.MAX_SAFE_INTEGER;
      const rightId = right.relayId ?? Number.MAX_SAFE_INTEGER;
      if (leftId !== rightId) {
        return leftId - rightId;
      }
      return `${left.updatedAt ?? left.createdAt ?? ''}`.localeCompare(`${right.updatedAt ?? right.createdAt ?? ''}`);
    })
    .slice(-maxEvents);
};

export const mergeGameDetailWithLiveSnapshot = (
  detail: GameDetail | null | undefined,
  snapshot: GameLiveSnapshot,
  fallbackGame?: Game | null,
): GameDetail => {
  const base: GameDetail = detail ?? {
    gameId: snapshot.gameId,
    gameDate: fallbackGame?.gameDate,
    stadium: fallbackGame?.stadium,
    homeTeam: fallbackGame?.homeTeam || '',
    awayTeam: fallbackGame?.awayTeam || '',
    homeScore: fallbackGame?.homeScore ?? null,
    awayScore: fallbackGame?.awayScore ?? null,
    gameStatus: fallbackGame?.gameStatus ?? null,
    startTime: fallbackGame?.startTime ?? null,
    summary: [],
    inningScores: [],
  };
  const nextEvents = mergeLiveEvents(base.liveEvents, snapshot.events);
  const nextInningScores = Array.isArray(snapshot.inningScores)
    ? snapshot.inningScores
    : base.inningScores;

  return {
    ...base,
    gameId: base.gameId || snapshot.gameId,
    gameStatus: snapshot.gameStatus ?? base.gameStatus,
    homeScore: snapshot.homeScore ?? base.homeScore,
    awayScore: snapshot.awayScore ?? base.awayScore,
    inningScores: nextInningScores,
    liveEvents: nextEvents,
    liveLastEventSeq: snapshot.lastEventSeq ?? base.liveLastEventSeq ?? resolveLastEventSeq(nextEvents),
    liveLastUpdatedAt: snapshot.lastUpdatedAt ?? base.liveLastUpdatedAt ?? null,
    liveStatusError: null,
  };
};

export const mergeGameDetailWithRelaySnapshot = (
  detail: GameDetail | null | undefined,
  snapshot: GameRelaySnapshot,
  fallbackGame?: Game | null,
): GameDetail => {
  const base: GameDetail = detail ?? {
    gameId: snapshot.gameId,
    gameDate: fallbackGame?.gameDate,
    stadium: fallbackGame?.stadium,
    homeTeam: fallbackGame?.homeTeam || '',
    awayTeam: fallbackGame?.awayTeam || '',
    homeScore: fallbackGame?.homeScore ?? null,
    awayScore: fallbackGame?.awayScore ?? null,
    gameStatus: fallbackGame?.gameStatus ?? null,
    startTime: fallbackGame?.startTime ?? null,
    summary: [],
    inningScores: [],
  };
  const nextRelayEvents = mergeRelayEvents(base.liveRelayEvents, snapshot.events);

  return {
    ...base,
    gameId: base.gameId || snapshot.gameId,
    liveRelayEvents: nextRelayEvents,
    liveLastRelayId: snapshot.lastRelayId ?? base.liveLastRelayId ?? resolveLastRelayId(nextRelayEvents),
    liveRelayLastUpdatedAt: snapshot.lastUpdatedAt ?? base.liveRelayLastUpdatedAt ?? null,
    liveRelayError: null,
  };
};

export const mergeGameDetailLiveStatusError = (
  detail: GameDetail | null | undefined,
  errorMessage: string,
  fallbackGame?: Game | null,
): GameDetail | null => {
  if (!detail && !fallbackGame) {
    return null;
  }
  const base: GameDetail = detail ?? {
    gameId: fallbackGame?.gameId || '',
    gameDate: fallbackGame?.gameDate,
    stadium: fallbackGame?.stadium,
    homeTeam: fallbackGame?.homeTeam || '',
    awayTeam: fallbackGame?.awayTeam || '',
    homeScore: fallbackGame?.homeScore ?? null,
    awayScore: fallbackGame?.awayScore ?? null,
    gameStatus: fallbackGame?.gameStatus ?? null,
    startTime: fallbackGame?.startTime ?? null,
    summary: [],
    inningScores: [],
  };
  return {
    ...base,
    liveStatusError: errorMessage,
  };
};

export const mergeGameDetailRelayError = (
  detail: GameDetail | null | undefined,
  errorMessage: string,
  fallbackGame?: Game | null,
): GameDetail | null => {
  if (!detail && !fallbackGame) {
    return null;
  }
  const base: GameDetail = detail ?? {
    gameId: fallbackGame?.gameId || '',
    gameDate: fallbackGame?.gameDate,
    stadium: fallbackGame?.stadium,
    homeTeam: fallbackGame?.homeTeam || '',
    awayTeam: fallbackGame?.awayTeam || '',
    homeScore: fallbackGame?.homeScore ?? null,
    awayScore: fallbackGame?.awayScore ?? null,
    gameStatus: fallbackGame?.gameStatus ?? null,
    startTime: fallbackGame?.startTime ?? null,
    summary: [],
    inningScores: [],
  };
  return {
    ...base,
    liveRelayError: errorMessage,
  };
};

export const mergeHomeGamesWithLiveSummaries = <T extends LiveMergeTarget>(
  games: T[],
  summaries: GameLiveSummary[],
): T[] => {
  if (!games.length || !summaries.length) {
    return games;
  }
  const summariesById = new Map(summaries.map((summary) => [summary.gameId, summary]));
  let changed = false;

  const nextGames = games.map((game) => {
    const summary = summariesById.get(game.gameId);
    if (!summary) {
      return game;
    }
    const nextGame = {
      ...game,
      gameStatus: summary.gameStatus ?? game.gameStatus,
      homeScore: summary.homeScore ?? game.homeScore,
      awayScore: summary.awayScore ?? game.awayScore,
      liveLastEventSeq: summary.lastEventSeq ?? game.liveLastEventSeq ?? null,
      liveLastUpdatedAt: summary.lastUpdatedAt ?? game.liveLastUpdatedAt ?? null,
    };
    if (
      nextGame.gameStatus !== game.gameStatus
      || nextGame.homeScore !== game.homeScore
      || nextGame.awayScore !== game.awayScore
      || nextGame.liveLastEventSeq !== game.liveLastEventSeq
      || nextGame.liveLastUpdatedAt !== game.liveLastUpdatedAt
    ) {
      changed = true;
      return nextGame;
    }
    return game;
  });

  return changed ? nextGames : games;
};

export const shouldPollPredictionLiveGame = (game?: Game | null, detail?: GameDetail | null): boolean => {
  const status = normalizeLiveStatus(detail?.gameStatus || game?.gameStatus);
  if (SKIP_LIVE_POLL_STATUSES.has(status)) {
    return false;
  }
  const dateKey = detail?.gameDate || game?.gameDate;
  const todayKey = toDateKey(new Date());
  return status === '' || LIVE_STATUSES.has(status) || dateKey === todayKey;
};

export const selectHomeLivePollingGameIds = (
  games: HomeGame[],
  scheduledGames: HomeGame[],
  selectedDateKey: string,
  todayKey = toDateKey(new Date()),
): string[] => {
  const ids = new Set<string>();
  [...games, ...scheduledGames].forEach((game) => {
    const status = normalizeLiveStatus(game.gameStatus);
    if (SKIP_LIVE_POLL_STATUSES.has(status)) {
      return;
    }
    const gameDate = game.sourceDate || game.gameDate || selectedDateKey;
    if (gameDate === todayKey || LIVE_STATUSES.has(status)) {
      ids.add(game.gameId);
    }
  });
  return Array.from(ids);
};

const resolveLastEventSeq = (events: GameLiveEvent[]): number | null => {
  const seqs = events
    .map((event) => event.eventSeq)
    .filter((seq): seq is number => typeof seq === 'number' && Number.isFinite(seq));
  return seqs.length ? Math.max(...seqs) : null;
};

const resolveLastRelayId = (events: GameRelayEvent[]): number | null => {
  const ids = events
    .map((event) => event.relayId)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  return ids.length ? Math.max(...ids) : null;
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
