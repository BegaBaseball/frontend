import { useShallow } from 'zustand/react/shallow';
import { useMateRecentSearchStore } from '../store/mateRecentSearchStore';
import { useMateStore } from '../store/mateStore';
import { normalizeMateSearchText } from '../utils/mateSearchTerms';
import { MateCloseIcon, MateSearchIcon } from './MateIcons';

const cardClass =
  'rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card';

interface MateRecentSearchesPanelProps {
  onTermClick?: (term: string) => void;
  onTermSelect?: () => void;
}

export default function MateRecentSearchesPanel({
  onTermClick,
  onTermSelect,
}: MateRecentSearchesPanelProps) {
  const { recentSearches, removeRecentSearch, clearRecentSearches } = useMateRecentSearchStore(
    useShallow((state) => ({
      recentSearches: state.recentSearches,
      removeRecentSearch: state.removeRecentSearch,
      clearRecentSearches: state.clearRecentSearches,
    })),
  );
  const setSearchQuery = useMateStore((state) => state.setSearchQuery);

  const handleTermClick = (term: string) => {
    const normalizedTerm = normalizeMateSearchText(term);
    if (!normalizedTerm) {
      return;
    }

    if (onTermClick) {
      onTermClick(normalizedTerm);
    } else {
      setSearchQuery(normalizedTerm);
    }
    onTermSelect?.();
  };

  return (
    <section className={cardClass}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-15 font-black text-gray-900 dark:text-white">
          <MateSearchIcon className="h-3.5 w-3.5 text-primary" />
          최근 검색어
        </h2>
        {recentSearches.length > 0 ? (
          <button
            type="button"
            onClick={clearRecentSearches}
            className="shrink-0 text-11 font-bold text-gray-400 transition-colors hover:text-primary dark:text-white"
          >
            전체삭제
          </button>
        ) : null}
      </div>

      {recentSearches.length === 0 ? (
        <p className="text-12 font-semibold leading-relaxed text-gray-400 dark:text-white">
          검색하면 여기에 기록됩니다.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {recentSearches.map((term) => (
            <span
              key={term}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200/80 bg-gray-50 py-1 pl-3 pr-1.5 text-12 font-bold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <button
                type="button"
                onClick={() => handleTermClick(term)}
                className="min-w-0 truncate transition-colors hover:text-primary"
              >
                {term}
              </button>
              <button
                type="button"
                aria-label={`${term} 검색어 삭제`}
                onClick={() => removeRecentSearch(term)}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <MateCloseIcon className="h-2.5 w-2.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
