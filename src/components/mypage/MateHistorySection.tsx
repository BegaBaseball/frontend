// MateHistorySection.tsx
import { useState } from 'react';
import { useMateHistory } from '../../hooks/useMateHistory';
import { MateHistoryTab } from '../../types/mate';
import MateHistoryCard from './MateHistoryCard';
import LoadingSpinner from '../LoadingSpinner';

interface MateHistoryContentProps {
  tab: MateHistoryTab;
}

function MateHistoryContent({ tab }: MateHistoryContentProps) {
  const {
    parties,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isEmpty,
    emptyMessage,
  } = useMateHistory(tab);

  if (isLoading) {
    return (
      <LoadingSpinner size="md" text="메이트 내역을 불러오는 중..." fullScreen={false} />
    );
  }

  if (isEmpty) {
    return (
      <div className="mypage-season-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mypage-season-mate-list">
      {parties.map((party) => (
        <MateHistoryCard key={party.id} party={party} />
      ))}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mypage-season-ghost-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetchingNextPage ? '불러오는 중...' : '더보기'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MateHistorySection() {
  const [mateHistoryTab, setMateHistoryTab] = useState<MateHistoryTab>('all');

  const tabs: Array<{ key: MateHistoryTab; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'completed', label: '완료됨' },
    { key: 'ongoing', label: '진행 중' },
  ];

  return (
    <section data-screen-label="메이트 내역">
      <div className="mypage-season-head">
        <div>
          <h1>메이트 내역</h1>
          <p>참여한 직관 메이트와 진행 상태를 확인해요</p>
        </div>
      </div>

      <div className="mypage-season-panel">
        <div className="mypage-season-tabs" data-testid="mypage-mate-history-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => setMateHistoryTab(tab.key)}
              className={mateHistoryTab === tab.key ? 'is-active' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MateHistoryContent tab={mateHistoryTab} />
      </div>
    </section>
  );
}
