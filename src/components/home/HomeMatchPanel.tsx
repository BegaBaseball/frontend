import type { CSSProperties, ReactNode } from 'react';

import { Button } from '../ui/button';
import GameCard from '../GameCard';
import {
  ChevronDownIcon,
  ClockIcon,
  RefreshIcon,
  WarningTriangleIcon,
} from '../icons/PublicShellIcons';
import { GameCardSkeleton } from './GameCardSkeleton';
import { formatSourceDateLabel } from '../../utils/homeSeasonLogic';
import type { Game } from '../../types/home';
import type { LeagueTab } from '../../utils/predictionHomeLogic';
import type { HomeLoadFailureReason } from '../../api/home';

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

const BOARD_SHELL_CLASS = 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/12 dark:bg-card md:p-5';
const BOARD_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-2.5';

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
    : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-gray-200';

  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-white/8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[12px] font-black uppercase tracking-[0.16em] text-primary dark:text-emerald-300">
            {copy.eyebrow}
          </span>
        </div>
        <h3 className="truncate text-[20px] font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {copy.title}
        </h3>
        <p className="mt-1 text-[14px] font-bold leading-relaxed text-gray-500 dark:text-gray-400 sm:text-[15px]">
          {copy.description}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-[14px] font-black ${countClass}`}>
          {countLabel}
        </span>
        {detailLabel ? (
          <span className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[14px] font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
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
    <div className={BOARD_SHELL_CLASS} style={style}>
      {copy ? (
        <HomeScheduleBoardHeader
          copy={copy}
          countLabel={countLabel || '0경기'}
          detailLabel={detailLabel}
        />
      ) : null}
      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-[16px] font-bold text-gray-500 dark:border-white/12 dark:bg-white/[0.04] dark:text-gray-300">
        {children}
      </div>
    </div>
  );
}

function HomeScheduleListHeader() {
  return (
    <div className="hidden px-3 pb-1 text-[11px] font-black text-gray-400 dark:text-gray-500 lg:grid lg:grid-cols-[5.5rem_minmax(0,1.25fr)_5rem_minmax(0,1.25fr)_minmax(8rem,0.85fr)_7.5rem] lg:gap-4">
      <span>시간</span>
      <span>원정</span>
      <span className="text-center">경기</span>
      <span className="text-right">홈</span>
      <span>구장</span>
      <span className="text-right">상태</span>
    </div>
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
  onRetry,
  onSelectPrediction,
  onToggleSecondarySection,
}: HomeMatchPanelProps) {
  const activeTabIsScheduled = activeLeagueTab === 'scheduled';
  const isManualDataError = loadFailureReason === 'manual-data-required';
  const firstScheduledPrimaryDate = scheduledPrimaryGamesBySourceDate[0]?.[0];
  const activePanelCopy = HOME_MATCH_PANEL_COPY[activeLeagueTab];
  const scheduledTotalGames = scheduledPrimaryGames.length + scheduledSecondaryGames.length;

  if (isLoading) {
    return (
      <div
        className={BOARD_SHELL_CLASS}
        style={matchSectionMinHeightStyle}
      >
        <HomeScheduleBoardHeader
          copy={activePanelCopy}
          countLabel="일정 확인 중"
          detailLabel="최신 경기 정보"
        />
        <HomeScheduleListHeader />
        <div className={BOARD_GRID_CLASS}>
          {Array.from({ length: loadingMatchCardCount }, (_, index) => <GameCardSkeleton key={`loading-game-${index}`} />)}
        </div>
      </div>
    );
  }

  if (isGamesError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm"
        style={matchSectionMinHeightStyle}
      >
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
          <WarningTriangleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <p className="text-gray-700 dark:text-gray-200 font-bold mb-1">
          {isManualDataError ? '야구 데이터 준비가 필요합니다' : '경기 일정을 불러오지 못했습니다'}
        </p>
        <p className="text-gray-400 dark:text-gray-400 text-[16px] font-bold mb-4">
          {isManualDataError
            ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
            : '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
        </p>
        {suppressRecoveryActions ? (
          <p className="text-[16px] font-bold text-gray-500 dark:text-gray-400">
            위의 전체 다시 시도 버튼으로 한 번에 확인하세요.
          </p>
        ) : (
          <Button
            variant="outline"
            size="touch"
            onClick={onRetry}
            className="border-primary/30 text-primary hover:bg-primary/5 font-bold"
          >
            <RefreshIcon className="w-4 h-4 mr-1.5" />
            다시 시도
          </Button>
        )}
      </div>
    );
  }

  if (activeTabIsScheduled) {
    if (isScheduledLoading) {
      return (
        <div
          className={BOARD_SHELL_CLASS}
          style={matchSectionMinHeightStyle}
        >
          <HomeScheduleBoardHeader
            copy={activePanelCopy}
            countLabel="예정 경기 확인 중"
            detailLabel="7일 일정"
          />
          <HomeScheduleListHeader />
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
        <div
          className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm"
          style={matchSectionMinHeightStyle}
        >
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
            <WarningTriangleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-200 font-bold mb-1">
            {isManualDataError ? '야구 데이터 준비가 필요합니다' : '예정 경기를 불러오지 못했습니다'}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-[16px] font-bold mt-1">
            {isManualDataError
              ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
              : '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
          </p>
          {suppressRecoveryActions ? (
            <p className="mt-3 text-[16px] font-bold text-gray-500 dark:text-gray-400">
              위의 전체 다시 시도 버튼으로 한 번에 확인하세요.
            </p>
          ) : (
            <Button
              variant="outline"
              size="touch"
              onClick={onRetry}
              className="border-primary/30 text-primary hover:bg-primary/5 mt-3 font-bold"
            >
              <RefreshIcon className="w-4 h-4 mr-1.5" />
              다시 시도
            </Button>
          )}
        </div>
      );
    }

    if (scheduledPrimaryGames.length === 0 && scheduledSecondaryGames.length === 0) {
      return (
        <HomeScheduleEmptyState
          style={matchSectionMinHeightStyle}
          copy={activePanelCopy}
          countLabel="0경기"
          detailLabel="7일 일정"
        >
          선택한 날짜부터 7일 내 예정 경기가 없습니다.
        </HomeScheduleEmptyState>
      );
    }

    return (
      <div className={`${BOARD_SHELL_CLASS} space-y-6`} style={matchSectionMinHeightStyle}>
        <HomeScheduleBoardHeader
          copy={activePanelCopy}
          countLabel={`${scheduledTotalGames}경기`}
          detailLabel={`예정 ${scheduledPrimaryGames.length}건 · 변동 ${scheduledSecondaryGames.length}건`}
          tone={scheduledSecondaryGames.length > 0 ? 'warning' : 'default'}
        />

        {scheduledPrimaryGames.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-black text-gray-800 dark:text-gray-100">
                <ClockIcon className="h-4 w-4 text-primary dark:text-emerald-300" />
                <span>곧 열리는 경기</span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{scheduledPrimaryGames.length}건</span>
              </div>
              {firstScheduledPrimaryDate && (
                <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[14px] font-black text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
                  {formatSourceDateLabel(firstScheduledPrimaryDate)}
                </span>
              )}
            </div>
            {scheduledPrimaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
              <div key={`scheduled-primary-${sourceDate}`} className="space-y-2.5">
                <div className={sourceDate === firstScheduledPrimaryDate ? 'sr-only' : 'flex items-center justify-between gap-2 px-1'}>
                  <h4 className="text-[14px] font-black text-gray-600 dark:text-gray-200">
                    {formatSourceDateLabel(sourceDate)}
                  </h4>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-black text-gray-500 dark:bg-white/10 dark:text-gray-300">
                    {groupedGames.length}경기
                  </span>
                </div>
                <HomeScheduleListHeader />
                <div className={BOARD_GRID_CLASS}>
                  {groupedGames.map((game, index) => (
                    <div
                      key={`${game.gameId}-${sourceDate}-${index}`}
                      className="h-full"
                      data-testid="home-game-card"
                      data-game-id={game.gameId}
                    >
                      <GameCard
                        game={game}
                        variant="home"
                        onSelectPrediction={() => onSelectPrediction(game)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {scheduledSecondaryGames.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/35 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-[16px] font-black text-amber-700 dark:text-amber-200">
                <WarningTriangleIcon className="h-4 w-4" />
                연기/취소
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex min-w-10 justify-center rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[15px] font-black text-amber-700 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200">
                  {scheduledSecondaryGames.length}건
                </span>
                <button
                  type="button"
                  data-testid="home-scheduled-secondary-toggle"
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-1 text-[15px] font-black text-amber-700 hover:bg-amber-50 dark:border-amber-700/40 dark:bg-white/[0.04] dark:text-amber-200 dark:hover:bg-amber-950/20"
                  aria-expanded={isSecondarySectionExpanded}
                  onClick={onToggleSecondarySection}
                >
                  {isSecondarySectionExpanded ? '접기' : '펼치기'}
                  <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isSecondarySectionExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            {isSecondarySectionExpanded ? (
              scheduledSecondaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
                <div key={`scheduled-secondary-${sourceDate}`} className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <h4 className="text-[14px] font-black text-amber-700 dark:text-amber-200">
                      {formatSourceDateLabel(sourceDate)}
                    </h4>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[12px] font-black text-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                      {groupedGames.length}경기
                    </span>
                  </div>
                  <HomeScheduleListHeader />
                  <div className={BOARD_GRID_CLASS}>
                    {groupedGames.map((game, index) => (
                      <div
                        key={`${game.gameId}-${sourceDate}-${index}`}
                        className="h-full"
                        data-testid="home-game-card"
                        data-game-id={game.gameId}
                      >
                        <GameCard
                          game={game}
                          variant="home"
                          onSelectPrediction={() => onSelectPrediction(game)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-[15px] font-bold text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/20 dark:text-amber-200">
                연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.
              </p>
            )}
          </section>
        )}

        {liveOrFinishedScheduledGames.length > 0 && (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-[15px] font-bold text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
            기타 상태 경기 {liveOrFinishedScheduledGames.length}건은 예정경기 탭에서 제외되었습니다.
          </p>
        )}
      </div>
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
    <div className={BOARD_SHELL_CLASS} style={matchSectionMinHeightStyle}>
      <HomeScheduleBoardHeader
        copy={activePanelCopy}
        countLabel={`${activeStandardGames.length}경기`}
        detailLabel="승부예측 이동 가능"
      />
      <HomeScheduleListHeader />
      <div className={BOARD_GRID_CLASS}>
        {activeStandardGames.map((game, index) => (
          <div
            key={`${game.gameId}-${index}`}
            className="h-full"
            data-testid="home-game-card"
            data-game-id={game.gameId}
          >
            <GameCard
              game={game}
              variant="home"
              onSelectPrediction={() => onSelectPrediction(game)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
