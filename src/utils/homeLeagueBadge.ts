export const resolveLeagueBadge = (leagueType?: string): string => {
  const normalized = (leagueType || '').toUpperCase();

  switch (normalized) {
    case 'REGULAR':
      return '정규시즌';
    case 'POSTSEASON':
      return '포스트시즌';
    case 'KOREAN_SERIES':
      return '한국시리즈';
    case 'PRE':
    case 'PRESEASON':
      return '프리시즌';
    case 'OFFSEASON':
      return '기타 일정';
    default:
      return '예정 일정';
  }
};
