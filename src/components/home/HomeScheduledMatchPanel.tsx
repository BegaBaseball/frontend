import type { CSSProperties, ReactNode } from 'react';

import HomeGameCard from './HomeGameCard';
import { GameCardSkeleton } from './GameCardSkeleton';
import { formatSourceDateLabel } from '../../utils/homeSeasonLogic';
import type { Game } from '../../types/home';
import type { HomeLoadFailureReason } from '../../api/home';

interface HomeScheduledMatchPanelProps {
  isScheduledLoading: boolean;
  isScheduledError: boolean;
  loadFailureReason: HomeLoadFailureReason | null;
  suppressRecoveryActions?: boolean;
  isSecondarySectionExpanded: boolean;
  loadingMatchCardCount: number;
  matchSectionMinHeightStyle: CSSProperties;
  scheduledPrimaryGames: Game[];
  scheduledSecondaryGames: Game[];
  liveOrFinishedScheduledGames: Game[];
  scheduledPrimaryGamesBySourceDate: Array<[string, Game[]]>;
  scheduledSecondaryGamesBySourceDate: Array<[string, Game[]]>;
  shouldMountTeamLogos: boolean;
  onRetry: () => void;
  onSelectPrediction: (game: Game) => void;
  onToggleSecondarySection: () => void;
}

const HOME_SCHEDULED_PANEL_COPY = {
  eyebrow: 'Upcoming',
  title: '다가오는 경기',
  description: '예정 경기와 일정 변동을 날짜별로 확인하세요.',
};
const BOARD_SHELL_CLASS = 'rounded-3xl border border-primary/20 bg-white p-4 shadow-home-board ring-1 ring-primary/10 dark:border-primary/25 dark:bg-card md:p-5';
const BOARD_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-2.5';
const HOME_SCHEDULED_RETRY_BUTTON_CLASS = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-background px-4 text-15 font-semibold text-foreground transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 mt-3 border-primary/30 font-bold text-primary hover:bg-primary/5';
const HOME_SCHEDULED_ERROR_PANEL_CLASS = 'flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm';
const HOME_SCHEDULED_ERROR_ICON_FRAME_CLASS = 'bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4';
const HOME_SCHEDULED_REFRESH_ICON_CLASS = 'mr-1.5 inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent';
const HOME_SCHEDULED_WARNING_ICON_CLASS = 'text-4xl font-black leading-none text-red-500 dark:text-red-400';
const HOME_SCHEDULED_WARNING_BADGE_CLASS = 'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-11 font-black leading-none';
const HOME_SCHEDULED_CLOCK_ICON_CLASS = 'inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current';
const HOME_SCHEDULED_TOGGLE_ICON_CLASS = 'inline-block min-w-3.5 text-center text-12 font-black leading-none';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

