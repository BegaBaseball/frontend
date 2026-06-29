import { GAME_TIME } from '../constants/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID, getFullTeamName } from '../constants/teams';
import type { Game } from '../types/prediction';
import { resolveWinProbabilityDisplay, type WinProbabilityDisplay } from './coachWinProbability';
import { formatTime } from './inningScoreParser';
import { getGameStatus, type GameStatusCode } from './predictionStatus';
import { formatStadiumDisplayName } from './stadiumDisplay';

export type PredictionScheduleDateRailItem = {
  date: string;
  day: number;
  weekday: string;
  isToday: boolean;
  isSelected: boolean;
};

export type PredictionScheduleStatusTone = 'scheduled' | 'live' | 'closed' | 'unavailable';

export type PredictionScheduleStatusModel = {
  code: GameStatusCode;
  label: '예정' | '진행중' | '실시간 확인중' | '종료' | '연기' | '취소';
  tone: PredictionScheduleStatusTone;
  isUnavailable: boolean;
  hasScore: boolean;
  scoreLabel: string | null;
};

export type PredictionScheduleTeamModel = {
  rawName: string;
  fullName: string;
  shortName: string;
  pitcherName: string;
};

export type PredictionScheduleWinnerSide = 'away' | 'home' | null;

export type PredictionScheduleRowViewModel = {
  gameId: string;
  gameDate: string;
  startTimeLabel: string;
  stadiumLabel: string;
  awayTeam: PredictionScheduleTeamModel;
  homeTeam: PredictionScheduleTeamModel;
  status: PredictionScheduleStatusModel;
  winnerSide: PredictionScheduleWinnerSide;
  winProbability: WinProbabilityDisplay | null;
  canEnterDetail: boolean;
  ariaLabel: string;
};

const DATE_RAIL_SIZE = 13;
const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const hasKnownScore = (value?: number | null) => value !== null && value !== undefined;

export const parsePredictionScheduleDateKey = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

export const formatPredictionScheduleDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysInMonth = (year: number, monthIndex: number) => (
  new Date(year, monthIndex + 1, 0, 12).getDate()
);

export const getPredictionScheduleTodayKey = () => formatPredictionScheduleDateKey(new Date());

const getSafeCurrentDate = (currentDate: string) => parsePredictionScheduleDateKey(currentDate) || new Date();

export const buildPredictionScheduleDateRail = (
  currentDate: string,
  todayDate: Date = new Date(),
): PredictionScheduleDateRailItem[] => {
  const selectedDate = getSafeCurrentDate(currentDate);
  const year = selectedDate.getFullYear();
  const monthIndex = selectedDate.getMonth();
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const displayCount = Math.min(DATE_RAIL_SIZE, daysInMonth);
  const halfWindow = Math.floor(displayCount / 2);
  const lastStartDay = Math.max(1, daysInMonth - displayCount + 1);
  const startDay = Math.max(1, Math.min(selectedDate.getDate() - halfWindow, lastStartDay));
  const todayKey = formatPredictionScheduleDateKey(todayDate);
  const selectedKey = formatPredictionScheduleDateKey(selectedDate);

  return Array.from({ length: displayCount }, (_, index) => {
    const date = new Date(year, monthIndex, startDay + index, 12);
    const dateKey = formatPredictionScheduleDateKey(date);
    return {
      date: dateKey,
      day: date.getDate(),
      weekday: KOREAN_WEEKDAYS[date.getDay()],
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedKey,
    };
  });
};

export const resolvePredictionScheduleMonthDate = (currentDate: string, monthOffset: number) => {
  const sourceDate = getSafeCurrentDate(currentDate);
  const targetYear = sourceDate.getFullYear();
  const targetMonthIndex = sourceDate.getMonth() + monthOffset;
  const targetMonthLastDay = getDaysInMonth(targetYear, targetMonthIndex);
  const targetDay = Math.min(sourceDate.getDate(), targetMonthLastDay);
  return formatPredictionScheduleDateKey(new Date(targetYear, targetMonthIndex, targetDay, 12));
};

