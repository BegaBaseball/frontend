import { useQuery } from '@tanstack/react-query';

import { getMatePopularSearchTermsQueryOptions } from '../hooks/mateQueryOptions';
import { useMateStore } from '../store/mateStore';
import { normalizeMateSearchText } from '../utils/mateSearchTerms';
import { FlameIcon } from './icons/PublicShellIcons';

interface MatePopularSearchesPanelProps {
  limit?: number;
  onTermClick?: (term: string) => void;
  onTermSelect?: () => void;
}

const cardClass =
  'rounded-2xl border border-gray-200/80 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-[#000000]';

export default function MatePopularSearchesPanel({
  limit = 5,
  onTermClick,
  onTermSelect,
}: MatePopularSearchesPanelProps) {
  const setSearchQuery = useMateStore((state) => state.setSearchQuery);
  const { data: popularTerms = [], isLoading } = useQuery(getMatePopularSearchTermsQueryOptions(limit));

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
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[13px] font-black text-gray-900 dark:text-white">
        <FlameIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
        인기 검색어
      </h2>

      {isLoading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-5 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
          ))}
        </div>
      ) : popularTerms.length === 0 ? (
        <p className="text-[12px] font-semibold leading-relaxed text-gray-400 dark:text-white">
          최근 7일 검색어가 아직 없습니다.
        </p>
      ) : (
        <ol className="m-0 list-decimal space-y-1.5 pl-4 text-[12px] font-bold text-gray-700 dark:text-white">
          {popularTerms.map((item) => (
            <li key={`${item.rank}-${item.term}`} className="pl-1 marker:text-gray-400 marker:font-black">
              <button
                type="button"
                onClick={() => handleTermClick(item.term)}
                className="inline-flex max-w-full items-center gap-1 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000]"
              >
                <span className="min-w-0 truncate">{item.term}</span>
                {item.rank === 1 ? (
                  <span className="shrink-0 text-[10px] font-black text-red-500 dark:text-red-400">
                    HOT
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
