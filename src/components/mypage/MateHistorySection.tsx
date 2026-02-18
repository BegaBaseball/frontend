// MateHistorySection.tsx
import { useState } from 'react';
import { Card } from '../ui/card';
import { useMateHistory } from '../../hooks/useMateHistory';
import { MateHistoryTab } from '../../types/mate';
import MateHistoryCard from './MateHistoryCard';
import LoadingSpinner from '../LoadingSpinner';

interface MateHistoryContentProps {
  tab: MateHistoryTab;
}

function MateHistoryContent({ tab }: MateHistoryContentProps) {
  const { parties, isLoading, isEmpty, emptyMessage } = useMateHistory(tab);

  if (isLoading) {
    return (
      <LoadingSpinner size="md" text="메이트 내역을 불러오는 중..." fullScreen={false} />
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parties.map((party) => (
        <MateHistoryCard key={party.id} party={party} />
      ))}
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
    <div className="space-y-6">
      <Card className="p-8">
        <h2 className="mb-6 text-primary" style={{ fontWeight: 900 }}>
          참여한 메이트
        </h2>

        {/* 탭 버튼 */}
        <div className="flex gap-2 mb-6 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMateHistoryTab(tab.key)}
              className={`px-4 py-2 -mb-px ${
                mateHistoryTab === tab.key
                  ? 'border-b-2 font-bold border-primary text-primary'
                  : 'text-gray-500'
              }`}
              style={{
                borderColor: mateHistoryTab === tab.key ? undefined : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <MateHistoryContent tab={mateHistoryTab} />
      </Card>
    </div>
  );
}