export const getPredictionScheduleMonthTitle = (currentDate: string) => {
  const date = getSafeCurrentDate(currentDate);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getPredictionScheduleTeamShortName = (teamId: string) => {
  const normalizedTeamId = teamId.trim();
  const mappedTeamId = TEAM_NAME_TO_ID[normalizedTeamId] || normalizedTeamId;
  return TEAM_DATA[mappedTeamId]?.name || getFullTeamName(normalizedTeamId).split(' ')[0] || normalizedTeamId;
};

const getPitcherName = (pitcher?: Game['homePitcher']) => {
  const pitcherName = pitcher?.name?.trim();
  return pitcherName || '발표 전';
};

const getScheduleStatusLabel = (statusCode: GameStatusCode): PredictionScheduleStatusModel['label'] => {
  if (statusCode === 'LIVE') return '진행중';
  if (statusCode === 'COMPLETED' || statusCode === 'DRAW') return '종료';
  if (statusCode === 'POSTPONED') return '연기';
  if (statusCode === 'CANCELLED') return '취소';
  return '예정';
};

const getScheduleStatusTone = (statusCode: GameStatusCode): PredictionScheduleStatusTone => {
  if (statusCode === 'LIVE') {
    return 'live';
  }
  if (statusCode === 'COMPLETED' || statusCode === 'DRAW') {
    return 'closed';
  }
  if (statusCode === 'POSTPONED' || statusCode === 'CANCELLED') {
    return 'unavailable';
  }
  return 'scheduled';
};

export const resolvePredictionScheduleStatus = (
  game: Game,
  fallbackDate: string,
  currentTime: Date = new Date(),
): PredictionScheduleStatusModel => {
  const sourceStatus = (game.gameStatus || '').trim().toUpperCase();
  const runtimeStatus = getGameStatus(game, currentTime, {
    gameStatus: game.gameStatus,
    gameDate: game.gameDate || fallbackDate,
    startTime: game.startTime || null,
    homeScore: game.homeScore ?? null,
    awayScore: game.awayScore ?? null,
    hasProgressData: game.homeScore != null && game.awayScore != null,
  });
  const hasScore = hasKnownScore(game.awayScore) && hasKnownScore(game.homeScore);
  const hasScheduledSourceStatus = sourceStatus === ''
    || ['UNKNOWN', 'TBD', 'PENDING', 'READY', 'NOT_STARTED', 'NONE', 'SCHEDULED'].includes(sourceStatus);
  const isStartedScheduledGameAwaitingLiveData = runtimeStatus.isToday
    && runtimeStatus.hasStarted
    && hasScheduledSourceStatus
    && !hasScore;

  if (isStartedScheduledGameAwaitingLiveData) {
    return {
      code: 'LIVE',
      label: '실시간 확인중',
      tone: 'live',
      isUnavailable: false,
      hasScore,
      scoreLabel: null,
    };
  }

  return {
    code: runtimeStatus.statusCode,
    label: getScheduleStatusLabel(runtimeStatus.statusCode),
    tone: getScheduleStatusTone(runtimeStatus.statusCode),
    isUnavailable: runtimeStatus.statusCode === 'POSTPONED' || runtimeStatus.statusCode === 'CANCELLED',
    hasScore,
    scoreLabel: hasScore ? `${game.awayScore} : ${game.homeScore}` : null,
  };
};

const buildTeamModel = (team: string, pitcher?: Game['homePitcher']): PredictionScheduleTeamModel => ({
  rawName: team,
  fullName: getFullTeamName(team),
  shortName: getPredictionScheduleTeamShortName(team),
  pitcherName: getPitcherName(pitcher),
});

const normalizeWinnerText = (value?: string | null) => (value || '').trim().toLowerCase();

const resolveWinnerSide = (
  game: Game,
  status: PredictionScheduleStatusModel,
  awayTeam: PredictionScheduleTeamModel,
  homeTeam: PredictionScheduleTeamModel,
): PredictionScheduleWinnerSide => {
  if (status.code !== 'COMPLETED' && status.code !== 'DRAW') {
    return null;
  }

  if (status.hasScore) {
    const awayScore = Number(game.awayScore);
    const homeScore = Number(game.homeScore);
    if (Number.isFinite(awayScore) && Number.isFinite(homeScore) && awayScore !== homeScore) {
      return awayScore > homeScore ? 'away' : 'home';
    }
  }

  const winnerText = normalizeWinnerText(game.winner);
  if (!winnerText || winnerText === 'draw') {
    return null;
  }

  const awayCandidates = [
    'away',
    awayTeam.rawName,
    awayTeam.fullName,
    awayTeam.shortName,
  ].map(normalizeWinnerText);
  const homeCandidates = [
    'home',
    homeTeam.rawName,
    homeTeam.fullName,
    homeTeam.shortName,
  ].map(normalizeWinnerText);

  if (awayCandidates.includes(winnerText)) {
    return 'away';
  }
  if (homeCandidates.includes(winnerText)) {
    return 'home';
  }
  return null;
};

const resolveScheduleWinProbability = (
  game: Game,
  status: PredictionScheduleStatusModel,
): WinProbabilityDisplay | null => {
  if (status.code !== 'SCHEDULED') {
    return null;
  }
  return resolveWinProbabilityDisplay(game.winProbability?.home ?? null);
};

export const buildPredictionScheduleRowViewModel = (
  game: Game,
  fallbackDate: string,
  currentTime: Date = new Date(),
): PredictionScheduleRowViewModel => {
  const status = resolvePredictionScheduleStatus(game, fallbackDate, currentTime);
  const awayTeam = buildTeamModel(game.awayTeam, game.awayPitcher);
  const homeTeam = buildTeamModel(game.homeTeam, game.homePitcher);
  const startTimeLabel = formatTime(game.startTime || null) || GAME_TIME;
  const stadiumLabel = formatStadiumDisplayName(game.stadium) || '구장 미정';
  const winnerSide = resolveWinnerSide(game, status, awayTeam, homeTeam);
  const winProbability = resolveScheduleWinProbability(game, status);

  return {
    gameId: game.gameId,
    gameDate: game.gameDate || fallbackDate,
    startTimeLabel,
    stadiumLabel,
    awayTeam,
    homeTeam,
    status,
    winnerSide,
    winProbability,
    canEnterDetail: !status.isUnavailable,
    ariaLabel: `${awayTeam.fullName} 대 ${homeTeam.fullName} ${status.label}`,
  };
};