function HomeScheduledBoardHeader({
  countLabel,
  detailLabel,
  tone = 'default',
}: {
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
            {HOME_SCHEDULED_PANEL_COPY.eyebrow}
          </span>
        </div>
        <h3 className="truncate text-20 font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {HOME_SCHEDULED_PANEL_COPY.title}
        </h3>
        <p className="mt-1 text-caption font-bold leading-relaxed text-gray-500 dark:text-white sm:text-15">
          {HOME_SCHEDULED_PANEL_COPY.description}
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

function HomeScheduledEmptyState({
  children,
  style,
}: {
  children: ReactNode;
  style: CSSProperties;
}) {
  return (
    <div className={BOARD_SHELL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduledBoardHeader
        countLabel="0경기"
        detailLabel="7일 일정"
      />
      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-body font-bold text-gray-500 dark:border-white/12 dark:bg-white/[0.04] dark:text-white">
        {children}
      </div>
    </div>
  );
}

function HomeScheduledErrorState({
  style,
  title,
  description,
  suppressRecoveryActions,
  onRetry,
}: {
  style: CSSProperties;
  title: string;
  description: string;
  suppressRecoveryActions: boolean;
  onRetry: () => void;
}) {
  return (
    <div className={HOME_SCHEDULED_ERROR_PANEL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      <div className={HOME_SCHEDULED_ERROR_ICON_FRAME_CLASS}>
        <span className={HOME_SCHEDULED_WARNING_ICON_CLASS} aria-hidden="true">!</span>
      </div>
      <p className="text-gray-700 dark:text-white font-bold mb-1">
        {title}
      </p>
      <p className="text-gray-500 dark:text-white text-body font-bold mt-1">
        {description}
      </p>
      {suppressRecoveryActions ? (
        <p className="mt-3 text-body font-bold text-gray-500 dark:text-white">
          위의 전체 다시 시도 버튼으로 한 번에 확인하세요.
        </p>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className={HOME_SCHEDULED_RETRY_BUTTON_CLASS}
        >
          <span className={HOME_SCHEDULED_REFRESH_ICON_CLASS} aria-hidden="true" />
          다시 시도
        </button>
      )}
    </div>
  );
}

function HomeScheduledListHeader() {
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

function HomeScheduledGameList({
  games,
  sourceDate,
  shouldMountTeamLogos,
  onSelectPrediction,
}: {
  games: Game[];
  sourceDate: string;
  shouldMountTeamLogos: boolean;
  onSelectPrediction: (game: Game) => void;
}) {
  return (
    <div className={BOARD_GRID_CLASS}>
      {games.map((game, index) => (
        <div
          key={`${game.gameId}-${sourceDate}-${index}`}
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

export default function HomeScheduledMatchPanel({
  isScheduledLoading,
  isScheduledError,
  loadFailureReason,
  suppressRecoveryActions = false,
  isSecondarySectionExpanded,
  loadingMatchCardCount,
  matchSectionMinHeightStyle,
  scheduledPrimaryGames,
  scheduledSecondaryGames,
  liveOrFinishedScheduledGames,
  scheduledPrimaryGamesBySourceDate,
  scheduledSecondaryGamesBySourceDate,
  shouldMountTeamLogos,
  onRetry,
  onSelectPrediction,
  onToggleSecondarySection,
}: HomeScheduledMatchPanelProps) {
  const isManualDataError = loadFailureReason === 'manual-data-required';
  const firstScheduledPrimaryDate = scheduledPrimaryGamesBySourceDate[0]?.[0];
  const scheduledTotalGames = scheduledPrimaryGames.length + scheduledSecondaryGames.length;

  if (isScheduledLoading) {
    return (
      <div
        className={BOARD_SHELL_CLASS}
        style={matchSectionMinHeightStyle}
        {...MATCH_PRIORITY_REGION_PROPS}
      >
        <HomeScheduledBoardHeader
          countLabel="예정 경기 확인 중"
          detailLabel="7일 일정"
        />
        <HomeScheduledListHeader />
        <div className={BOARD_GRID_CLASS}>
          {Array.from({ length: loadingMatchCardCount }, (_, index) => (
            <GameCardSkeleton key={`scheduled-skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (isScheduledError) {
    return (
      <HomeScheduledErrorState
        style={matchSectionMinHeightStyle}
        title={isManualDataError ? '야구 데이터 준비가 필요합니다' : '예정 경기를 불러오지 못했습니다'}
        description={isManualDataError
          ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
          : '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
        suppressRecoveryActions={suppressRecoveryActions}
        onRetry={onRetry}
      />
    );
  }

  if (scheduledPrimaryGames.length === 0 && scheduledSecondaryGames.length === 0) {
    return (
      <HomeScheduledEmptyState style={matchSectionMinHeightStyle}>
        선택한 날짜부터 7일 내 예정 경기가 없습니다.
      </HomeScheduledEmptyState>
    );
  }

  return (
    <div className={`${BOARD_SHELL_CLASS} space-y-6`} style={matchSectionMinHeightStyle} {...MATCH_PRIORITY_REGION_PROPS}>
      <HomeScheduledBoardHeader
        countLabel={`${scheduledTotalGames}경기`}
        detailLabel={`예정 ${scheduledPrimaryGames.length}건 · 변동 ${scheduledSecondaryGames.length}건`}
        tone={scheduledSecondaryGames.length > 0 ? 'warning' : 'default'}
      />

      {scheduledPrimaryGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-15 font-black text-gray-800 dark:text-white">
              <span className={`${HOME_SCHEDULED_CLOCK_ICON_CLASS} text-primary dark:text-emerald-300`} aria-hidden="true" />
              <span>곧 열리는 경기</span>
              <span className="text-gray-300 dark:text-white">·</span>
              <span>{scheduledPrimaryGames.length}건</span>
            </div>
            {firstScheduledPrimaryDate && (
              <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-caption font-black text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {formatSourceDateLabel(firstScheduledPrimaryDate)}
              </span>
            )}
          </div>
          {scheduledPrimaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
            <div key={`scheduled-primary-${sourceDate}`} className="space-y-2.5">
              <div className={sourceDate === firstScheduledPrimaryDate ? 'sr-only' : 'flex items-center justify-between gap-2 px-1'}>
                <h4 className="text-caption font-black text-gray-600 dark:text-white">
                  {formatSourceDateLabel(sourceDate)}
                </h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-12 font-black text-gray-500 dark:bg-white/10 dark:text-white">
                  {groupedGames.length}경기
                </span>
              </div>
              <HomeScheduledListHeader />
              <HomeScheduledGameList
                games={groupedGames}
                sourceDate={sourceDate}
                shouldMountTeamLogos={shouldMountTeamLogos}
                onSelectPrediction={onSelectPrediction}
              />
            </div>
          ))}
        </section>
      )}

      {scheduledSecondaryGames.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/35 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-body font-black text-amber-700 dark:text-amber-200">
              <span className={HOME_SCHEDULED_WARNING_BADGE_CLASS} aria-hidden="true">!</span>
              연기/취소
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex min-w-10 justify-center rounded-full border border-amber-200 bg-white px-2 py-0.5 text-15 font-black text-amber-700 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200">
                {scheduledSecondaryGames.length}건
              </span>
              <button
                type="button"
                data-testid="home-scheduled-secondary-toggle"
                className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1 text-15 font-black text-amber-700 hover:bg-amber-50 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200 dark:hover:bg-amber-950/20"
                aria-expanded={isSecondarySectionExpanded}
                onClick={onToggleSecondarySection}
              >
                {isSecondarySectionExpanded ? '접기' : '펼치기'}
                <span className={HOME_SCHEDULED_TOGGLE_ICON_CLASS} aria-hidden="true">
                  {isSecondarySectionExpanded ? '^' : 'v'}
                </span>
              </button>
            </div>
          </div>
          {isSecondarySectionExpanded ? (
            scheduledSecondaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
              <div key={`scheduled-secondary-${sourceDate}`} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h4 className="text-caption font-black text-amber-700 dark:text-amber-200">
                    {formatSourceDateLabel(sourceDate)}
                  </h4>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-12 font-black text-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                    {groupedGames.length}경기
                  </span>
                </div>
                <HomeScheduledListHeader />
                <HomeScheduledGameList
                  games={groupedGames}
                  sourceDate={sourceDate}
                  shouldMountTeamLogos={shouldMountTeamLogos}
                  onSelectPrediction={onSelectPrediction}
                />
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-15 font-bold text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-200">
              연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.
            </p>
          )}
        </section>
      )}

      {liveOrFinishedScheduledGames.length > 0 && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-15 font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
          기타 상태 경기 {liveOrFinishedScheduledGames.length}건은 예정경기 탭에서 제외되었습니다.
        </p>
      )}
    </div>
  );
}
