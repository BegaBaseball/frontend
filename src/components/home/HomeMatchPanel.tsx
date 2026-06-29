import { lazy, Suspense, type ComponentType, type CSSProperties, type ReactNode } from 'react';

import HomeGameCard from './HomeGameCard';
import type { Game } from '../../types/home';
import type { LeagueTab } from '../../utils/homeScheduleClassification';
import type { HomeLoadFailureReason } from '../../api/home';

const LazyHomeScheduledMatchPanel = lazy(() => import('./HomeScheduledMatchPanel'));
const LazyHomeMatchPanelErrorState = lazy(() => import('./HomeMatchPanelErrorState'));

interface HomeMatchPanelProps {
  activeLeagueTab: LeagueTab;
  isLoading: boolean;
  isGamesError: boolean;
  loadFailureReason: HomeLoadFailureReason | null;
  isScheduledLoading: boolean;
  isScheduledError: boolean;
  suppressRecoveryActions?: boolean;
  isSecondarySectionExpanded: boolean;
  loadingMatchCardCount: number;
  matchSectionMinHeightStyle: CSSProperties;
  activeStandardGames: Game[];
  scheduledPrimaryGames: Game[];
  scheduledSecondaryGames: Game[];
  liveOrFinishedScheduledGames: Game[];
  scheduledPrimaryGamesBySourceDate: Array<[string, Game[]]>;
  scheduledSecondaryGamesBySourceDate: Array<[string, Game[]]>;
  shouldMountTeamLogos: boolean;
  LoadingCardComponent: ComponentType;
  onRetry: () => void;
  onSelectPrediction: (game: Game) => void;
  onToggleSecondarySection: () => void;
}

const HOME_MATCH_PANEL_COPY: Record<LeagueTab, { eyebrow: string; title: string; description: string }> = {
  regular: {
    eyebrow: 'KBO League',
    title: '오늘의 매치업',
    description: '경기 시간, 구장, 상태를 빠르게 확인하세요.',
  },
  postseason: {
    eyebrow: 'Postseason',
    title: '포스트시즌 매치업',
    description: '가을야구 일정을 간결하게 정리했습니다.',
  },
  koreanseries: {
    eyebrow: 'Korean Series',
    title: '한국시리즈 매치업',
    description: '챔피언 결정전의 경기 흐름을 확인하세요.',
  },
  scheduled: {
    eyebrow: 'Upcoming',
    title: '다가오는 경기',
    description: '예정 경기와 일정 변동을 날짜별로 확인하세요.',
  },
};

const BOARD_SHELL_CLASS = 'rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5';
const BOARD_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-2.5';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

