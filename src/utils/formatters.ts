// utils/formatters.ts
/**
 * 날짜를 "YYYY-MM-DD" 형식으로 포맷
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * 날짜를 "YYYY년 MM월 DD일" 형식으로 포맷
 */
export const formatGameDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
};

/**
 * 상대 시간 표시 (예: "3분 전", "2시간 전")
 */
export const getTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return formatDate(createdAt);
};

/**
 * 날짜 포맷팅 (YYYY년 MM월 DD일 요일)
 */
export const formatDateWithDay = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${days[date.getDay()]}요일`;
};

/**
 * 경기 결과 텍스트
 */
export const getResultText = (
  team: 'home' | 'away',
  winner?: 'home' | 'away' | 'draw'
): string => {
  if (!winner) return '';
  if (winner === 'draw') return '무승부';
  return winner === team ? '승리' : '패배';
};