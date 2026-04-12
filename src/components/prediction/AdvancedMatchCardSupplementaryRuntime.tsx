import type { GameSummary } from '../../types/prediction';
import { getSectionHeadingTextStyle } from '../../utils/advancedMatchCardStyles';
import { GameSummaryTimeline } from './GameSummaryTimeline';

interface TimelineEntry {
  type: string;
  playerName?: string;
  detail?: string;
  groupTitle: string;
  _index: number;
  _inning: number;
}

interface AdvancedMatchCardSupplementaryRuntimeProps {
  awayColor: string;
  homeColor: string;
  timelineEntries: TimelineEntry[];
  summaryGroups: Record<string, GameSummary[]>;
  inningRowCount: number;
  shouldHideResultSections: boolean;
  gameDetailLoading: boolean;
  attendanceLabel: string | null;
  weatherLabel: string | null;
  gameTimeLabel: string | null;
  shouldShowMatchEnvironmentLoading: boolean;
  isDarkMode: boolean;
}

export default function AdvancedMatchCardSupplementaryRuntime({
  awayColor,
  homeColor,
  timelineEntries,
  summaryGroups,
  inningRowCount,
  shouldHideResultSections,
  gameDetailLoading,
  attendanceLabel,
  weatherLabel,
  gameTimeLabel,
  shouldShowMatchEnvironmentLoading,
  isDarkMode,
}: AdvancedMatchCardSupplementaryRuntimeProps) {
  const headingTextStyle = getSectionHeadingTextStyle(isDarkMode);
  const shouldShowEmptyState = !gameDetailLoading && !shouldHideResultSections && inningRowCount === 0 && timelineEntries.length === 0;
  const refereeSummary = !gameDetailLoading && !shouldHideResultSections
    ? summaryGroups['심판']?.[0] || null
    : null;
  const shouldShowMatchEnvironment = Boolean(
    attendanceLabel || weatherLabel || gameTimeLabel || shouldShowMatchEnvironmentLoading,
  );

  return (
    <div className="space-y-6">
      {!gameDetailLoading && !shouldHideResultSections && timelineEntries.length > 0 ? (
        <GameSummaryTimeline
          timelineEntries={timelineEntries}
          awayColor={awayColor}
          homeColor={homeColor}
        />
      ) : null}

      {shouldShowEmptyState ? (
        <div className="text-center text-[16px] text-gray-500 dark:text-gray-300">표시할 경기 상세 정보가 없습니다.</div>
      ) : null}

      {refereeSummary ? (
        <div className="border-t border-gray-100 dark:border-border pt-4 text-center text-[16px] text-gray-500 dark:text-gray-300">
          심판: {refereeSummary.playerName || refereeSummary.detail || '정보 없음'}
        </div>
      ) : null}

      {shouldShowMatchEnvironment ? (
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
              <p className="mt-1 font-bold text-gray-800 dark:text-gray-100">
                {attendanceLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 dark:bg-secondary/60">
              <p className="text-[16px] text-gray-400 dark:text-gray-300">날씨</p>
              <p className="mt-1 font-bold text-gray-800 dark:text-gray-100">
                {weatherLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50/70 px-3 py-2.5 dark:bg-secondary/60">
              <p className="text-[16px] text-gray-400 dark:text-gray-300">경기시간</p>
              <p className="mt-1 font-bold text-gray-800 dark:text-gray-100">
                {gameTimeLabel || (shouldShowMatchEnvironmentLoading ? '불러오는 중' : '정보 없음')}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