function HomeScheduleBoardHeader({
  copy,
  countLabel,
  detailLabel,
  tone = 'default',
}: {
  copy: { eyebrow: string; title: string; description: string };
  countLabel: string;
  detailLabel?: string;
  tone?: 'default' | 'warning';
}) {
  const countClass = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-200'
    : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-white';

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-white/8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-12 font-black uppercase tracking-[0.16em] text-primary dark:text-emerald-300">
            {copy.eyebrow}
          </span>
        </div>
        <h3 className="truncate text-20 font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {copy.title}
        </h3>
        <p className="mt-1 text-caption font-bold leading-relaxed text-gray-500 dark:text-white sm:text-15">
          {copy.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-caption font-black ${countClass}`}>
          {countLabel}
        </span>
        {detailLabel ? (
          <span className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-caption font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
            {detailLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function HomeScheduleEmptyState({
  children,
  style,
  copy,
  countLabel,
  detailLabel,
}: {
  children: ReactNode;
  style: CSSProperties;
  copy?: { eyebrow: string; title: string; description: string };
  countLabel?: string;
  detailLabel?: string;
}) {
  return (
    <div className={BOARD_SHELL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      {copy ? (
        <HomeScheduleBoardHeader
          copy={copy}
          countLabel={countLabel || '0경기'}
          detailLabel={detailLabel}
        />
      ) : null}
      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-body font-bold text-gray-500 dark:border-white/12 dark:bg-white/[0.04] dark:text-white">
        {children}
      </div>
    </div>
  );
}

function HomeScheduleErrorState({
  style,
  title,
  description,
  suppressRecoveryActions,
  compact = false,
  onRetry,
}: {
  style: CSSProperties;
  title: string;
  description: string;
  suppressRecoveryActions: boolean;
  compact?: boolean;
  onRetry: () => void;
}) {
  return (
    <Suspense
      fallback={(
        <HomeScheduleEmptyState style={style}>
          경기 상태를 확인하고 있습니다.
        </HomeScheduleEmptyState>
      )}
    >
      <LazyHomeMatchPanelErrorState
        style={style}
        title={title}
        description={description}
        suppressRecoveryActions={suppressRecoveryActions}
        compact={compact}
        onRetry={onRetry}
      />
    </Suspense>
  );
}

function HomeScheduleListHeader() {
  return (
    <div className="hidden px-3 pb-1 text-11 font-black text-gray-400 dark:text-white lg:grid lg:grid-cols-home-game-card lg:gap-4">
      <span>시간</span>
      <span>원정</span>
      <span className="text-center">경기</span>
      <span className="text-right">홈</span>
      <span>구장</span>
      <span className="text-right">상태</span>
    </div>
  );
}

function HomeScheduleGameList({
  games,
  sourceDate,
  shouldMountTeamLogos,
  onSelectPrediction,
}: {
  games: Game[];
  sourceDate?: string;
  shouldMountTeamLogos: boolean;
  onSelectPrediction: (game: Game) => void;
}) {
  const keySuffix = sourceDate ? `${sourceDate}-` : '';

  return (
    <div className={BOARD_GRID_CLASS}>
      {games.map((game, index) => (
        <div
          key={`${game.gameId}-${keySuffix}${index}`}
          className="h-full"
          data-testid="home-game-card"
          data-game-id={game.gameId}
        >
          <HomeGameCard
            game={game}
            shouldMountTeamLogo={shouldMountTeamLogos}
            onSelectPrediction={() => onSelectPrediction(game)}
          />
        </div>
      ))}
    </div>
  );
}

function HomeScheduledPanelFallback({
  matchSectionMinHeightStyle,
}: {
  matchSectionMinHeightStyle: CSSProperties;
}) {
  return (
    <HomeScheduleEmptyState
      style={matchSectionMinHeightStyle}
      copy={HOME_MATCH_PANEL_COPY.scheduled}
      countLabel="예정 경기 확인 중"
      detailLabel="7일 일정"
    >
      예정 경기 화면을 준비하고 있습니다.
    </HomeScheduleEmptyState>
  );
}

export default function HomeMatchPanel({
  activeLeagueTab,
  isLoading,
  isGamesError,
  loadFailureReason,
  isScheduledLoading,
  isScheduledError,
  suppressRecoveryActions = false,
  isSecondarySectionExpanded,
  loadingMatchCardCount,
  matchSectionMinHeightStyle,
  activeStandardGames,
  scheduledPrimaryGames,
  scheduledSecondaryGames,
  liveOrFinishedScheduledGames,
  scheduledPrimaryGamesBySourceDate,
  scheduledSecondaryGamesBySourceDate,
  shouldMountTeamLogos,
  LoadingCardComponent,
  onRetry,
  onSelectPrediction,
  onToggleSecondarySection,
}: HomeMatchPanelProps) {
  const activeTabIsScheduled = activeLeagueTab === 'scheduled';
  const isManualDataError = loadFailureReason === 'manual-data-required';
  const activePanelCopy = HOME_MATCH_PANEL_COPY[activeLeagueTab];

  if (isLoading) {
    return (
      <div
        className={BOARD_SHELL_CLASS}
        style={matchSectionMinHeightStyle}
        {...MATCH_PRIORITY_REGION_PROPS}
      >
        <HomeScheduleBoardHeader
          copy={activePanelCopy}
          countLabel="일정 확인 중"
          detailLabel="최신 경기 정보"
        />
        <HomeScheduleListHeader />
        <div className={BOARD_GRID_CLASS}>
          {Array.from({ length: loadingMatchCardCount }, (_, index) => <LoadingCardComponent key={`loading-game-${index}`} />)}
        </div>
      </div>
    );
  }

  if (isGamesError) {
    return (
      <HomeScheduleErrorState
        style={matchSectionMinHeightStyle}
        title={isManualDataError ? '야구 데이터 준비가 필요합니다' : '경기 일정을 불러오지 못했습니다'}
        description={isManualDataError
          ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
          : '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
        suppressRecoveryActions={suppressRecoveryActions}
        onRetry={onRetry}
      />
    );
  }

  if (activeTabIsScheduled) {
    return (
      <Suspense
        fallback={(
          <HomeScheduledPanelFallback
            matchSectionMinHeightStyle={matchSectionMinHeightStyle}
          />
        )}
      >
        <LazyHomeScheduledMatchPanel
          isScheduledLoading={isScheduledLoading}
          isScheduledError={isScheduledError}
          loadFailureReason={loadFailureReason}
          suppressRecoveryActions={suppressRecoveryActions}
          isSecondarySectionExpanded={isSecondarySectionExpanded}
          loadingMatchCardCount={loadingMatchCardCount}
          matchSectionMinHeightStyle={matchSectionMinHeightStyle}
          scheduledPrimaryGames={scheduledPrimaryGames}
          scheduledSecondaryGames={scheduledSecondaryGames}
          liveOrFinishedScheduledGames={liveOrFinishedScheduledGames}
          scheduledPrimaryGamesBySourceDate={scheduledPrimaryGamesBySourceDate}
          scheduledSecondaryGamesBySourceDate={scheduledSecondaryGamesBySourceDate}
          shouldMountTeamLogos={shouldMountTeamLogos}
          onRetry={onRetry}
          onSelectPrediction={onSelectPrediction}
          onToggleSecondarySection={onToggleSecondarySection}
        />
      </Suspense>
    );
  }

  if (activeStandardGames.length === 0) {
    return (
      <HomeScheduleEmptyState
        style={matchSectionMinHeightStyle}
        copy={activePanelCopy}
        countLabel="0경기"
        detailLabel="선택 날짜"
      >
        경기가 없는 날입니다.
      </HomeScheduleEmptyState>
    );
  }

  return (
    <div className={BOARD_SHELL_CLASS} style={matchSectionMinHeightStyle} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduleBoardHeader
        copy={activePanelCopy}
        countLabel={`${activeStandardGames.length}경기`}
        detailLabel="승부예측 이동 가능"
      />
      <HomeScheduleListHeader />
      <HomeScheduleGameList
        games={activeStandardGames}
        shouldMountTeamLogos={shouldMountTeamLogos}
        onSelectPrediction={onSelectPrediction}
      />
    </div>
  );
}
