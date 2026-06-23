import { lazy, Suspense, type ReactNode, useMemo, useRef, useState } from 'react';

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
  PREDICTION_MANUAL_LIVE_SCORE_MESSAGE,
  PREDICTION_MANUAL_SCOREBOARD_MESSAGE,
} from '../../utils/predictionManualDataCopy';
import { filterDisplayableGameSummaries } from '../../utils/predictionSummary';
import { VotePercentageGauge } from './VotePercentageGauge';
import {
  PredictionClockIcon,
  PredictionLoaderIcon,
  PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

const AdvancedMatchCardSupplementaryRuntime = lazy(() => import('./AdvancedMatchCardSupplementaryRuntime'));

type InningRows = Record<number, { away?: number | null; home?: number | null }>;

const inningTableClassName = 'min-w-[580px] w-full table-fixed border-collapse text-center text-[16px]';
const inningTeamHeaderClassName = 'w-[112px] whitespace-nowrap px-2 py-2 text-left font-bold';
const inningHeaderCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border/70';
const inningRunHeaderClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border font-bold text-red-600';
const inningTeamCellBaseClassName = 'w-[112px] whitespace-nowrap px-2 py-2 text-left font-bold bg-gray-50/70 dark:bg-secondary/30';
const inningCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-100 dark:border-border/60';
const inningRunCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border font-bold text-red-600 bg-red-50/40 dark:bg-red-900/20';

export interface AdvancedMatchCardContentRuntimeProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  gameDetailRefreshing?: boolean;
  gameDetailError?: string | null;
  gameDetailErrorCode?: string | null;
  gameDetailActions?: ReactNode;
  coachBriefing?: ReactNode;
  awayColor: string;
  homeColor: string;
  awayTeamName: string;
  homeTeamName: string;
  awayPitcherName: string;
  homePitcherName: string;
  awayScoreForDisplay: number | string;
  homeScoreForDisplay: number | string;
  votePercentages: { homePercentage: number; awayPercentage: number; totalVotes: number };
  cheeringCaption: string;
  isDarkMode: boolean;
  isPostponedOrCancelled: boolean;
  isCancelledStatus: boolean;
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
  awayColor,
  homeColor,
  awayTeamName,
  homeTeamName,
  awayPitcherName,
  homePitcherName,
  awayScoreForDisplay,
  homeScoreForDisplay,
  votePercentages,
  cheeringCaption,
  isDarkMode,
  isPostponedOrCancelled,
  isCancelledStatus,
  shouldHideResultSections,
  isScoreboardLoading,
  inningRows,
}: AdvancedMatchCardContentRuntimeProps) {
  const [inningPage, setInningPage] = useState(0);
  const inningPointerStartXRef = useRef<number | null>(null);

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
  const isManualBaseballDataRequired = isManualBaseballDataRequiredCode(gameDetailErrorCode);
  const shouldShowMatchEnvironmentLoading = isDetailBusy && !attendanceLabel && !weatherLabel && !gameTimeLabel;
  const liveRelayEvents = gameDetail?.liveRelayEvents ?? [];
  const liveRelayError = gameDetail?.liveRelayError ?? null;
  const liveRelayErrorCode = gameDetail?.liveRelayErrorCode ?? null;
  const liveStatusError = gameDetail?.liveStatusError ?? null;
  const liveStatusErrorCode = gameDetail?.liveStatusErrorCode ?? null;
  const isManualLiveStatusError = isManualBaseballDataRequiredCode(liveStatusErrorCode);

  const inningKeys = Object.keys(inningRows).map(Number).sort((a, b) => a - b);
  const regularInnings = inningKeys.filter((inning) => inning <= 9);
  const extraInnings = inningKeys.filter((inning) => inning > 9);
  const regularInningCols = regularInnings.length
    ? regularInnings
    : Array.from({ length: 9 }, (_, index) => index + 1);
  const extraInningCols = extraInnings;
  const hasExtraInnings = extraInnings.length > 0;

  const { homePercentage, awayPercentage, totalVotes } = votePercentages;
  const awayVotes = totalVotes === 0
    ? 0
    : Math.round((awayPercentage / 100) * totalVotes);
  const homeVotes = totalVotes === 0
    ? 0
    : Math.max(0, totalVotes - awayVotes);
  const awayPercent = totalVotes === 0 ? 50 : (awayVotes / totalVotes) * 100;
  const homePercent = totalVotes === 0 ? 50 : (homeVotes / totalVotes) * 100;

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
  const shouldShowManualScoreboardState = isManualBaseballDataRequired
    && !gameDetailLoading
    && !shouldHideResultSections
    && inningRowCount === 0;
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

  const handleInningSwipeOffset = (offsetX: number) => {
    if (!hasExtraInnings) return;
    if (offsetX < -50 && inningPage === 0) {
      setInningPage(1);
    }
    if (offsetX > 50 && inningPage === 1) {
      setInningPage(0);
    }
  };

  const handleInningPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    inningPointerStartXRef.current = event.clientX;
  };

  const handleInningPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (inningPointerStartXRef.current == null) {
      return;
    }

    const offsetX = event.clientX - inningPointerStartXRef.current;
    inningPointerStartXRef.current = null;
    handleInningSwipeOffset(offsetX);
  };

  const clearInningPointerStart = () => {
    inningPointerStartXRef.current = null;
  };

  return (
    <div className="space-y-6 px-4 py-6">
      {(gameDetailError || isDetailBusy) && (
        <div
          data-testid={gameDetailError ? 'prediction-detail-error-banner' : 'prediction-detail-refresh-indicator'}
          data-error-code={gameDetailErrorCode || undefined}
          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-[16px] ${
            gameDetailError
              ? 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100'
              : 'border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-100'
          }`}
        >
          <div className="flex items-start gap-2">
            {gameDetailError ? (
              <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <PredictionLoaderIcon className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {gameDetailError
                  ? isManualBaseballDataRequired
                    ? '야구 데이터 준비가 필요합니다.'
                    : '일부 경기 상세 정보를 불러오지 못했습니다.'
                  : gameDetailRefreshing
                    ? '최신 경기 정보를 다시 불러오는 중입니다.'
                    : '경기 상세 정보를 불러오는 중입니다.'}
              </p>
              {gameDetailError ? (
                <>
                  <p className="mt-1 text-[16px] opacity-90">{gameDetailError}</p>
                  {isManualBaseballDataRequired ? (
                    <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-[13px] text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                      {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-[16px] opacity-80">기존 기록은 유지한 채 가능한 정보부터 갱신합니다.</p>
              )}
            </div>
          </div>
          {gameDetailError && gameDetailActions ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {gameDetailActions}
            </div>
          ) : null}
        </div>
      )}

      {isScoreboardLoading && (
        <div className="text-center text-[16px] text-gray-500 dark:text-white">경기 정보를 불러오는 중입니다...</div>
      )}

      {primarySummaryItems.length > 0 ? (
        <section data-testid="prediction-game-summary">
          <div
            className="mb-3 flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-white"
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
                  <p className="text-[15px] font-bold text-gray-500 dark:text-white">
                    {item.type || '요약'}
                  </p>
                  <p className="mt-1 text-[16px] font-semibold leading-relaxed text-gray-800 dark:text-white">
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
            className="mb-3 flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-white"
            style={headingTextStyle}
          >
            <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
            경기 요약
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-[16px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">{PREDICTION_MANUAL_GAME_SUMMARY_TITLE}</p>
                <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_GAME_SUMMARY_MESSAGE}</p>
                <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-[13px] text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                  {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!isScoreboardLoading && shouldHideResultSections && (
        <section>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-4 text-[16px] text-gray-600 dark:border-border dark:bg-secondary/40 dark:text-white">
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
        <section>
          <div
            className="mb-3 flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-white"
            style={headingTextStyle}
          >
            <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
            스코어보드
            {hasExtraInnings ? (
              <span className="ml-auto text-[16px] text-gray-400">
                {inningPage === 0 ? '연장이닝 보기 →' : '← 정규이닝 보기'}
              </span>
            ) : null}
          </div>
          {liveStatusError ? (
            <div
              data-testid="prediction-scoreboard-live-status-warning"
              data-error-code={liveStatusErrorCode || undefined}
              className="mb-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-3 text-[15px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100"
            >
              <div className="flex items-start gap-2">
                <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold">
                    {isManualLiveStatusError
                      ? '실시간 점수/이닝 데이터 준비가 필요합니다.'
                      : '실시간 점수 갱신 상태를 확인 중입니다.'}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {isManualLiveStatusError ? PREDICTION_MANUAL_LIVE_SCORE_MESSAGE : liveStatusError}
                  </p>
                  {isManualLiveStatusError ? (
                    <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-[13px] text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                      {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <div
            data-testid="prediction-scoreboard"
            className="overflow-hidden rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40"
          >
            {shouldShowManualScoreboardState ? (
              <div
                data-testid="prediction-scoreboard-manual-required"
                className="flex items-start gap-2 px-4 py-4 text-[16px] text-amber-800 dark:text-amber-200"
              >
                <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold">스코어보드 상세 입력 대기</p>
                  <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_SCOREBOARD_MESSAGE}</p>
                  <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-50 px-2 py-0.5 font-mono text-[13px] text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                    {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                  </p>
                </div>
              </div>
            ) : hasExtraInnings ? (
              <div
                className="overflow-hidden"
                onPointerDown={handleInningPointerDown}
                onPointerUp={handleInningPointerUp}
                onPointerCancel={clearInningPointerStart}
                style={{ touchAction: 'pan-y' }}
              >
                <div
                  className="flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${inningPage * 100}%)` }}
                >
                  {[regularInningCols, extraInningCols].map((cols, index) => (
                    <div key={index} className="min-w-full overflow-x-auto px-3 py-3">
                      <table className={inningTableClassName}>
                        <thead className="bg-gray-100 dark:bg-border/60 text-[16px] text-gray-600 dark:text-white border-b border-gray-200 dark:border-border">
                          <tr>
                            <th className={inningTeamHeaderClassName}>팀</th>
                            {cols.map((inning) => (
                              <th key={inning} className={inningHeaderCellClassName}>{inning}</th>
                            ))}
                            <th className={inningRunHeaderClassName}>R</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-white">
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                            <td className={inningTeamCellBaseClassName} style={awayTeamNameStyle}>
                              {awayTeamName}
                            </td>
                            {cols.map((inning) => (
                              <td
                                key={`away-${inning}`}
                                data-testid={`prediction-scoreboard-cell-away-${inning}`}
                                className={inningCellClassName}
                              >
                                {inningRows[inning]?.away ?? '-'}
                              </td>
                            ))}
                            <td
                              data-testid={index === 0 ? 'prediction-scoreboard-total-away' : 'prediction-scoreboard-total-away-extra-page'}
                              className={inningRunCellClassName}
                            >
                              {awayScoreForDisplay}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                            <td className={inningTeamCellBaseClassName} style={homeTeamNameStyle}>
                              {homeTeamName}
                            </td>
                            {cols.map((inning) => (
                              <td
                                key={`home-${inning}`}
                                data-testid={`prediction-scoreboard-cell-home-${inning}`}
                                className={inningCellClassName}
                              >
                                {inningRows[inning]?.home ?? '-'}
                              </td>
                            ))}
                            <td
                              data-testid={index === 0 ? 'prediction-scoreboard-total-home' : 'prediction-scoreboard-total-home-extra-page'}
                              className={inningRunCellClassName}
                            >
                              {homeScoreForDisplay}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  {[0, 1].map((page) => (
                    <button
                      type="button"
                      key={page}
                      aria-label={page === 0 ? '정규 이닝 보기' : '연장 이닝 보기'}
                      onClick={() => setInningPage(page)}
                      className={`h-2 w-2 rounded-full ${inningPage === page ? 'bg-gray-800 dark:bg-gray-100' : 'bg-gray-200 dark:bg-border'}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto px-3 py-3">
                <table className={inningTableClassName}>
                  <thead className="bg-gray-100 dark:bg-border/60 text-[16px] text-gray-600 dark:text-white border-b border-gray-200 dark:border-border">
                    <tr>
                      <th className={inningTeamHeaderClassName}>팀</th>
                      {regularInningCols.map((inning) => (
                        <th key={inning} className={inningHeaderCellClassName}>{inning}</th>
                      ))}
                      <th className={inningRunHeaderClassName}>R</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-white">
                    <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                      <td className={inningTeamCellBaseClassName} style={awayTeamNameStyle}>
                        {awayTeamName}
                      </td>
                      {regularInningCols.map((inning) => (
                        <td
                          key={`away-${inning}`}
                          data-testid={`prediction-scoreboard-cell-away-${inning}`}
                          className={inningCellClassName}
                        >
                          {inningRows[inning]?.away ?? '-'}
                        </td>
                      ))}
                      <td data-testid="prediction-scoreboard-total-away" className={inningRunCellClassName}>{awayScoreForDisplay}</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                      <td className={inningTeamCellBaseClassName} style={homeTeamNameStyle}>
                        {homeTeamName}
                      </td>
                      {regularInningCols.map((inning) => (
                        <td
                          key={`home-${inning}`}
                          data-testid={`prediction-scoreboard-cell-home-${inning}`}
                          className={inningCellClassName}
                        >
                          {inningRows[inning]?.home ?? '-'}
                        </td>
                      ))}
                      <td data-testid="prediction-scoreboard-total-home" className={inningRunCellClassName}>{homeScoreForDisplay}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {!isPostponedOrCancelled && (
        <section>
          <VotePercentageGauge
            awayColor={awayColor}
            homeColor={homeColor}
            awayTeamName={awayTeamName}
            homeTeamName={homeTeamName}
            awayVotes={awayVotes}
            homeVotes={homeVotes}
            awayPercent={awayPercent}
            homePercent={homePercent}
            cheeringCaption={cheeringCaption}
            cheeringTotal={totalVotes}
          />
        </section>
      )}

      <section>
        <div className="mb-2.5 flex items-center gap-2 text-[16px] font-bold tracking-[0.08em] text-gray-500 dark:text-white/60" style={headingTextStyle}>
          <span className="h-[2px] w-6 rounded-full bg-gray-500 dark:bg-white/60" />
          선발 투수
        </div>
        <div className="flex items-center rounded-xl border border-gray-100/90 bg-gradient-to-br from-white/90 via-white to-gray-50/70 dark:border-border dark:from-secondary/45 dark:to-secondary/25 px-4 py-4 shadow-sm">
          <div className="flex-1 text-center">
            <TeamLogo team={game.awayTeam} size={20} className="mx-auto mb-1.5" />
            <p className="text-[18px] sm:text-[19px] leading-[1.28] font-black" style={awayTeamNameStyle}>
              {awayTeamName}
            </p>
            <p className="mt-1.5 text-[16px] leading-[1.45]" style={pitchTextStyle}>
              {awayPitcherName}
            </p>
          </div>
          <div className="h-9 w-px bg-gray-200/90 dark:bg-border" />
          <div className="flex-1 text-center">
            <TeamLogo team={game.homeTeam} size={20} className="mx-auto mb-1.5" />
            <p className="text-[18px] sm:text-[19px] leading-[1.28] font-black" style={homeTeamNameStyle}>
              {homeTeamName}
            </p>
            <p className="mt-1.5 text-[16px] leading-[1.45]" style={pitchTextStyle}>
              {homePitcherName}
            </p>
          </div>
        </div>
      </section>

      {shouldShowManualCoachState ? (
        <section data-testid="prediction-coach-manual-required">
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-[16px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
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
