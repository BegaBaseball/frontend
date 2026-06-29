import type { ReactNode } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useUIStore, type MateListViewMode } from '../store/uiStore';

const VIEW_OPTIONS: { key: MateListViewMode; label: string; icon: ReactNode }[] = [
  {
    key: 'grid',
    label: '카드',
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    key: 'list',
    label: '리스트',
    icon: (
      <>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </>
    ),
  },
  {
    key: 'compact',
    label: '컴팩트',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="6" rx="1.5" />
        <rect x="3" y="14" width="18" height="6" rx="1.5" />
      </>
    ),
  },
];

/**
 * 데스크톱(xl) 전용 결과 뷰 모드 세그먼트 토글(카드/리스트/컴팩트).
 * 상태는 uiStore에 영속(`mateListViewMode`). lazy 분리로 Mate runtime 슬림 유지.
 */
export default function MateViewToggle() {
  const { mateListViewMode, setMateListViewMode } = useUIStore(
    useShallow((state) => ({
      mateListViewMode: state.mateListViewMode,
      setMateListViewMode: state.setMateListViewMode,
    })),
  );

  return (
    <div className="hidden h-[46px] items-center gap-0.5 rounded-14 border border-gray-200/80 bg-white p-1 dark:border-white/10 dark:bg-[#000000] xl:inline-flex">
      {VIEW_OPTIONS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          title={`${label} 보기`}
          aria-label={`${label} 보기`}
          aria-pressed={mateListViewMode === key}
          onClick={() => setMateListViewMode(key)}
          className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-10 transition-colors ${
            mateListViewMode === key
              ? 'bg-primary text-primary-foreground'
              : 'text-gray-500 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-primary/20'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {icon}
          </svg>
        </button>
      ))}
    </div>
  );
}
