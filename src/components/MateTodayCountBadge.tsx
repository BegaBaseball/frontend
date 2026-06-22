import { useQuery } from '@tanstack/react-query';

import { getMatePartyListQueryOptions } from '../hooks/mateQueryOptions';

const todayDateString = () => {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

/**
 * 헤더 "오늘 N건 모집 중" 배지. 오늘 PENDING 파티 수(totalElements)만 size=1로 조회.
 * 0건이면 렌더하지 않는다. (lazy 분리로 Mate runtime 슬림 유지.)
 */
export default function MateTodayCountBadge() {
  const { data } = useQuery({
    ...getMatePartyListQueryOptions({
      status: 'PENDING',
      gameDate: todayDateString(),
      page: 0,
      size: 1,
    }),
  });

  const count = data?.totalElements ?? 0;
  if (!count) {
    return null;
  }

  return (
    <span className="shrink-0 whitespace-nowrap rounded-lg bg-primary/10 px-2.5 py-1 text-[13px] font-extrabold text-primary dark:bg-primary/15 dark:text-primary-light">
      오늘 {count}건 모집 중
    </span>
  );
}
