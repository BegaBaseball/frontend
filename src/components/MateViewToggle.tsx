import { ListBullets, Rows, SquaresFour, type IconProps } from '@phosphor-icons/react';
import type { ComponentType } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useUIStore, type MateListViewMode } from '../store/uiStore';

const VIEW_OPTIONS: { key: MateListViewMode; label: string; Icon: ComponentType<IconProps> }[] = [
  {
    key: 'grid',
    label: '카드',
    Icon: SquaresFour,
  },
  {
    key: 'list',
    label: '리스트',
    Icon: ListBullets,
  },
  {
    key: 'compact',
    label: '컴팩트',
    Icon: Rows,
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
    <div className="hidden h-[46px] items-center gap-0.5 rounded-xl border border-gray-200/80 bg-white p-1 dark:border-white/10 dark:bg-card xl:inline-flex">
      {VIEW_OPTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          title={`${label} 보기`}
          aria-label={`${label} 보기`}
          aria-pressed={mateListViewMode === key}
          onClick={() => setMateListViewMode(key)}
          className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg transition-colors ${
            mateListViewMode === key
              ? 'bg-primary text-primary-foreground'
              : 'text-gray-500 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-primary/20'
          }`}
        >
          <Icon size={16} weight="bold" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
