// utils/date.ts

/**
 * Date 객체를 API 형식으로 변환 (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Date 객체를 한국어 형식으로 변환 (2025.10.26(토))
 */
export const formatDate = (date: Date): string => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${year}.${month}.${day}(${dayOfWeek})`;
};

/**
 * 비시즌 여부 확인 (11월 15일 ~ 3월 21일)
 */
export const isOffSeason = (date: Date): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 11월 15일 이후 또는 3월 21일 이전
  if ((month === 11 && day >= 15) || month === 12 || month <= 2 || (month === 3 && day < 22)) {
    return true;
  }
  return false;
};

/**
 * 날짜에 일수 더하기
 */
export const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};