import type {
  Game,
  GameDetail,
  MatchDayNavigation,
  Pitcher,
} from '../types/prediction';

export interface PredictionMatchRangePage {
  content: Game[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
);

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNumber = (value: unknown, fallback = 0): number => (
  toNullableNumber(value) ?? fallback
);

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = `${value}`.trim();
  return text ? text : null;
};

const toString = (value: unknown, fallback = ''): string => (
  toNullableString(value) ?? fallback
);

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return fallback;
};

const padTimePart = (value: number): string => String(value).padStart(2, '0');

export const toPredictionStartTime = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return toNullableString(value);
  }

  const source = asRecord(value);
  const hour = toNullableNumber(source.hour);
  const minute = toNullableNumber(source.minute);
  if (hour === null || minute === null) {
    return null;
  }

  const second = toNullableNumber(source.second);
  const baseTime = `${padTimePart(hour)}:${padTimePart(minute)}`;
  if (!('second' in source) || second === null) {
    return baseTime;
  }
  return `${baseTime}:${padTimePart(second)}`;
};

const toPitcher = (value: unknown): Pitcher | null => {
  const source = asRecord(value);
  const name = toNullableString(source.name);
  if (!name) {
    return null;
  }
  return {
    name,
    era: toNullableString(source.era),
    win: toNullableNumber(source.win),
    loss: toNullableNumber(source.loss),
    imgUrl: toNullableString(source.imgUrl ?? source.img_url),
  };
};

const toWinProbability = (value: unknown): Game['winProbability'] => {
  const source = asRecord(value);
  const home = toNullableNumber(source.home);
  const away = toNullableNumber(source.away);
  if (home === null || away === null) {
    return undefined;
  }
  return { home, away };
};

export const toPredictionGame = (value: unknown): Game => {
  const source = asRecord(value);
  return {
    gameId: toString(source.gameId ?? source.game_id),
    gameDate: toNullableString(source.gameDate ?? source.game_date) ?? undefined,
    homeTeam: toString(source.homeTeam ?? source.home_team),
    awayTeam: toString(source.awayTeam ?? source.away_team),
    stadium: toString(source.stadium),
    startTime: toPredictionStartTime(source.startTime ?? source.start_time),
    homeScore: toNullableNumber(source.homeScore ?? source.home_score),
    awayScore: toNullableNumber(source.awayScore ?? source.away_score),
    winner: toNullableString(source.winner),
    gameStatus: toNullableString(source.gameStatus ?? source.game_status),
    homePitcher: toPitcher(source.homePitcher ?? source.home_pitcher),
    awayPitcher: toPitcher(source.awayPitcher ?? source.away_pitcher),
    aiSummary: toNullableString(source.aiSummary ?? source.ai_summary),
    winProbability: toWinProbability(source.winProbability ?? source.win_probability),
    seasonId: toNullableNumber(source.seasonId ?? source.season_id) ?? undefined,
    leagueType: toNullableString(source.leagueType ?? source.league_type) ?? undefined,
    postSeasonSeries: toNullableString(source.postSeasonSeries ?? source.post_season_series) ?? undefined,
    seriesGameNo: toNullableNumber(source.seriesGameNo ?? source.series_game_no) ?? undefined,
    liveLastEventSeq: toNullableNumber(source.liveLastEventSeq ?? source.live_last_event_seq),
    liveLastUpdatedAt: toNullableString(source.liveLastUpdatedAt ?? source.live_last_updated_at),
  };
};

export const toPredictionGames = (value: unknown): Game[] => (
  Array.isArray(value) ? value.map(toPredictionGame) : []
);

export const toPredictionMatchRangePage = (
  value: unknown,
  fallback?: { page?: number; size?: number }
): PredictionMatchRangePage => {
  const source = asRecord(value);
  return {
    content: toPredictionGames(source.content),
    page: toNumber(source.page, fallback?.page ?? 0),
    size: toNumber(source.size, fallback?.size ?? 0),
    totalElements: toNumber(source.totalElements ?? source.total_elements),
    totalPages: toNumber(source.totalPages ?? source.total_pages),
    hasNext: toBoolean(source.hasNext ?? source.has_next),
    hasPrevious: toBoolean(source.hasPrevious ?? source.has_previous),
  };
};

export const toPredictionMatchDayNavigation = (value: unknown): MatchDayNavigation => {
  const source = asRecord(value);
  return {
    date: toString(source.date),
    games: toPredictionGames(source.games),
    prevDate: toNullableString(source.prevDate ?? source.prev_date),
    nextDate: toNullableString(source.nextDate ?? source.next_date),
    hasPrev: toBoolean(source.hasPrev ?? source.has_prev),
    hasNext: toBoolean(source.hasNext ?? source.has_next),
  };
};

export const toPredictionGameDetail = (value: unknown): GameDetail => {
  const source = asRecord(value);
  return {
    gameId: toString(source.gameId ?? source.game_id),
    gameDate: toNullableString(source.gameDate ?? source.game_date) ?? undefined,
    stadium: toNullableString(source.stadium),
    stadiumName: toNullableString(source.stadiumName ?? source.stadium_name),
    startTime: toPredictionStartTime(source.startTime ?? source.start_time),
    attendance: toNullableNumber(source.attendance),
    weather: toNullableString(source.weather),
    gameTimeMinutes: toNullableNumber(source.gameTimeMinutes ?? source.game_time_minutes),
    homeTeam: toString(source.homeTeam ?? source.home_team),
    awayTeam: toString(source.awayTeam ?? source.away_team),
    homeScore: toNullableNumber(source.homeScore ?? source.home_score),
    awayScore: toNullableNumber(source.awayScore ?? source.away_score),
    homePitcher: toNullableString(source.homePitcher ?? source.home_pitcher),
    awayPitcher: toNullableString(source.awayPitcher ?? source.away_pitcher),
    gameStatus: toNullableString(source.gameStatus ?? source.game_status),
    inningScores: Array.isArray(source.inningScores ?? source.inning_scores)
      ? (source.inningScores ?? source.inning_scores) as GameDetail['inningScores']
      : undefined,
    summary: Array.isArray(source.summary)
      ? source.summary as GameDetail['summary']
      : undefined,
  };
};
