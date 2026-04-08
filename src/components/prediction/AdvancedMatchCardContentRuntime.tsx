import { type ReactNode, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock3, Loader2 } from 'lucide-react';

import TeamLogo from '../TeamLogo';
import type { Game, GameDetail, GameSummary } from '../../types/prediction';
import type { GameStatusCode } from '../../utils/prediction';
import {
  getInningMetaTextStyle,
  getInningTeamNameStyle,
  getSectionHeadingTextStyle,
} from '../../utils/advancedMatchCardStyles';
import { VotePercentageGauge } from './VotePercentageGauge';
import { GameSummaryTimeline } from './GameSummaryTimeline';

type InningRows = Record<number, { away?: number | null; home?: number | null }>;

export interface AdvancedMatchCardContentRuntimeProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  gameDetailRefreshing?: boolean;
  gameDetailError?: string | null;
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
  statusCode: GameStatusCode;
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
  const shouldShowMatchEnvironmentLoading = isDetailBusy && !attendanceLabel && !weatherLabel && !gameTimeLabel;

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

  const summaryGroups = useMemo(() => (gameDetail?.summary || []).reduce(
    (acc: Record<string, GameSummary[]>, item) => {
      const key = item.type || '기타';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, GameSummary[]>,
  ), [gameDetail?.summary]);

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
          className={`flex flex-col gap-3 rounded-xl border px-4 py-3 text-[16px] ${
            gameDetailError
              ? 'border-amber-200 bg-amber-50/90 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-100'
              : 'border-sky-200 bg-sky-50/90 text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-100'
          }`}
        >
          <div className="flex items-start gap-2">
            {gameDetailError ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {gameDetailError
                  ? '일부 경기 상세 정보를 불러오지 못했습니다.'
                  : gameDetailRefreshing
                    ? '최신 경기 정보를 다시 불러오는 중입니다.'
                    : '경기 상세 정보를 불러오는 중입니다.'}
              </p>
              {gameDetailError ? (
                <p className="mt-1 text-[16px] opacity-90">{gameDetailError}</p>
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
        <div className="text-center text-[16px] text-gray-500 dark:text-gray-300">경기 정보를 불러오는 중입니다...</div>
      )}

      {!isScoreboardLoading && shouldHideResultSections && (
        <section>
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-4 text-[16px] text-gray-600 dark:border-border dark:bg-secondary/40 dark:text-gray-200">
            {isPostponedOrCancelled ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <p>
                  {isCancelledStatus
                    ? '해당 경기는 취소되어 투표 및 경기 상세 정보가 제공되지 않습니다.'
                    : '해당 경기는 연기되어 투표 및 경기 상세 정보가 제공되지 않습니다.'}
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                <p>스코어보드와 경기 주요 기록은 경기 시작 후 제공됩니다.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {!isScoreboardLoading && !shouldHideResultSections && (
        <section>
          <div
            className="mb-3 flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-gray-100"
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
          <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40">
            {hasExtraInnings ? (
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
                    <div key={index} className="min-w-full px-3 py-3">
                      <table className="w-full table-fixed border-collapse text-center text-[16px]">
                        <thead className="bg-gray-100 dark:bg-border/60 text-[16px] text-gray-600 dark:text-gray-200 border-b border-gray-200 dark:border-border">
                          <tr>
                            <th className="px-2 py-2 text-left font-semibold">팀</th>
                            {cols.map((inning) => (
                              <th key={inning} className="px-2 py-2 border-l border-gray-200 dark:border-border/70">{inning}</th>
                            ))}
                            <th className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600">R</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200">
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                            <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={awayTeamNameStyle}>
                              {awayTeamName}
                            </td>
                            {cols.map((inning) => (
                              <td key={`away-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                {inningRows[inning]?.away ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">
                              {awayScoreForDisplay}
                            </td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                            <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={homeTeamNameStyle}>
                              {homeTeamName}
                            </td>
                            {cols.map((inning) => (
                              <td key={`home-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                {inningRows[inning]?.home ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">
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
              <div className="px-3 py-3">
                <table className="w-full table-fixed border-collapse text-center text-[16px]">
                  <thead className="bg-gray-100 dark:bg-border/60 text-[16px] text-gray-600 dark:text-gray-200 border-b border-gray-200 dark:border-border">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold">팀</th>
                      {regularInningCols.map((inning) => (
                        <th key={inning} className="px-2 py-2 border-l border-gray-200 dark:border-border/70">{inning}</th>
                      ))}
                      <th className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600">R</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-200">
                    <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                      <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={awayTeamNameStyle}>
                        {awayTeamName}
                      </td>
                      {regularInningCols.map((inning) => (
                        <td key={`away-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                          {inningRows[inning]?.away ?? '-'}
                        </td>
                      ))}
                      <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">{awayScoreForDisplay}</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                      <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={homeTeamNameStyle}>
                        {homeTeamName}
                      </td>
                      {regularInningCols.map((inning) => (
                        <td key={`home-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                          {inningRows[inning]?.home ?? '-'}
                        </td>
                      ))}
                      <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">{homeScoreForDisplay}</td>
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
        <div className="mb-2.5 flex items-center gap-2 text-[16px] sm:text-[16px] font-semibold tracking-[0.08em] text-gray-500 dark:text-white/60" style={headingTextStyle}>
          <span className="h-[2px] w-6 rounded-full bg-gray-500 dark:bg-white/60" />
          선발 투수
        </div>
        <div className="flex items-center rounded-xl border border-gray-100/90 bg-gradient-to-br from-white/90 via-white to-gray-50/70 dark:border-border dark:from-secondary/45 dark:to-secondary/25 px-4 py-4 shadow-sm">
          <div className="flex-1 text-center">
            <TeamLogo team={game.awayTeam} size={20} className="mx-auto mb-1.5" />
            <p className="text-[18px] sm:text-[19px] leading-[1.28] tracking-[-0.03em] font-black" style={awayTeamNameStyle}>
              {awayTeamName}
            </p>
            <p className="mt-1.5 text-[16px] sm:text-[16px] leading-[1.45]" style={pitchTextStyle}>
              {awayPitcherName}
            </p>
          </div>
          <div className="h-9 w-px bg-gray-200/90 dark:bg-border" />
          <div className="flex-1 text-center">
            <TeamLogo team={game.homeTeam} size={20} className="mx-auto mb-1.5" />
            <p className="text-[18px] sm:text-[19px] leading-[1.28] tracking-[-0.03em] font-black" style={homeTeamNameStyle}>
              {homeTeamName}
            </p>
            <p className="mt-1.5 text-[16px] sm:text-[16px] leading-[1.45]" style={pitchTextStyle}>
              {homePitcherName}
            </p>
          </div>
        </div>
      </section>

      {!gameDetailLoading && !isPostponedOrCancelled ? coachBriefing : null}

      {!gameDetailLoading && !shouldHideResultSections && timelineEntries.length > 0 ? (
        <GameSummaryTimeline
          timelineEntries={timelineEntries}
          awayColor={awayColor}
          homeColor={homeColor}
        />
      ) : null}

      {!gameDetailLoading && !shouldHideResultSections && Object.keys(inningRows).length === 0 && timelineEntries.length === 0 ? (
        <div className="text-center text-[16px] text-gray-500 dark:text-gray-300">표시할 경기 상세 정보가 없습니다.</div>
      ) : null}

      {!gameDetailLoading && !shouldHideResultSections && summaryGroups['심판']?.length > 0 ? (
        <div className="border-t border-gray-100 dark:border-border pt-4 text-center text-[16px] text-gray-500 dark:text-gray-300">
          심판: {summaryGroups['심판'][0]?.playerName || summaryGroups['심판'][0]?.detail || '정보 없음'}
        </div>
      ) : null}

      {(attendanceLabel || weatherLabel || gameTimeLabel || shouldShowMatchEnvironmentLoading) ? (
        <section>
          <div
            className="mb-3 flex items-center gap-2 text-[16px] font-bold text-gray-900 dark:text-gray-100"
            style={headingTextStyle}
          >
            <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
            경기 환경
          </div>
          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-gray-100 dark:border-border bg-white dark:bg-secondary/40 px-4 py-3 text-[16px] sm:grid-cols-3 sm:gap-3">
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 dark:bg-secondary/60">
              <p className="text-[16px] text-gray-400 dark:text-gray-300">관중</p>
              <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">
                {attendanceLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 dark:bg-secondary/60">
              <p className="text-[16px] text-gray-400 dark:text-gray-300">날씨</p>
              <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">
                {weatherLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 dark:bg-secondary/60">
              <p className="text-[16px] text-gray-400 dark:text-gray-300">경기시간</p>
              <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">
                {gameTimeLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
