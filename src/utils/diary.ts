import { MAX_FILE_SIZE, MAX_TOTAL_SIZE } from '../constants/diary';
import { DiaryEntry, EmojiStat } from '../types/diary';
import { EMOJI_STATS } from '../constants/diary';

/**
 * 전체 이미지 URL 가져오기
 */
export const getFullImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  return imagePath;
};

/**
 * 파일 크기 검증
 */
export const validateFileSize = (files: File[]): { valid: boolean; error?: string } => {
  const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
  if (oversizedFiles.length > 0) {
    return {
      valid: false,
      error: '파일 크기가 너무 큽니다. 각 파일은 10MB 이하여야 합니다.',
    };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: '전체 파일 크기가 60MB를 초과합니다.',
    };
  }

  return { valid: true };
};

/**
 * 파일을 Base64로 변환
 */
export const convertFilesToBase64 = async (files: File[]): Promise<string[]> => {
  const promises = files.map(
    (file) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      })
  );

  return Promise.all(promises);
};

/**
 * 날짜를 문자열로 변환 (YYYY-MM-DD)
 */
export const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

/**
 * 승패 텍스트 변환
 */
export const getWinningLabel = (winningName: string): string => {
  if (winningName === 'WIN') return '승리';
  if (winningName === 'DRAW') return '무승부';
  if (winningName === 'LOSE') return '패배';
  return '';
};

/**
 * 다이어리 엔트리에서 이모지 통계 계산
 */
export const calculateEmojiStats = (entries: DiaryEntry[]): EmojiStat[] => {
  const stats = {
    최악: 0,
    배부름: 0,
    최고: 0,
    분노: 0,
    즐거움: 0,
  };

  entries.forEach((entry) => {
    if (entry.emojiName && entry.emojiName in stats) {
      stats[entry.emojiName as keyof typeof stats]++;
    }
  });

  return EMOJI_STATS.map((item) => ({
    name: item.name,
    emoji: item.emoji,
    count: stats[item.name as keyof typeof stats] || 0,
  }));
};