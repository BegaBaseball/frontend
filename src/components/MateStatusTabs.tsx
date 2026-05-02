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
    <div role="group" aria-label="파티 상태 필터" className="relative inline-flex w-full justify-start gap-1 rounded-2xl border border-gray-200/70 bg-white p-1 dark:border-white/15 dark:bg-[#16181c] md:w-auto md:rounded-full">
      {MATE_TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <button
            type="button"
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            aria-pressed={isActive}
            className={`relative min-h-10 min-w-[72px] flex-1 rounded-xl px-2 py-2 text-[15px] font-bold transition-colors duration-300 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#16181c] sm:px-4 md:flex-none md:rounded-full ${
              isActive
                ? 'text-primary-foreground'
                : 'bg-transparent text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary'
            }`}
          >
            {isActive ? (
              <span className="absolute inset-0 rounded-full bg-primary shadow-sm" />
            ) : null}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
