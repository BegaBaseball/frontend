// constants/home.ts
export const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const CURRENT_SEASON_YEAR = new Date().getFullYear();

export const DEFAULT_LEAGUE_START_DATES = {
    regularSeasonStart: `${CURRENT_SEASON_YEAR}-03-22`,
    postseasonStart: `${CURRENT_SEASON_YEAR}-10-06`,
    koreanSeriesStart: `${CURRENT_SEASON_YEAR}-10-26`
};
