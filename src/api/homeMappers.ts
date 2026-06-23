import { getFullTeamName } from '../constants/teams';
import type { Game } from '../types/home';

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
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

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const padTimePart = (value: number): string => String(value).padStart(2, '0');

const toHomeTime = (source: Record<string, unknown>): string => {
  const explicitTime = toNullableString(source.time);
  if (explicitTime) {
    return explicitTime;
  }

  const startTime = source.startTime ?? source.start_time;
  const textStartTime = typeof startTime === 'object' ? null : toNullableString(startTime);
  if (textStartTime) {
    return textStartTime;
  }

  const timeObject = asRecord(startTime);
  const hour = toNullableNumber(timeObject.hour);
  const minute = toNullableNumber(timeObject.minute);
  if (hour === null || minute === null) {
    return '';
  }

  const second = toNullableNumber(timeObject.second);
  const baseTime = `${padTimePart(hour)}:${padTimePart(minute)}`;
  if (!('second' in timeObject) || second === null) {
    return baseTime;
  }
  return `${baseTime}:${padTimePart(second)}`;
};

const toHomeStatusKr = (status: string, explicitStatusKr: unknown): string => {
  const explicit = toNullableString(explicitStatusKr);
  if (explicit) {
    return explicit;
  }

  switch (status.toUpperCase()) {
    case 'SCHEDULED':
      return '예정';
    case 'LIVE':
    case 'IN_PROGRESS':
      return '진행중';
    case 'COMPLETED':
    case 'FINAL':
      return '종료';
    case 'POSTPONED':
      return '연기';
    case 'CANCELLED':
    case 'CANCELED':
      return '취소';
    default:
      return status;
  }
};

export const toHomeGame = (value: unknown): Game => {
  const source = asRecord(value);
  const homeTeam = toString(source.homeTeam ?? source.home_team);
  const awayTeam = toString(source.awayTeam ?? source.away_team);
  const homeTeamFull = toString(source.homeTeamFull ?? source.home_team_full, getFullTeamName(homeTeam));
  const awayTeamFull = toString(source.awayTeamFull ?? source.away_team_full, getFullTeamName(awayTeam));
  const gameStatus = toString(source.gameStatus ?? source.game_status);
  const gameDate = toNullableString(source.gameDate ?? source.game_date);
  const sourceDate = toNullableString(source.sourceDate ?? source.source_date) ?? gameDate ?? undefined;

  return {
    gameId: toString(source.gameId ?? source.game_id),
    gameDate: gameDate ?? undefined,
    sourceDate,
    time: toHomeTime(source),
    stadium: toString(source.stadium),
    gameStatus,
    gameStatusKr: toHomeStatusKr(gameStatus, source.gameStatusKr ?? source.game_status_kr),
    gameInfo: toString(source.gameInfo ?? source.game_info, `${awayTeamFull} vs ${homeTeamFull}`),
    leagueType: toString(source.leagueType ?? source.league_type),
    winner: toNullableString(source.winner) ?? undefined,
    homeTeam,
    homeTeamFull,
    awayTeam,
    awayTeamFull,
    homeScore: toNullableNumber(source.homeScore ?? source.home_score) ?? undefined,
    awayScore: toNullableNumber(source.awayScore ?? source.away_score) ?? undefined,
    leagueBadge: toNullableString(source.leagueBadge ?? source.league_badge) ?? undefined,
    liveLastEventSeq: toNullableNumber(source.liveLastEventSeq ?? source.live_last_event_seq),
    liveLastUpdatedAt: toNullableString(source.liveLastUpdatedAt ?? source.live_last_updated_at),
  };
};

export const toHomeGames = (value: unknown): Game[] => (
  Array.isArray(value) ? value.map(toHomeGame) : []
);

export const toHomeGamesFromRange = (value: unknown): Game[] => {
  if (Array.isArray(value)) {
    return toHomeGames(value);
  }

  const source = asRecord(value);
  return toHomeGames(source.content);
};
