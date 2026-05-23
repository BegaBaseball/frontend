import { useEffect, useState } from 'react';

import type { Game, GameDetail } from '../types/prediction';
import { getTeamColor } from '../utils/teamColors';
import { Button } from './ui/button';
import { Card } from './ui/card';
import CoachAnalysisDialogLauncher from './CoachAnalysisDialogLauncher';
import {
  PredictionSparklesIcon,
  PredictionWarningTriangleIcon,
  PredictionZapIcon,
} from './prediction/PredictionShellIcons';
import { teamIdToName } from './TeamLogo';

export interface CoachBriefingContentRuntimeProps {
  dataQuality?: string;
  totalEvidenceCount: number;
  seasonSummary: string | null;
  activeTitle: string;
  activeMessage: string;
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
  // V5: team IDs for head bar match row and gauge coloring
  homeTeamId: string | null;
  awayTeamId: string | null;
  // V5: explicit win probability (null = not available from backend yet)
  winProbabilityHome: number | null;
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

// Short team name for match row and VS bar labels
const getTeamShortName = (teamId: string | null | undefined): string => {
  if (!teamId) return '홈';
  const name = teamIdToName[teamId.toLowerCase()];
  if (!name) return teamId.toUpperCase();
  // Shorten long names to first word
  return name.split(' ')[0];
};

// ── Gauge SVG ──────────────────────────────────────────────────
function WinProbabilityGauge({
  pct,
  color,
  teamName,
}: {
  pct: number;
  color: string;
  teamName: string;
}) {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - pct / 100);

  return (
    <div style={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
      <svg
        viewBox="0 0 140 140"
        width={140}
        height={140}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={14}
          className="stroke-gray-200 dark:stroke-white/10"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={14}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {pct}%
        </span>
        <span
          className="text-gray-500 dark:text-gray-400"
          style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase' }}
        >
          {teamName}
        </span>
      </div>
    </div>
  );
}

// Neutral gauge shown when win probability isn't available yet
function NeutralGauge() {
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ width: 140, height: 140, position: 'relative', flexShrink: 0 }}>
      <svg
        viewBox="0 0 140 140"
        width={140}
        height={140}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={14}
          className="stroke-gray-200 dark:stroke-white/10"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={14}
          strokeDasharray={circumference}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="stroke-emerald-600 dark:stroke-emerald-400"
          style={{ opacity: 0.4 }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PredictionSparklesIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  );
}

// Loading spinner in gauge area
function LoadingGauge() {
  return (
    <div
      style={{
        width: 140,
        height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        className="border-gray-200 dark:border-white/10 border-t-emerald-600 dark:border-t-emerald-400"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          borderWidth: 10,
          borderStyle: 'solid',
          animation: 'coach-spin 1.1s linear infinite',
        }}
      />
    </div>
  );
}

