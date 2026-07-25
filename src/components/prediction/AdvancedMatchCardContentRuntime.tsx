import { lazy, Suspense, type ReactNode, useMemo } from 'react';

import TeamLogo from '../TeamLogo';
import ViewportDeferred from '../ViewportDeferred';
import type { Game, GameDetail, GameSummary } from '../../types/prediction';
import {
  getInningMetaTextStyle,
  getInningTeamNameStyle,
  getSectionHeadingTextStyle,
} from '../../utils/advancedMatchCardStyles';
import {
  isManualBaseballDataRequiredCode,
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../../utils/errorUtils';
import { shouldRenderPredictionCoachBriefing } from '../../utils/predictionCoachVisibility';
import {
  PREDICTION_MANUAL_GAME_SUMMARY_MESSAGE,
  PREDICTION_MANUAL_GAME_SUMMARY_TITLE,
  PREDICTION_MANUAL_COACH_MESSAGE,
} from '../../utils/predictionManualDataCopy';
import { filterDisplayableGameSummaries } from '../../utils/predictionSummary';
import {
  PredictionClockIcon,
  PredictionLoaderIcon,
  PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

const AdvancedMatchCardSupplementaryRuntime = lazy(() => import('./AdvancedMatchCardSupplementaryRuntime'));
const PredictionDetailLoadingSkeleton = lazy(() => import('./PredictionDetailLoadingSkeleton'));
const PredictionScoreboardSection = lazy(() => import('./PredictionScoreboardSection'));

type InningRows = Record<number, { away?: number | null; home?: number | null }>;

export interface AdvancedMatchCardContentRuntimeProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  gameDetailRefreshing?: boolean;
  gameDetailError?: string | null;
  gameDetailErrorCode?: string | null;
  gameDetailActions?: ReactNode;
  coachBriefing?: ReactNode;
  votePanel?: ReactNode;
  awayColor: string;
  homeColor: string;
  awayTeamName: string;
  homeTeamName: string;
  awayPitcherName: string;
  homePitcherName: string;
  awayScoreForDisplay: number | string;
  homeScoreForDisplay: number | string;
  isDarkMode: boolean;
  isPostponedOrCancelled: boolean;
  isCancelledStatus: boolean;
  statusCode: string;
  shouldHideResultSections: boolean;
  isScoreboardLoading: boolean;
  inningRows: InningRows;
}

const summaryGroupDefs = [
  { key: 'batting', title: '타격', types: ['결승타', '홈런', '2루타', '3루타', '병살타'] },
  { key: 'running', title: '주루', types: ['도루', '도루자', '주루사', '견제사'] },
  { key: 'pitching', title: '투구/실책', types: ['폭투', '포일', '보크', '실책'] },
  { key: 'etc', title: '기타', types: ['심판', '기타'] },
] as const;

type SummaryType = (typeof summaryGroupDefs)[number]['types'][number];

const summaryTypeSet = new Set<SummaryType>(summaryGroupDefs.flatMap((group) => group.types));

export const shouldShowPredictionManualScoreboardState = ({
  gameDetailErrorCode,
  liveStatusErrorCode,
  gameDetailLoading,
  shouldHideResultSections,
  inningRowCount,
  statusCode,
  awayScoreForDisplay,
  homeScoreForDisplay,
}: {
  gameDetailErrorCode?: string | null;
  liveStatusErrorCode?: string | null;
  gameDetailLoading: boolean;
  shouldHideResultSections: boolean;
  inningRowCount: number;
  statusCode: string;
  awayScoreForDisplay: number | string;
  homeScoreForDisplay: number | string;
}) => {
  const hasDisplayedScore = awayScoreForDisplay !== '-' && homeScoreForDisplay !== '-';
  const isLiveScoreboardDataMissing = statusCode === 'LIVE'
    && inningRowCount === 0
    && !hasDisplayedScore;

  return (isManualBaseballDataRequiredCode(gameDetailErrorCode)
    || isManualBaseballDataRequiredCode(liveStatusErrorCode)
    || isLiveScoreboardDataMissing)
    && !gameDetailLoading
    && !shouldHideResultSections
    && inningRowCount === 0;
};

function PredictionDetailLoadingFallback() {
  return (
    <section
      data-testid="prediction-detail-loading-skeleton"
      aria-hidden="true"
      className="min-h-[148px] rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 dark:border-border dark:bg-secondary/25"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200/60 bg-white/70 px-3.5 py-3 dark:border-border dark:bg-card/45">
            <div className="h-3 w-16 animate-pulse rounded-md bg-slate-200/80 dark:bg-secondary/70" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-md bg-slate-200/80 dark:bg-secondary/70" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded-md bg-slate-200/80 dark:bg-secondary/70" />
          </div>
        ))}
      </div>
    </section>
  );
}

