import type { Game, GameDetail } from '../types/prediction';
import { Button } from './ui/button';
import { Card } from './ui/card';
import CoachAnalysisDialogLauncher from './CoachAnalysisDialogLauncher';
import { AlertTriangle, Sparkles, Zap } from 'lucide-react';

interface CoachBriefingContentRuntimeProps {
  dataQuality?: string;
  totalEvidenceCount: number;
  seasonSummary: string | null;
  activeTitle: string;
  activeMessage: string;
  displayedMessage: string;
  briefingStatusMessage: string | null;
  briefingStatusTone: 'info' | 'warning' | 'neutral' | null;
  showSummaryPoints: boolean;
  summaryPoints: string[];
  inlineDataQualityNote: string | null;
  showLoginAction: boolean;
  isAuthCheckPending: boolean;
  aiLoading: boolean;
  loginButtonLabel: string;
  analysisButtonLabel: string;
  onLoginAction: () => void;
  game: Game | null;
  gameStatusBucket?: GameDetail['gameStatus'];
  homePitcherName: string;
  awayPitcherName: string;
  isPastGame: boolean;
  isFutureGame: boolean;
}

const getCoachBriefingBadgeClassName = (dataQuality?: string): string => {
  if (dataQuality === 'grounded') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-200 dark:border-emerald-800/30';
  }
  if (dataQuality === 'partial') {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-800/30';
  }
  if (dataQuality === 'insufficient') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-200 dark:border-rose-800/30';
  }
  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-secondary dark:text-gray-200 dark:border-border';
};

const getCoachDataQualityLabel = (value?: string): string => {
  switch (value) {
    case 'grounded':
      return '실데이터 기반';
    case 'partial':
      return '실데이터 일부 기반';
    case 'insufficient':
      return '데이터 부족';
    default:
      return '근거 확인 중';
  }
};

const getCoachBriefingStatusClassName = (tone: CoachBriefingContentRuntimeProps['briefingStatusTone']): string => {
  switch (tone) {
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-200';
    case 'info':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/30 dark:bg-emerald-950/20 dark:text-emerald-200';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-secondary/40 dark:text-slate-200';
  }
};

export default function CoachBriefingContentRuntime({
  dataQuality,
  totalEvidenceCount,
  seasonSummary,
  activeTitle,
  activeMessage,
  displayedMessage,
  briefingStatusMessage,
  briefingStatusTone,
  showSummaryPoints,
  summaryPoints,
  inlineDataQualityNote,
  showLoginAction,
  isAuthCheckPending,
  aiLoading,
  loginButtonLabel,
  analysisButtonLabel,
  onLoginAction,
  game,
  gameStatusBucket,
  homePitcherName,
  awayPitcherName,
  isPastGame,
  isFutureGame,
}: CoachBriefingContentRuntimeProps) {
  return (
    <Card className="relative mb-6 overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-border dark:bg-card dark:text-gray-100">
      <div className="relative z-10 p-6">
        <div className="flex gap-4 min-w-0">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-900/30">
              <Sparkles className="h-6 w-6 text-emerald-700 dark:text-emerald-200" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {dataQuality ? (
                <span
                  data-testid="coach-briefing-quality-badge"
                  className={`rounded-full border px-2.5 py-0.5 text-[13px] font-semibold ${getCoachBriefingBadgeClassName(dataQuality)}`}
                >
                  {getCoachDataQualityLabel(dataQuality)}
                </span>
              ) : null}
              {totalEvidenceCount > 0 ? (
                <span className="rounded-full border border-gray-200 bg-transparent px-2.5 py-0.5 text-[13px] font-semibold text-gray-500 dark:border-border dark:text-gray-400">
                  근거 {totalEvidenceCount}건
                </span>
              ) : null}
            </div>

            {seasonSummary ? (
              <p className="mb-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">
                {seasonSummary}
              </p>
            ) : null}

            <h4
              data-testid="coach-briefing-title"
              className="mb-3 break-keep text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100 md:text-xl"
            >
              {activeTitle}
            </h4>

            {briefingStatusMessage ? (
              <div
                data-testid="coach-briefing-status-note"
                className={`mb-3 inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-[13px] font-semibold leading-relaxed ${getCoachBriefingStatusClassName(briefingStatusTone)}`}
              >
                <span className="break-keep">{briefingStatusMessage}</span>
              </div>
            ) : null}

            <div className="min-h-[2.5rem]">
              {showSummaryPoints ? (
                <div>
                  <span data-testid="coach-briefing-message" className="sr-only">
                    {activeMessage}
                  </span>
                  <ul className="space-y-2 text-[15px] font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
                    {summaryPoints.map((point) => (
                      <li
                        key={point}
                        data-testid="coach-briefing-summary-point"
                        className="flex items-start gap-2"
                      >
                        <span className="mt-[0.55rem] h-1.5 w-1.5 flex-none rounded-full bg-emerald-500/80" />
                        <span className="break-keep">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[15px] font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
                  <span data-testid="coach-briefing-message">{displayedMessage}</span>
                  {aiLoading ? (
                    <span className="ml-1 inline-block h-3 w-1 animate-pulse align-middle bg-emerald-200/80" />
                  ) : null}
                </p>
              )}
              {inlineDataQualityNote ? (
                <div
                  data-testid="coach-briefing-data-quality-note"
                  className="mt-4 border-t border-gray-200/80 pt-3 dark:border-border/80"
                >
                  <div className="flex items-start gap-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500 dark:text-amber-300" />
                    <p className="break-keep">{inlineDataQualityNote}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          {showLoginAction ? (
            <Button
              type="button"
              data-testid="coach-briefing-login-cta"
              className="h-10 w-full rounded-xl border border-emerald-700/60 bg-emerald-950 text-emerald-50 shadow-sm hover:bg-emerald-900 md:w-auto"
              onClick={onLoginAction}
            >
              <Zap className="mr-2 h-4 w-4 text-emerald-50" />
              <span className="text-[15px] font-semibold">{loginButtonLabel}</span>
            </Button>
          ) : isAuthCheckPending ? (
            <Button
              type="button"
              disabled
              data-testid="coach-briefing-auth-loading"
              className="h-10 w-full rounded-xl border border-emerald-700/40 bg-emerald-950/70 text-emerald-50 shadow-sm disabled:opacity-100 md:w-auto"
            >
              <Zap className="mr-2 h-4 w-4 text-emerald-50" />
              <span className="text-[15px] font-semibold">로그인 확인 중...</span>
            </Button>
          ) : (
            <CoachAnalysisDialogLauncher
              initialTeam={game?.homeTeam}
              homeTeamId={game?.homeTeam}
              awayTeamId={game?.awayTeam}
              gameId={game?.gameId}
              gameDate={game?.gameDate}
              seasonId={game?.seasonId}
              leagueType={game?.leagueType}
              round={game?.postSeasonSeries}
              gameNo={game?.seriesGameNo}
              homePitcher={homePitcherName}
              awayPitcher={awayPitcherName}
              isPastGame={isPastGame}
              isFutureGame={isFutureGame}
              gameStatusBucket={gameStatusBucket}
              buttonLabel={analysisButtonLabel}
            />
          )}
        </div>
      </div>
    </Card>
  );
}
