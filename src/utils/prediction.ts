// utils/prediction.ts
import { Game, DateGames } from '../types/prediction';
import { TEAM_FULL_NAMES, DAYS_OF_WEEK } from '../constants/prediction';

/**
 * 날짜별로 경기 그룹화 (오래된 날짜부터 최신 날짜 순)
 */
export const groupByDate = (games: Game[]): DateGames[] => {
  const grouped: { [key: string]: Game[] } = {};

  games.forEach(game => {
    if (!grouped[game.gameDate]) {
      grouped[game.gameDate] = [];
    }
    grouped[game.gameDate].push(game);
  });

  return Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .map(date => ({ date, games: grouped[date] }));
};

/**
 * 팀 짧은 이름 → 전체 이름 변환
 */
export const getFullTeamName = (shortName: string): string => {
  return TEAM_FULL_NAMES[shortName] || shortName;
};

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일 요일)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${DAYS_OF_WEEK[date.getDay()]}요일`;
};

/**
 * 오늘 날짜 문자열 (YYYY-MM-DD)
 */
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 내일 날짜 문자열 (YYYY-MM-DD)
 */
export const getTomorrowString = (): string => {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0];
};

/**
 * 투표 정확도 계산
 */
export const calculateVoteAccuracy = (
  winner: string | null | undefined,
  homeVotes: number,
  awayVotes: number
): number | null => {
  if (!winner || winner === 'draw') return null;

  const totalVotes = homeVotes + awayVotes;
  if (totalVotes === 0) return 0;

  const winningVotes = winner === 'home' ? homeVotes : awayVotes;
  return Math.round((winningVotes / totalVotes) * 100);
};

/**
 * 투표 퍼센티지 계산
 */
export const calculateVotePercentages = (homeVotes: number, awayVotes: number) => {
  const totalVotes = homeVotes + awayVotes;
  const homePercentage = totalVotes > 0 ? Math.round((homeVotes / totalVotes) * 100) : 0;
  const awayPercentage = totalVotes > 0 ? Math.round((awayVotes / totalVotes) * 100) : 0;

  return { homePercentage, awayPercentage, totalVotes };
};

/**
 * 경기 상태 확인
 */
export const getGameStatus = (game: Game | null, currentDate: string) => {
  if (!game) return { isPastGame: false, isFutureGame: false, isToday: false };

  const today = getTodayString();
  const isPastGame = game.homeScore != null;
  const isFutureGame = currentDate > today;
  const isToday = currentDate === today;

  return { isPastGame, isFutureGame, isToday };
};

/**
 * 시작일부터 종료일까지의 날짜 문자열 배열 생성
 */
export const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};