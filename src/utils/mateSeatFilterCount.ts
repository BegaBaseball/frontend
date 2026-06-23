const DEFAULT_MATE_SEAT_FILTER_LABELS = ['응원석', '테이블석', '프리미엄', '익사이팅'];

const MATE_STADIUM_SEAT_FILTER_LABELS: Array<[string, string[], string[]]> = [
  ['서울잠실야구장', ['lg', 'doosan', '두산'], ['오렌지석', '레드석', '프리미엄석', '테이블석']],
  ['인천SSG랜더스필드', ['ssg', 'sk'], ['으쓱이존', '라이브존', '테이블석']],
  ['대구 삼성 라이온즈파크', ['samsung', '삼성'], ['블루존', 'VIP석', '테이블석 (지브로존)']],
  ['광주기아챔피언스필드', ['kia'], ['K7석', '챔피언석', '중앙 테이블석']],
  ['수원KT위즈파크', ['kt'], ['응원지정석', '지니존 / BC카드존']],
  ['창원NC파크', ['nc'], ['내야 응원석', '프리미엄 테이블석']],
  ['사직야구장', ['lotte', '롯데'], ['내야 필드석', '중앙 탁자석', '와이드/일반 테이블석']],
  ['고척스카이돔', ['kiwoom', '키움'], ['버건디석', '다이아몬드 클럽', '골드 내야석']],
  ['대전 한화생명볼파크', ['hanwha', '한화'], ['VIP 프리미엄석', '홈 플레이트 테이블석', '중앙 탁자석', '내야 하단 지정석']],
];

const resolveMateSeatFilterLabels = (query: string): string[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return DEFAULT_MATE_SEAT_FILTER_LABELS;
  }

  const stadiumLabels = MATE_STADIUM_SEAT_FILTER_LABELS.find(([name, aliases]) => (
    name.includes(normalizedQuery)
    || aliases.some((alias) => normalizedQuery.includes(alias))
  ));

  return stadiumLabels?.[2] ?? DEFAULT_MATE_SEAT_FILTER_LABELS;
};

export const countActiveMateSeatFilters = (query: string): number => (
  resolveMateSeatFilterLabels(query).filter((label) => query.includes(label)).length
);
