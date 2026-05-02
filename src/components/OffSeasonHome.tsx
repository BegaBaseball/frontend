import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamKoreanName } from '../utils/teamNames';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { publicGet } from '../api/publicClient';
import { fetchRankingSnapshot } from '../api/rankings';
import type { Ranking } from '../types/home';

interface OffSeasonHomeProps {
  selectedDate: Date;
}

interface AwardData {
  award: string;
  playerName: string;
  team: string;
  stats: string;
}

interface OffseasonMetadata {
  awards: AwardData[];
}

interface OffseasonHomeData {
  movements: OffseasonMovement[];
  awards: AwardData[];
  rankings: Ranking[];
}

interface OffseasonMovement {
  id: number;
  date: string;
  section: string;
  team: string; // teamCode
  player: string;
  remarks: string;
  isBigEvent: boolean;
  estimatedAmount: number;
}

const STOVE_LEAGUE_START = '2024-11-01';
const OFFSEASON_METADATA_YEAR = 2025;
const OFFSEASON_RANKING_YEAR = 2025;

const defaultOffseasonHomeData: OffseasonHomeData = {
  movements: [],
  awards: [],
  rankings: [],
};
const OffSeasonHomePrimaryRuntime = lazy(() => import('./OffSeasonHomePrimaryRuntime'));

const fetchOffseasonHomeData = async (): Promise<OffseasonHomeData> => {
  const [movementsResponse, metadataResponse, rankingsResponse] = await Promise.allSettled([
    publicGet<OffseasonMovement[]>('/kbo/offseason/movements'),
    publicGet<OffseasonMetadata>('/kbo/offseason/metadata', { params: { year: OFFSEASON_METADATA_YEAR } }),
    fetchRankingSnapshot({ seasonYear: OFFSEASON_RANKING_YEAR }),
  ]);

  if (movementsResponse.status === 'rejected') {
    console.error('Failed to fetch offseason movements', movementsResponse.reason);
  }
  if (metadataResponse.status === 'rejected') {
    console.error('Failed to fetch offseason metadata', metadataResponse.reason);
  }
  if (rankingsResponse.status === 'rejected') {
    console.error('Failed to fetch offseason rankings', rankingsResponse.reason);
  }

  const metadata = metadataResponse.status === 'fulfilled'
    ? metadataResponse.value
    : { awards: [] };

  return {
    movements: movementsResponse.status === 'fulfilled' ? movementsResponse.value : [],
    awards: metadata.awards,
    rankings: rankingsResponse.status === 'fulfilled' ? rankingsResponse.value.rankings : [],
  };
};


// Helper to highlight money string
const formatRemarks = (text: string) => {
  if (!text) return text;
  // Regex for typical money patterns: "nn억", "nnn만원", "nn만달러"
  const parts = text.split(/(\d+(?:,\d+)*\s*(?:억|만\s*원|만\s*달러|달러))/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/(\d+(?:,\d+)*)\s*(?:억|만\s*원|만\s*달러|달러)/)) {
          return <span key={i} className="font-bold text-primary">{part}</span>;
        }
        return part;
      })}
    </span>
  );
};

export default function OffSeasonHome({ selectedDate: _selectedDate }: OffSeasonHomeProps) {
  const navigate = useNavigate();
  const isLargeScreen = useMediaQuery('(min-width: 1024px)');
  const { data, isLoading } = useQuery<OffseasonHomeData>({
    queryKey: ['offseason-home', OFFSEASON_RANKING_YEAR],
    queryFn: fetchOffseasonHomeData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const { movements, awards, rankings } = data ?? defaultOffseasonHomeData;

  // 2026 Season Opening Day
  const openingDay = new Date(2026, 2, 28);
  const diffTime = openingDay.getTime() - new Date().getTime();
  const daysUntilOpening = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Filter for 2025 Stove League (Frontend Fail-safe)
  // Even if backend sends all data, we only show recent ones here.
  const recentMovements = useMemo(() => movements.filter((m) => m.date >= STOVE_LEAGUE_START), [movements]);

  // Filter Big Events (Top 4)
  const bigEvents = useMemo(() => recentMovements.filter((m) => m.isBigEvent).slice(0, 4), [recentMovements]);

  // Use shared team name utility
  const getTeamName = (code: string) => {
    return getTeamKoreanName(code);
  };

  const primaryFallback = (
    <div className="min-h-screen space-y-6 bg-gray-50 px-4 py-6 transition-colors sm:px-6 md:px-6 md:py-8 dark:bg-background">
      <div className="h-11 w-48 animate-pulse rounded-full bg-white ring-1 ring-black/5 dark:bg-card dark:ring-white/10" />
      <div className="h-44 animate-pulse rounded-3xl bg-primary/20" />
      <div className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-black/5 dark:bg-card dark:ring-white/10" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={`offseason-home-primary-fallback-${index}`}
            className="h-36 animate-pulse rounded-2xl bg-white ring-1 ring-black/5 dark:bg-card dark:ring-white/10"
          />
        ))}
      </div>
    </div>
  );

  return (
    <Suspense fallback={primaryFallback}>
      <OffSeasonHomePrimaryRuntime
        isLoading={isLoading}
        daysUntilOpening={daysUntilOpening}
        movementsCount={movements.length}
        bigEvents={bigEvents}
        awards={awards}
        rankings={rankings}
        isLargeScreen={isLargeScreen}
        getTeamName={getTeamName}
        formatRemarks={formatRemarks}
        onNavigateHome={() => navigate('/home')}
        onNavigateList={() => navigate('/offseason/list')}
      />
    </Suspense>
  );
}
