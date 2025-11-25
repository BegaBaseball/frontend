import { Game } from '../types/prediction';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/**
 * 인증 헤더 생성
 */
const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

/**
 * 과거 경기 데이터 가져오기
 */
export const fetchPastGames = async (): Promise<Game[]> => {
  const response = await fetch(`${API_BASE_URL}/games/past`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  return await response.json();
};

/**
 * 특정 날짜의 경기 데이터 가져오기
 */
export const fetchMatchesByDate = async (date: string): Promise<Game[]> => {
  const response = await fetch(`${API_BASE_URL}/matches?date=${date}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  return await response.json();
};

/**
 * 특정 경기의 사용자 투표 조회
 */
export const fetchUserVote = async (gameId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predictions/my-vote/${gameId}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.votedTeam || null;
    }
    return null;
  } catch (error) {
    console.error(`투표 기록 불러오기 실패 (${gameId}):`, error);
    return null;
  }
};

/**
 * 모든 경기의 사용자 투표 일괄 조회
 */
export const fetchAllUserVotes = async (games: Game[]): Promise<{ [key: string]: 'home' | 'away' | null }> => {
  const votes: { [key: string]: 'home' | 'away' | null } = {};
  
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
    const response = await fetch(`${API_BASE_URL}/predictions/status/${gameId}`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    const data = await response.json();
    return { homeVotes: data.homeVotes, awayVotes: data.awayVotes };
  } catch (error) {
    console.error('투표 현황을 불러오는데 실패했습니다:', error);
    return { homeVotes: 0, awayVotes: 0 };
  }
};

/**
 * 투표하기
 */
export const submitVote = async (gameId: string, votedTeam: 'home' | 'away'): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predictions/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ gameId, votedTeam })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    
    return true;
  } catch (error) {
    console.error('투표 실패:', error);
    throw error;
  }
};

/**
 * 투표 취소하기
 */
export const cancelVote = async (gameId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predictions/${gameId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    console.error('투표 취소 실패:', error);
    return false;
  }
};