import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getMateMyPartiesQueryOptions } from '../hooks/mateQueryOptions';
import { useTodayKey } from '../hooks/useTodayKey';
import { useAuthStore } from '../store/authStore';
import { isPartyHostedByUser } from '../utils/mate';
import { getMateDDayLabel } from '../utils/mateDateLabels';
import { getMateStatusBadgeMeta } from '../utils/statusBadgeMeta';
import type { Party } from '../types/mate';
import { StatusBadge } from './ui/status-badge';

interface MateMyPartiesPanelProps {
  onPartyClick: (party: Party) => void;
}

const formatMiniDate = (gameDate: string) => {
  const parts = gameDate.split('-');
  return parts.length >= 3 ? `${parts[1]}.${parts[2]}` : gameDate;
};

/**
 * 데스크톱 사이드바 "내가 만든 파티" 섹션. `/api/parties/my`에서 호스트(=나)가 만든 파티만 필터.
 * 데이터/auth는 자체 처리한다. 호스트 파티가 없으면 compact empty state를 보여준다.
 */
export default function MateMyPartiesPanel({ onPartyClick }: MateMyPartiesPanelProps) {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const todayKey = useTodayKey();
  const { data, isLoading } = useQuery({
    ...getMateMyPartiesQueryOptions(userId),
    enabled: Boolean(userId),
  });

  const hostedParties = useMemo(
    () => (data ?? [])
      .filter((party) => isPartyHostedByUser(party, { id: userId, handle: user?.handle }))
      .slice(0, 3),
    [data, user?.handle, userId],
  );

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-black text-gray-900 dark:text-white">내가 만든 파티</h2>
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary dark:bg-primary/15 dark:text-primary-light">
          {hostedParties.length}건
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-[74px] animate-pulse rounded-[10px] bg-gray-100 dark:bg-white/10" />
          ))}
        </div>
      ) : hostedParties.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-[12px] font-bold leading-relaxed text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white">
          만든 파티가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {hostedParties.map((party) => {
            const meta = getMateStatusBadgeMeta(party.status);
            return (
              <button
                key={party.id}
                type="button"
                onClick={() => onPartyClick(party)}
                className="status-badge-hover-scope w-full rounded-[10px] border border-gray-200/80 p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] dark:border-white/10 dark:hover:border-primary/50 dark:hover:bg-primary/10"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-primary dark:text-primary-light">
                    {getMateDDayLabel(party.gameDate, todayKey) || formatMiniDate(party.gameDate)}
                  </span>
                  <StatusBadge {...meta} size="xs" />
                </div>
                <div className="truncate text-[12px] font-bold text-gray-900 dark:text-white">
                  {party.homeTeam} vs {party.awayTeam}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-white">
                  <span>{party.currentParticipants}/{party.maxParticipants}명 모집</span>
                  <span>{formatMiniDate(party.gameDate)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