// Lock icon in gauge area (guest state)
function LockGauge() {
  return (
    <div
      className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10"
      style={{
        width: 140,
        height: 140,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={36}
        height={36}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-700 dark:text-emerald-400"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    </div>
  );
}

// Small match row for head bar
function TeamMatchRow({
  homeTeamId,
  awayTeamId,
}: {
  homeTeamId: string | null;
  awayTeamId: string | null;
}) {
  const homeName = getTeamShortName(homeTeamId);
  const awayName = getTeamShortName(awayTeamId);

  return (
    <span className="ml-auto flex items-center gap-1.5 text-[12.5px] font-bold text-gray-500 dark:text-gray-400">
      <span>{awayName}</span>
      <span className="font-serif italic text-gray-400 dark:text-gray-500 text-[12px]">vs</span>
      <span>{homeName}</span>
    </span>
  );
}

export default function CoachBriefingContentCardRuntime({
  dataQuality,
  totalEvidenceCount,
  seasonSummary,
  activeTitle,
  activeMessage,
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
  homeTeamId,
  awayTeamId,
  winProbabilityHome,
}: CoachBriefingContentRuntimeProps) {
  const [displayedMessage, setDisplayedMessage] = useState('');

  useEffect(() => {
    if (!activeMessage) {
      setDisplayedMessage('');
      return;
    }

    const prefersReduced = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayedMessage(activeMessage);
      return;
    }

    setDisplayedMessage('');
    const message = activeMessage;
    let i = 0;
    let rafId = 0;
    let lastTime = 0;

    const step = (time: number) => {
      if (time - lastTime >= 50) {
        i = Math.min(i + 2, message.length);
        setDisplayedMessage(message.substring(0, i));
        lastTime = time;
      }

      if (i < message.length) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeMessage]);

  const homeColor = getTeamColor(homeTeamId);
  const awayColor = getTeamColor(awayTeamId);
  const homeShortName = getTeamShortName(homeTeamId);
  const awayShortName = getTeamShortName(awayTeamId);

  // Determine which team is favored and at what probability for gauge
  const hasProbability = winProbabilityHome !== null;
  const favoredIsHome = hasProbability && (winProbabilityHome ?? 50) >= 50;
  const favoredPct = hasProbability
    ? favoredIsHome
      ? (winProbabilityHome ?? 50)
      : 100 - (winProbabilityHome ?? 50)
    : 50;
  const favoredColor = favoredIsHome ? homeColor : awayColor;
  const favoredName = favoredIsHome ? homeShortName : awayShortName;

  const showVsBar = hasProbability && !aiLoading && !showLoginAction;
  const homePct = winProbabilityHome ?? 50;
  const awayPct = 100 - homePct;

  return (
    <>
      {/* Spin animation for loading gauge */}
      <style>{`@keyframes coach-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <Card
        data-testid="coach-briefing-card"
        className="relative mb-6 overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-border dark:bg-card dark:text-gray-100"
      >
        {/* ── HEAD BAR ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gradient-to-b from-[#fafffd] to-white px-5 py-3 dark:border-border dark:from-emerald-950/10 dark:to-transparent">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#2d5f4f] to-[#173b34] shadow-sm">
            <PredictionSparklesIcon className="h-[14px] w-[14px] text-emerald-100" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-gray-800 dark:text-gray-100">
            AI 코치 경기 예측
          </span>
          {(homeTeamId || awayTeamId) ? (
            <TeamMatchRow homeTeamId={homeTeamId} awayTeamId={awayTeamId} />
          ) : null}
        </div>

        {/* ── BODY ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-5 px-6 pb-4 pt-5">
          {/* Left: Gauge area */}
          {aiLoading ? (
            <LoadingGauge />
          ) : showLoginAction ? (
            <LockGauge />
          ) : hasProbability ? (
            <WinProbabilityGauge pct={favoredPct} color={favoredColor} teamName={favoredName} />
          ) : (
            <NeutralGauge />
          )}

          {/* Right: Headline + content */}
          <div className="min-w-0 flex-1">
            {aiLoading ? (
              /* Loading skeleton */
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-emerald-400 opacity-60" />
                  <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-emerald-400 opacity-40 [animation-delay:0.15s]" />
                  <div className="h-[7px] w-[7px] flex-shrink-0 rounded-full bg-emerald-400 opacity-40 [animation-delay:0.30s]" />
                </div>
                <div className="h-5 w-4/5 animate-pulse rounded-lg bg-gray-200 dark:bg-white/10" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" />
                <div className="h-3.5 w-9/12 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" />
                <div className="h-3.5 w-7/12 animate-pulse rounded bg-gray-100 dark:bg-white/[0.06]" />
              </div>
            ) : showLoginAction ? (
              /* Guest / auth-expired state — use activeTitle + activeMessage from parent */
              <>
                <h4 className="mb-2 break-keep text-[17px] font-bold leading-snug text-gray-900 dark:text-gray-100">
                  {activeTitle}
                </h4>
                <p className="text-[14px] font-semibold leading-relaxed text-gray-500 dark:text-gray-400">
                  {activeMessage}
                </p>
              </>
            ) : (
              /* Data state */
              <>
                {/* Season summary line */}
                {seasonSummary ? (
                  <p className="mb-1.5 text-[13px] font-semibold text-gray-400 dark:text-gray-500">
                    {seasonSummary}
                  </p>
                ) : null}

                {/* Win chip row (shown only when probability is available) */}
                {hasProbability ? (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-bold"
                      style={{
                        background: `${favoredColor}15`,
                        color: favoredColor,
                        borderColor: `${favoredColor}40`,
                      }}
                    >
                      {favoredName} 우세
                    </span>
                    <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500">
                      차이 {Math.abs(homePct - awayPct)}%p
                    </span>
                  </div>
                ) : null}

                {/* Headline */}
                <h4 className="mb-3 break-keep text-[17px] font-bold leading-snug tracking-tight text-gray-900 dark:text-gray-100">
                  {activeTitle}
                </h4>

                {/* Bullets or message */}
                <div className="min-h-[2rem]">
                  {showSummaryPoints ? (
                    <ul
                      aria-label={activeMessage}
                      className="space-y-2 text-[14.5px] font-semibold leading-relaxed text-gray-700 dark:text-gray-300"
                    >
                      {summaryPoints.map((point) => (
                        <li key={point} className="flex items-start gap-2 break-keep">
                          <span className="mt-[7px] h-1.5 w-1.5 flex-none rotate-45 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[14.5px] font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
                      <span>{displayedMessage}</span>
                      {aiLoading ? (
                        <span className="ml-1 inline-block h-3 w-1 animate-pulse align-middle bg-emerald-200/80" />
                      ) : null}
                    </p>
                  )}
                  {inlineDataQualityNote ? (
                    <div className="mt-3 border-t border-gray-200/80 pt-2.5 dark:border-border/80">
                      <div className="flex items-start gap-2 text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                        <PredictionWarningTriangleIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-500 dark:text-amber-300" />
                        <p className="break-keep">{inlineDataQualityNote}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── VS BAR ───────────────────────────────────────────── */}
        {showVsBar ? (
          <>
            <div data-testid="coach-vs-bar" className="flex h-1.5 overflow-hidden">
              <span style={{ flex: awayPct, background: awayColor }} />
              <span style={{ flex: homePct, background: homeColor }} />
            </div>
            <div className="flex justify-between px-6 pt-1 pb-0.5 text-[11.5px] font-bold text-gray-500 dark:text-gray-400">
              <span>{awayShortName} {awayPct}%</span>
              <span>{homeShortName} {homePct}%</span>
            </div>
          </>
        ) : null}

        {/* ── FOOTER: chips + status bar + CTA ─────────────────── */}
        <div className="px-6 pb-6 pt-4">
          {/* Trust chips */}
          {(dataQuality || totalEvidenceCount > 0) ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {dataQuality ? (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[12.5px] font-bold ${getCoachBriefingBadgeClassName(dataQuality)}`}
                >
                  {getCoachDataQualityLabel(dataQuality)}
                </span>
              ) : null}
              {totalEvidenceCount > 0 ? (
                <span className="rounded-full border border-gray-200 bg-transparent px-2.5 py-0.5 text-[12.5px] font-bold text-gray-500 dark:border-border dark:text-gray-400">
                  근거 {totalEvidenceCount}건
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Status bar (partial / warn states) */}
          {briefingStatusMessage ? (
            <div
              className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-bold ${getCoachBriefingStatusClassName(briefingStatusTone)}`}
            >
              {briefingStatusTone === 'warning' ? (
                <PredictionWarningTriangleIcon className="h-3.5 w-3.5 flex-none text-amber-500 dark:text-amber-300" />
              ) : null}
              {briefingStatusMessage}
            </div>
          ) : null}

          {/* Full-width CTA */}
          {showLoginAction ? (
            <Button
              type="button"
              className="h-12 w-full rounded-xl border border-emerald-700/60 bg-emerald-950 text-emerald-50 shadow-sm hover:bg-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/80"
              onClick={onLoginAction}
            >
              <PredictionZapIcon className="mr-2 h-4 w-4 flex-shrink-0 text-emerald-50" />
              <span className="text-[15px] font-bold">{loginButtonLabel}</span>
            </Button>
          ) : isAuthCheckPending ? (
            <Button
              type="button"
              disabled
              className="h-12 w-full rounded-xl border border-emerald-700/40 bg-emerald-950/70 text-emerald-50 shadow-sm disabled:opacity-100"
            >
              <PredictionZapIcon className="mr-2 h-4 w-4 flex-shrink-0 text-emerald-50" />
              <span className="text-[15px] font-bold">로그인 확인 중...</span>
            </Button>
          ) : aiLoading ? (
            <Button
              type="button"
              disabled
              className="h-12 w-full rounded-xl bg-[#2d5f4f] text-white shadow-sm disabled:opacity-80"
            >
              <span className="flex items-center gap-1 mr-2">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              <span className="text-[15px] font-bold">실데이터 분석 중...</span>
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
              fullWidth
            />
          )}
        </div>
      </Card>
    </>
  );
}
