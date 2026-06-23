export type MateStatusTabKey = 'all' | 'recruiting' | 'matched' | 'selling';

interface MateStatusTabsProps {
  activeTab: MateStatusTabKey;
  onTabChange: (nextTab: MateStatusTabKey) => void;
}

const MATE_TABS: { key: MateStatusTabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '모집 중' },
  { key: 'matched', label: '매칭 완료' },
  { key: 'selling', label: '티켓 판매' },
];

export default function MateStatusTabs({
  activeTab,
  onTabChange,
}: MateStatusTabsProps) {
  return (
    <div role="group" aria-label="파티 상태 필터" className="relative inline-flex w-full justify-start gap-1 rounded-[12px] border border-gray-200/80 bg-white p-1 dark:border-white/15 dark:bg-[#000000] md:w-fit">
      {MATE_TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            type="button"
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            aria-pressed={isActive}
            className={`relative h-8 min-w-0 flex-1 rounded-[8px] px-2 text-[13px] font-bold transition-colors duration-150 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] sm:px-3.5 md:flex-none ${
              isActive
                ? 'text-primary-foreground'
                : 'bg-transparent text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary'
            }`}
          >
            {isActive ? (
              <span className="absolute inset-0 rounded-[8px] bg-primary shadow-sm" />
            ) : null}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
