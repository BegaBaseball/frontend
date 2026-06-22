import type { Game } from '../types/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID } from '../constants/teams';

export type CoachRequestMode = 'auto_brief' | 'manual_detail';
export type CoachAnalysisType = 'game_review' | 'game_preview';

export interface CoachBriefingLeagueSnapshot {
  rank: number;
  gamesBehind: number;
  remainingGames: number;
}

export interface CoachBriefingRequestDescriptorInput {
  game: Game | null;
  requestMode: CoachRequestMode;
  analysisType: CoachAnalysisType;
  focus: string[];
  requestSeasonYear?: number;
  requestLeagueTypeCode?: number;
  homePitcherName?: string;
  awayPitcherName?: string;
  homeSeasonContext?: CoachBriefingLeagueSnapshot | null;
  awaySeasonContext?: CoachBriefingLeagueSnapshot | null;
}

export interface CoachBriefingAnalyzePayload {
  home_team_id: string;
  away_team_id: string;
  league_context: {
    season?: number | string;
    season_year?: number;
    game_date?: string;
    league_type?: string;
    league_type_code?: number;
    round?: string;
    stage_label?: string;
    game_no?: number;
    series_game_no?: number;
    home_pitcher?: string;
    away_pitcher?: string;
    home?: CoachBriefingLeagueSnapshot | null;
    away?: CoachBriefingLeagueSnapshot | null;
  };
  focus: string[];
  request_mode: CoachRequestMode;
  analysis_type: CoachAnalysisType;
  game_id: string;
}

export interface CoachBriefingRequestDescriptor {
  requestFingerprint: string;
  requestCacheKey: string;
  requestPayload: CoachBriefingAnalyzePayload;
}

export const buildCoachBriefingRequestDescriptor = ({
  game,
  requestMode,
  analysisType,
  focus,
  requestSeasonYear,
  requestLeagueTypeCode,
  homePitcherName,
  awayPitcherName,
  homeSeasonContext,
  awaySeasonContext,
}: CoachBriefingRequestDescriptorInput): CoachBriefingRequestDescriptor | null => {
  if (!game?.gameId || !game.homeTeam || !game.awayTeam) {
    return null;
  }

  const homeTeamName = TEAM_DATA[game.homeTeam]?.fullName || game.homeTeam;
  const awayTeamName = TEAM_DATA[game.awayTeam]?.fullName || game.awayTeam;
  const homeTeamId = TEAM_NAME_TO_ID[homeTeamName] || game.homeTeam;
  const awayTeamId = TEAM_NAME_TO_ID[awayTeamName] || game.awayTeam;
  const normalizedFocus = focus.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const requestPayload: CoachBriefingAnalyzePayload = {
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    league_context: {
      season: game.seasonId,
      season_year: requestSeasonYear,
      game_date: game.gameDate,
      league_type: game.leagueType,
      league_type_code: requestLeagueTypeCode,
      round: game.postSeasonSeries,
      stage_label: game.postSeasonSeries,
      game_no: game.seriesGameNo,
      series_game_no: game.seriesGameNo,
      home_pitcher: homePitcherName,
      away_pitcher: awayPitcherName,
      home: homeSeasonContext,
      away: awaySeasonContext,
    },
    focus: normalizedFocus,
    request_mode: requestMode,
    analysis_type: analysisType,
    game_id: game.gameId,
  };

  const requestFingerprint = JSON.stringify(requestPayload);

  return {
    requestFingerprint,
    requestCacheKey: requestFingerprint,
    requestPayload,
  };
};
