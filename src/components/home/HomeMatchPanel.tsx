import type { CSSProperties } from 'react';

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

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
        style={matchSectionMinHeightStyle}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
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
          className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm"
        style={matchSectionMinHeightStyle}
      >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-0 items-stretch">
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
      <div className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold" style={matchSectionMinHeightStyle}>
          선택한 날짜부터 7일 내 예정 경기가 없습니다.
        </div>
      );
    }

    return (
      <div className="space-y-6 rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
        {scheduledPrimaryGames.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-100/90 px-3 py-2 dark:border-border dark:bg-secondary/80">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-bold text-gray-700 dark:text-gray-100">
                <ClockIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                <span>곧 열리는 경기</span>
                <span className="text-gray-400 dark:text-gray-500">·</span>
                <span className="text-emerald-700 dark:text-emerald-300">{scheduledPrimaryGames.length}건</span>
              </div>
              {firstScheduledPrimaryDate && (
                <span className="inline-flex rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-[14px] font-bold text-gray-600 dark:border-border dark:bg-background/30 dark:text-gray-200">
                  {formatSourceDateLabel(firstScheduledPrimaryDate)}
                </span>
              )}
            </div>
            {scheduledPrimaryGamesBySourceDate.map(([sourceDate, groupedGames]) => (
              <div key={`scheduled-primary-${sourceDate}`} className="space-y-3">
                {sourceDate !== firstScheduledPrimaryDate && (
                  <h4 className="px-1 text-[14px] font-bold text-gray-500 dark:text-gray-300">
                    {formatSourceDateLabel(sourceDate)}
                  </h4>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                  {groupedGames.map((game, index) => (
                    <GameCard
                      key={`${game.gameId}-${sourceDate}-${index}`}
                      game={game}
                      variant="home"
                      onSelectPrediction={() => onSelectPrediction(game)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {scheduledSecondaryGames.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-100/90 px-3 py-2 dark:border-border dark:bg-secondary/80">
              <div className="flex items-center gap-2 text-[16px] font-bold text-amber-700 dark:text-amber-300">
                <WarningTriangleIcon className="w-4 h-4" />
                연기/취소
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex min-w-10 justify-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[16px] font-bold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-300">
                  {scheduledSecondaryGames.length}건
                </span>
                <button
                  type="button"
                  data-testid="home-scheduled-secondary-toggle"
                  className="inline-flex min-h-11 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1 text-[16px] font-bold text-gray-600 hover:bg-gray-50 dark:border-border dark:bg-secondary dark:text-gray-200 dark:hover:bg-secondary/70"
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
                <div key={`scheduled-secondary-${sourceDate}`} className="space-y-3">
                  <h4 className="px-1 text-[14px] font-bold text-gray-500 dark:text-gray-300">
                    {formatSourceDateLabel(sourceDate)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                    {groupedGames.map((game, index) => (
                      <GameCard
                        key={`${game.gameId}-${sourceDate}-${index}`}
                        game={game}
                        variant="home"
                        onSelectPrediction={() => onSelectPrediction(game)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[16px] text-gray-500 dark:text-gray-300 font-bold px-1">
                연기/취소 경기가 접혀 있습니다. 펼치기 버튼으로 확인하세요.
              </p>
            )}
          </section>
        )}

        {liveOrFinishedScheduledGames.length > 0 && (
          <p className="text-[16px] text-gray-400 dark:text-gray-300 text-center font-bold">
            기타 상태 경기 {liveOrFinishedScheduledGames.length}건은 예정경기 탭에서 제외되었습니다.
          </p>
        )}
      </div>
    );
  }

  if (activeStandardGames.length === 0) {
    return (
      <div
        className="text-center py-16 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold"
        style={matchSectionMinHeightStyle}
      >
        경기가 없는 날입니다.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/15 bg-white/70 dark:bg-card/45 p-4 md:p-5 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
        {activeStandardGames.map((game, index) => (
          <GameCard
            key={`${game.gameId}-${index}`}
            game={game}
            variant="home"
            onSelectPrediction={() => onSelectPrediction(game)}
          />
        ))}
      </div>
    </div>
  );
}