const isSummaryType = (value: string): value is SummaryType => summaryTypeSet.has(value as SummaryType);

const extractInning = (detail?: string | null) => {
  if (!detail) return Number.POSITIVE_INFINITY;
  const match = detail.match(/(\d+)\s*회/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

export default function AdvancedMatchCardContentRuntime({
  game,
  gameDetail,
  gameDetailLoading = false,
  gameDetailRefreshing = false,
  gameDetailError = null,
  gameDetailErrorCode = null,
  gameDetailActions,
  coachBriefing,
  votePanel,
  awayColor,
  homeColor,
  awayTeamName,
  homeTeamName,
  awayPitcherName,
  homePitcherName,
  awayScoreForDisplay,
  homeScoreForDisplay,
  isDarkMode,
  isPostponedOrCancelled,
  isCancelledStatus,
  statusCode,
  shouldHideResultSections,
  isScoreboardLoading,
  inningRows,
}: AdvancedMatchCardContentRuntimeProps) {
  const headingTextStyle = getSectionHeadingTextStyle(isDarkMode);
  const pitchTextStyle = getInningMetaTextStyle(isDarkMode);
  const awayTeamNameStyle = getInningTeamNameStyle(awayColor, isDarkMode);
  const homeTeamNameStyle = getInningTeamNameStyle(homeColor, isDarkMode);

  const attendanceLabel = gameDetail?.attendance != null
    ? `${gameDetail.attendance.toLocaleString()}명`
    : null;
  const weatherLabel = gameDetail?.weather?.trim() || null;
  const gameTimeLabel = gameDetail?.gameTimeMinutes != null
    ? `${Math.floor(gameDetail.gameTimeMinutes / 60)}시간 ${gameDetail.gameTimeMinutes % 60}분`
    : null;
  const isDetailBusy = gameDetailLoading || gameDetailRefreshing;
  const isInitialDetailLoading = gameDetailLoading && !gameDetail && !gameDetailError;
  const shouldShowDetailRefreshIndicator = !gameDetailError
    && !isInitialDetailLoading
    && (gameDetailRefreshing || (gameDetailLoading && Boolean(gameDetail)));
  const isManualBaseballDataRequired = isManualBaseballDataRequiredCode(gameDetailErrorCode);
  const shouldShowMatchEnvironmentLoading = isDetailBusy && !attendanceLabel && !weatherLabel && !gameTimeLabel;
  const liveRelayEvents = gameDetail?.liveRelayEvents ?? [];
  const liveRelayError = gameDetail?.liveRelayError ?? null;
  const liveRelayErrorCode = gameDetail?.liveRelayErrorCode ?? null;
  const liveStatusErrorCode = gameDetail?.liveStatusErrorCode ?? null;
  const isManualLiveStatusError = isManualBaseballDataRequiredCode(liveStatusErrorCode);

  const displayableSummaries = useMemo(
    () => filterDisplayableGameSummaries(gameDetail?.summary),
    [gameDetail?.summary],
  );
  const primarySummaryItems = useMemo(
    () => displayableSummaries
      .filter((item) => item.type !== '심판')
      .slice(0, 3),
    [displayableSummaries],
  );

  const summaryGroups = useMemo(() => displayableSummaries.reduce(
    (acc: Record<string, GameSummary[]>, item) => {
      const key = item.type || '기타';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, GameSummary[]>,
  ), [displayableSummaries]);

  const extraSummaryTypes = useMemo(
    () => Object.keys(summaryGroups).filter((type) => !isSummaryType(type)),
    [summaryGroups],
  );

  const groupedSummary = useMemo(
    () => summaryGroupDefs
      .map((group) => {
        const types = group.key === 'etc'
          ? [...group.types, ...extraSummaryTypes]
          : group.types;

        const entries = types.flatMap((type) => {
          const items = summaryGroups[type] || [];
          const trimmed = type === '심판' ? items.slice(0, 1) : items;
          return trimmed.map((item) => ({ ...item, type }));
        });

        return { title: group.title, entries };
      })
      .filter((group) => group.entries.length > 0),
    [extraSummaryTypes, summaryGroups],
  );

  const timelineEntries = useMemo(
    () => groupedSummary
      .flatMap((group) => group.entries.map((item) => ({ ...item, groupTitle: group.title })))
      .map((item, index) => ({
        type: item.type,
        playerName: item.playerName ?? undefined,
        detail: item.detail ?? undefined,
        groupTitle: item.groupTitle,
        _index: index,
        _inning: extractInning(item.detail),
      }))
      .sort((a, b) => (a._inning - b._inning) || (a._index - b._index)),
    [groupedSummary],
  );
  const inningRowCount = Object.keys(inningRows).length;
  const shouldShowManualSummaryState = isManualBaseballDataRequired
    && !gameDetailLoading
    && !shouldHideResultSections
    && primarySummaryItems.length === 0;
  const shouldShowManualScoreboardState = shouldShowPredictionManualScoreboardState({
    gameDetailErrorCode,
    liveStatusErrorCode,
    gameDetailLoading,
    shouldHideResultSections,
    inningRowCount,
    statusCode,
    awayScoreForDisplay,
    homeScoreForDisplay,
  });
  const shouldShowCoachBriefing = shouldRenderPredictionCoachBriefing({
    gameDetailLoading,
    isPostponedOrCancelled,
    gameDetailErrorCode,
  });
  const shouldShowManualCoachState = isManualBaseballDataRequired
    && !gameDetailLoading
    && !isPostponedOrCancelled;
  const shouldShowSupplementaryRuntime = Boolean(
    timelineEntries.length > 0
    || liveRelayEvents.length > 0
    || liveRelayError
    || shouldShowManualSummaryState
    || (!gameDetailLoading && !shouldHideResultSections && inningRowCount === 0)
    || (!gameDetailLoading && !shouldHideResultSections && summaryGroups['심판']?.length)
    || attendanceLabel
    || weatherLabel
    || gameTimeLabel
    || shouldShowMatchEnvironmentLoading,
  );

  const supplementaryFallback = null;

  if (isInitialDetailLoading) {
    return (
      <div className="space-y-6 px-4 py-6">
        <div data-testid="prediction-detail-refresh-indicator" className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1.5 text-13 font-bold text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-100">
            <PredictionLoaderIcon className="h-3.5 w-3.5 animate-spin" />
            경기 상세 정보를 불러오는 중입니다.
          </span>
        </div>
        <Suspense fallback={<PredictionDetailLoadingFallback />}>
          <PredictionDetailLoadingSkeleton />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {gameDetailError ? (
        <div
          data-testid="prediction-detail-error-banner"
          data-error-code={gameDetailErrorCode || undefined}
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-body text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100"
        >
          <div className="flex items-start gap-2">
            <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {isManualBaseballDataRequired
                  ? '야구 데이터 준비가 필요합니다.'
                  : '일부 경기 상세 정보를 불러오지 못했습니다.'}
              </p>
              <p className="mt-1 text-body opacity-90">{gameDetailError}</p>
              {isManualBaseballDataRequired ? (
                <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-13 text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                  {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                </p>
              ) : null}
            </div>
          </div>
          {gameDetailActions ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {gameDetailActions}
            </div>
          ) : null}
        </div>
      ) : null}

      {shouldShowDetailRefreshIndicator ? (
        <div data-testid="prediction-detail-refresh-indicator" className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/90 px-3 py-1.5 text-13 font-bold text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-100">
            <PredictionLoaderIcon className="h-3.5 w-3.5 animate-spin" />
            {gameDetailRefreshing ? '최신 정보 갱신 중' : '상세 정보 확인 중'}
          </span>
        </div>
      ) : null}

      {primarySummaryItems.length > 0 ? (
        <section data-testid="prediction-game-summary">
          <div
            className="mb-3 flex items-center gap-2 text-body font-bold text-gray-900 dark:text-white"
            style={headingTextStyle}
          >
            <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
            경기 요약
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {primarySummaryItems.map((item, index) => {
              const summaryText = [item.playerName, item.detail]
                .filter((value) => value?.trim())
                .join(' · ');

              return (
                <div
                  key={`${item.type}-${item.playerName || ''}-${index}`}
                  className="rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-3 dark:border-border dark:bg-secondary/40"
                >
                  <p className="text-15 font-bold text-gray-500 dark:text-white">
                    {item.type || '요약'}
                  </p>
                  <p className="mt-1 text-body font-semibold leading-relaxed text-gray-800 dark:text-white">
                    {summaryText || '상세 요약을 확인 중입니다.'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {shouldShowManualSummaryState ? (
        <section data-testid="prediction-game-summary-manual-required">
          <div
            className="mb-3 flex items-center gap-2 text-body font-bold text-gray-900 dark:text-white"
            style={headingTextStyle}
          >
            <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
            경기 요약
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-body text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">{PREDICTION_MANUAL_GAME_SUMMARY_TITLE}</p>
                <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_GAME_SUMMARY_MESSAGE}</p>
                <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-13 text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                  {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isScoreboardLoading && shouldHideResultSections && (
        <section>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-4 text-body text-gray-600 dark:border-border dark:bg-secondary/40 dark:text-white">
            {isPostponedOrCancelled ? (
              <div className="flex items-start gap-2">
                <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <p>
                  {isCancelledStatus
                    ? '해당 경기는 취소되어 투표 및 경기 상세 정보가 제공되지 않습니다.'
                    : '해당 경기는 연기되어 투표 및 경기 상세 정보가 제공되지 않습니다.'}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <PredictionClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p>스코어보드와 경기 주요 기록은 경기 시작 후 제공됩니다.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {!isScoreboardLoading && !shouldHideResultSections && (
        <Suspense fallback={null}>
          <PredictionScoreboardSection
            headingTextStyle={headingTextStyle}
            awayTeamNameStyle={awayTeamNameStyle}
            homeTeamNameStyle={homeTeamNameStyle}
            liveStatusError={gameDetail?.liveStatusError ?? null}
            liveStatusErrorCode={liveStatusErrorCode}
            isManualLiveStatusError={isManualLiveStatusError}
            shouldShowManualScoreboardState={shouldShowManualScoreboardState}
            inningRows={inningRows}
            awayTeamName={awayTeamName}
            homeTeamName={homeTeamName}
            awayScoreForDisplay={awayScoreForDisplay}
            homeScoreForDisplay={homeScoreForDisplay}
          />
        </Suspense>
      )}

      {votePanel}

      <section>
        <div className="mb-2.5 flex items-center gap-2 text-body font-bold tracking-[0.08em] text-gray-500 dark:text-white/60" style={headingTextStyle}>
          <span className="h-[2px] w-6 rounded-full bg-gray-500 dark:bg-white/60" />
          선발 투수
        </div>
        <div className="flex items-center rounded-xl border border-gray-100/90 bg-gradient-to-br from-white/90 via-white to-gray-50/70 dark:border-border dark:from-secondary/45 dark:to-secondary/25 px-4 py-4 shadow-sm">
          <div className="flex-1 text-center">
            <TeamLogo team={game.awayTeam} size={20} className="mx-auto mb-1.5" />
            <p className="break-keep text-18 sm:text-19 leading-[1.28] font-black" style={awayTeamNameStyle}>
              {awayTeamName}
            </p>
            <p className="mt-1.5 text-body leading-[1.45]" style={pitchTextStyle}>
              {awayPitcherName}
            </p>
          </div>
          <div className="h-9 w-px bg-gray-200/90 dark:bg-border" />
          <div className="flex-1 text-center">
            <TeamLogo team={game.homeTeam} size={20} className="mx-auto mb-1.5" />
            <p className="break-keep text-18 sm:text-19 leading-[1.28] font-black" style={homeTeamNameStyle}>
              {homeTeamName}
            </p>
            <p className="mt-1.5 text-body leading-[1.45]" style={pitchTextStyle}>
              {homePitcherName}
            </p>
          </div>
        </div>
      </section>

      {shouldShowManualCoachState ? (
        <section data-testid="prediction-coach-manual-required">
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-body text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">AI 코치 상세 분석은 수동 데이터 입력 후 제공됩니다.</p>
                  <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_COACH_MESSAGE}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : shouldShowCoachBriefing ? coachBriefing : null}

      {shouldShowSupplementaryRuntime ? (
        <ViewportDeferred fallback={supplementaryFallback} rootMargin="220px 0px 320px 0px">
          <Suspense fallback={supplementaryFallback}>
            <AdvancedMatchCardSupplementaryRuntime
              awayColor={awayColor}
              homeColor={homeColor}
              timelineEntries={timelineEntries}
              summaryGroups={summaryGroups}
              inningRowCount={inningRowCount}
              shouldHideResultSections={shouldHideResultSections}
              gameDetailLoading={gameDetailLoading}
              attendanceLabel={attendanceLabel}
              weatherLabel={weatherLabel}
              gameTimeLabel={gameTimeLabel}
              shouldShowMatchEnvironmentLoading={shouldShowMatchEnvironmentLoading}
              isDarkMode={isDarkMode}
              isManualBaseballDataRequired={isManualBaseballDataRequired}
              liveEvents={liveRelayEvents}
              liveRelayError={liveRelayError}
              liveRelayErrorCode={liveRelayErrorCode}
            />
          </Suspense>
        </ViewportDeferred>
      ) : null}
    </div>
  );
}
