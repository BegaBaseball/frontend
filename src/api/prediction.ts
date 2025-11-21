import { VoteStatusResponse, VoteRequest } from '../types/prediction';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api/predictions`
  : 'http://localhost:8080/api/predictions';

/**
 * 특정 경기의 투표 현황 조회
 */
export async function fetchVoteStatus(gameId: string): Promise<VoteStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/status/${gameId}`);

  if (!response.ok) {
    throw new Error('투표 현황 조회 실패');
  }

  return await response.json();
}

/**
 * 투표하기
 */
export async function submitVote(
  userId: number,
  voteData: VoteRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/vote?userId=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(voteData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '투표에 실패했습니다.');
  }
}

/**
 * 투표 취소
 */
export async function cancelVote(gameId: string, userId: number): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/${gameId}?userId=${userId}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('투표 취소 실패');
  }
}