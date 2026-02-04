import api from './axios';
import { Game, GameDetail, UserPredictionStat } from '../types/prediction';

/**
 * 과거 경기 데이터 가져오기
 */
export const fetchPastGames = async (): Promise<Game[]> => {
  const response = await api.get<Game[]>('/games/past');
  return response.data;
};

/**
 * 특정 기간의 경기 데이터 가져오기
 */
export const fetchMatchesByRange = async (startDate: string, endDate: string): Promise<Game[]> => {
  const response = await api.get<Game[]>(`/matches/range?startDate=${startDate}&endDate=${endDate}`);
  return response.data;
};

/**
 * 특정 날짜의 경기 데이터 가져오기
 */
export const fetchMatchesByDate = async (date: string): Promise<Game[]> => {
  const response = await api.get<Game[]>(`/matches?date=${date}`);
  return response.data;
};

/**
 * 특정 경기 상세 데이터 가져오기
 */
export const fetchGameDetail = async (gameId: string): Promise<GameDetail> => {
  const response = await api.get<GameDetail>(`/matches/${gameId}`);
  return response.data;
};

/**
 * 특정 경기의 사용자 투표 조회
 */
export const fetchUserVote = async (gameId: string): Promise<string | null> => {
  try {
    const response = await api.get<{ votedTeam: string }>(`/predictions/my-vote/${gameId}`);
    return response.data.votedTeam || null;
  } catch (error) {
    // 404 might mean no vote? If backend returns 404 for no vote, we should handle it.
    // Assuming backend returns 200 with null if no vote, or 404.
    // If it's a real error, global handler shows modal. We return null to UI.
    return null;
  }
};

/**
 * 모든 경기의 사용자 투표 일괄 조회
 */
export const fetchAllUserVotes = async (games: Game[]): Promise<{ [key: string]: 'home' | 'away' | null }> => {
  const votes: { [key: string]: 'home' | 'away' | null } = {};

  // Note: This sequential fetching is inefficient. Consider bulk API.
  for (const game of games) {
    const vote = await fetchUserVote(game.gameId);
    votes[game.gameId] = vote as 'home' | 'away' | null;
  }

  return votes;
};

/**
 * 투표 현황 가져오기
 */
export const fetchVoteStatus = async (gameId: string): Promise<{ homeVotes: number; awayVotes: number }> => {
  try {
    const response = await api.get<{ homeVotes: number; awayVotes: number }>(`/predictions/status/${gameId}`);
    return { homeVotes: response.data.homeVotes, awayVotes: response.data.awayVotes };
  } catch (error) {
    return { homeVotes: 0, awayVotes: 0 };
  }
};

/**
 * 투표하기
 */
export const submitVote = async (gameId: string, votedTeam: 'home' | 'away'): Promise<boolean> => {
  await api.post('/predictions/vote', { gameId, votedTeam }, {
    skipGlobalErrorHandler: true,
  } as any);
  return true;
};

/**
 * 투표 취소하기
 */
export const cancelVote = async (gameId: string): Promise<boolean> => {
  await api.delete(`/predictions/${gameId}`, {
    skipGlobalErrorHandler: true,
  } as any);
  return true;
};

/**
 * 내 예측 통계 조회
 */
export const fetchMyPredictionStats = async (): Promise<UserPredictionStat> => {
  const response = await api.get<{ success: boolean; data: UserPredictionStat }>('/prediction/stats/me');
  return response.data.data;
};
