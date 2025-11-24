// utils/home.ts
import { Game, FilteredGames } from '../types/home';

/**
 * 경기를 리그 타입별로 필터링
 */
export const filterGamesByLeague = (games: Game[]): FilteredGames => {
  return {
    regular: games.filter((g) => g.leagueType === 'REGULAR'),
    postseason: games.filter((g) => g.leagueType === 'POSTSEASON'),
    koreanSeries: games.filter((g) => g.leagueType === 'KOREAN_SERIES'),
  };
};