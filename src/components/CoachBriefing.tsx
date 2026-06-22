import { lazy, Suspense, useEffect, useState } from 'react';

import type { Game, GameDetail } from '../types/prediction';
import type {
  CoachAnalysisType,
  CoachRequestMode,
} from '../utils/coachBriefingRequestDescriptor';
import type {
  NormalizedAiBriefing,
} from '../utils/prediction';
import {
  getCoachBriefingDataQualityNotice,
  resolveCoachAnalysisPresentation,
} from '../utils/predictionCoachPresentation';
import { MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE } from '../utils/manualBaseballDataContract';
import { useAuthAccessActions } from '../store/authStore';
import { getCurrentRelativeUrl } from '../utils/loginRedirect';

import type { CoachBriefingMetaState } from './CoachBriefingAutoRuntime';
import { resolveCoachEvidenceCount } from './prediction/coachEvidenceCore';

const CoachBriefingAutoRuntime = lazy(() => import('./CoachBriefingAutoRuntime'));
const CoachBriefingContentRuntime = lazy(() => import('./CoachBriefingContentRuntime'));

interface CoachBriefingProps {
  game: Game | null;
  gameDetail?: GameDetail | null;
  seasonContext?: {
    home: { rank: number; gamesBehind: number; remainingGames: number } | null;
    away: { rank: number; gamesBehind: number; remainingGames: number } | null;
    canCallAI: boolean;
  };
  isPastGame: boolean;
  isFutureGame?: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  autoEnabled: boolean;
  requestMode: CoachRequestMode;
  analysisType: CoachAnalysisType;
  forceManual?: boolean;
}

const normalizeCoachBriefingSummaryPoint = (value: string): string => {
  const normalized = value
    .replace(/^[\s•-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim();

  if (!normalized) {
    return '';
  }

  if (normalized.endsWith('지만')) {
    return `${normalized.slice(0, -2).trim()}습니다`;
  }

  return normalized;
};

const buildCoachBriefingSummaryPoints = (message?: string): string[] => {
  if (!message) {
    return [];
  }

  if (
    message.includes('오류가 발생했습니다')
    || message.includes('다시 시도')
    || message.includes('준비하지 못했습니다')
  ) {
    return [];
  }

  const candidates = message
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .flatMap((line) => line.split(/\s*,\s*/))
    .map(normalizeCoachBriefingSummaryPoint)
    .filter((line) => line.length >= 8);

  const uniqueCandidates = Array.from(new Set(candidates));

  return uniqueCandidates.length >= 2 ? uniqueCandidates.slice(0, 3) : [];
};

const getReasonFlowParticle = (value: string): '로' | '으로' => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '으로';
  }

  const lastCharCode = trimmed.charCodeAt(trimmed.length - 1);
  const hangulBase = 0xac00;
  const hangulLast = 0xd7a3;

  if (lastCharCode < hangulBase || lastCharCode > hangulLast) {
    return '으로';
  }

  const finalConsonantIndex = (lastCharCode - hangulBase) % 28;

  if (finalConsonantIndex === 0 || finalConsonantIndex === 8) {
    return '로';
  }

  return '으로';
};

const buildCoachBriefingInlineNote = (
  notice: { message: string; reasons: string[]; details: string[] } | null,
  warnings?: string[],
): string | null => {
  if (notice) {
    const reasonText = notice.reasons.slice(0, 2).join('/');

    if (reasonText) {
      if (/[.!?]$/.test(reasonText) || /(입니다|습니다|합니다)$/.test(reasonText)) {
        return `${/[.!?]$/.test(reasonText) ? reasonText : `${reasonText}.`} 최근 흐름 위주로 분석했습니다.`;
      }

      return `${reasonText}${notice.reasons.length > 2 ? ' 등으로' : getReasonFlowParticle(reasonText)} 최근 흐름 위주로 분석했습니다.`;
    }

    if (notice.details.length > 0) {
      return notice.details[0];
    }

    return notice.message;
  }

  return Array.isArray(warnings) && warnings.length > 0 ? warnings[0] : null;
};

export default function CoachBriefing({
  game,
  gameDetail,
  seasonContext,
  isPastGame,
  isFutureGame = false,
  isLoggedIn,
  isAuthLoading,
  autoEnabled,
  requestMode,
  analysisType,
  forceManual = false,
}: CoachBriefingProps) {
  const { logout, requireLogin } = useAuthAccessActions();
  const [aiBriefing, setAiBriefing] = useState<NormalizedAiBriefing | null>(null);
  const [briefingMeta, setBriefingMeta] = useState<CoachBriefingMetaState | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const [hasActivatedAutoBriefing, setHasActivatedAutoBriefing] = useState(false);
  const homePitcherName = gameDetail?.homePitcher || game?.homePitcher?.name || '발표 전';
  const awayPitcherName = gameDetail?.awayPitcher || game?.awayPitcher?.name || '발표 전';

  const effectiveRequestMode: CoachRequestMode = forceManual ? 'manual_detail' : requestMode;
  const effectiveAutoEnabled = autoEnabled && effectiveRequestMode === 'auto_brief';
  const analysisPresentation = resolveCoachAnalysisPresentation({
    isPastGame,
    isFutureGame,
    gameStatusBucket: gameDetail?.gameStatus,
  });
  const isGuestBlocked = !isLoggedIn && !isAuthLoading;
  const isAuthCheckPending = isAuthLoading;
  const isGameDetailReady = Boolean(gameDetail && gameDetail.gameId === game?.gameId);
  const isRefreshingBriefing = aiLoading && aiBriefing != null;
  const shouldStartAutoBriefing = effectiveAutoEnabled && hasActivatedAutoBriefing && isGameDetailReady;
  const loginRequiredMessage = effectiveAutoEnabled
    ? '실데이터 브리핑은 로그인 후 제공됩니다.'
    : analysisPresentation.loginRequiredMessage;
  const authExpiredMessage = effectiveAutoEnabled
    ? '로그인 세션이 만료되었습니다. 다시 로그인 후 브리핑을 확인해주세요.'
    : analysisPresentation.authExpiredMessage;
  const dataQualityNotice = briefingMeta?.manualDataRequired
    ? {
        message: MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
        reasons: [],
        details: [],
      }
    : getCoachBriefingDataQualityNotice(
      briefingMeta?.dataQuality,
      briefingMeta?.groundingReasons,
      briefingMeta?.groundingWarnings,
    );
  const showLoginAction = isGuestBlocked || authExpired;
  const isAwaitingAutoBriefing =
    effectiveAutoEnabled
    && !shouldStartAutoBriefing
    && !isGuestBlocked
    && !isAuthCheckPending
    && !authExpired;
  const totalEvidenceCount = resolveCoachEvidenceCount({
    supportedFactCount: briefingMeta?.supportedFactCount,
    usedEvidence: briefingMeta?.usedEvidence,
  });
  const briefingFreshnessLabel = aiBriefing
    ? (isRefreshingBriefing ? '갱신 중' : '최신 갱신')
    : null;
  const summaryPoints = buildCoachBriefingSummaryPoints(aiBriefing?.displayText || aiBriefing?.message || '');
  const pendingBriefingLabel = briefingMeta?.analysisType === 'game_review'
    ? '경기 후 리뷰'
    : '경기 전 브리핑';
  const briefingStatusMessage = (() => {
    if (!effectiveAutoEnabled) {
      return null;
    }

    if (briefingMeta?.manualDataRequired) {
      return MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE;
    }

    if (briefingMeta?.cacheState === 'FAILED_LOCKED') {
      return '현재 브리핑 캐시가 잠겨 있습니다. 운영 갱신 후 다시 확인해 주세요.';
    }

    if (
      briefingMeta?.cacheState === 'PENDING'
      || briefingMeta?.cacheState === 'PENDING_WAIT'
      || briefingMeta?.cacheState === 'IN_PROGRESS'
    ) {
      return isRefreshingBriefing
        ? `이전 ${pendingBriefingLabel}을 유지한 채 최신 내용을 반영하는 중입니다.`
        : `${pendingBriefingLabel} 준비 중입니다. 잠시 후 다시 확인해 주세요.`;
    }

    if (briefingMeta?.dataQuality === 'partial') {
      return '실데이터 일부가 비어 있어 최근 흐름 중심으로 정리했습니다.';
    }

    if (briefingMeta?.dataQuality === 'insufficient') {
      return '근거가 부족해 보수적으로 요약했습니다.';
    }

    if (isRefreshingBriefing) {
      return '이전 브리핑을 유지한 채 최신 내용을 반영하는 중입니다.';
    }

    if (aiLoading) {
      return '최신 브리핑을 준비하는 중입니다.';
    }

    return null;
  })();
  const briefingStatusTone = (() => {
    if (!briefingStatusMessage) {
      return null;
    }

    if (briefingMeta?.cacheState === 'FAILED_LOCKED') {
      return 'warning' as const;
    }

    if (briefingMeta?.manualDataRequired) {
      return 'warning' as const;
    }

    if (
      briefingMeta?.cacheState === 'PENDING'
      || briefingMeta?.cacheState === 'PENDING_WAIT'
      || briefingMeta?.cacheState === 'IN_PROGRESS'
      || isRefreshingBriefing
      || aiLoading
    ) {
      return 'info' as const;
    }

    if (briefingMeta?.dataQuality === 'partial' || briefingMeta?.dataQuality === 'insufficient') {
      return 'warning' as const;
    }

    return 'info' as const;
  })();
  const inlineDataQualityNote = buildCoachBriefingInlineNote(dataQualityNotice, briefingMeta?.groundingWarnings);
  const showSummaryPoints = effectiveAutoEnabled
    && !showLoginAction
    && !isAuthCheckPending
    && !isAwaitingAutoBriefing
    && summaryPoints.length > 0;

  useEffect(() => {
    setAiBriefing(null);
    setBriefingMeta(null);
    setAiLoading(false);
    setAuthExpired(false);
  }, [game?.gameId]);

  useEffect(() => {
    if (!effectiveAutoEnabled) {
      setHasActivatedAutoBriefing(false);
      return;
    }

    if (isAuthCheckPending || isGuestBlocked || !isGameDetailReady) {
      setHasActivatedAutoBriefing(false);
      return;
    }

    setHasActivatedAutoBriefing(true);
  }, [effectiveAutoEnabled, isAuthCheckPending, isGameDetailReady, isGuestBlocked]);

  const getSeasonSummary = () => {
    if (!seasonContext || !seasonContext.home || !seasonContext.away) return null;
    const { home, away } = seasonContext;

    const leagueName = game?.leagueType === 'POST' ? '포스트시즌' : '정규시즌';
    const gb = Math.abs(home.gamesBehind - away.gamesBehind).toFixed(1);
    const items = [leagueName, `${home.rank}위 vs ${away.rank}위`];

    if (game?.leagueType !== 'POST') {
      items.push(`승차 ${gb}G`);
    }

    return items.join(' · ');
  };

  const handleLoginAction = () => {
    const redirectPath = getCurrentRelativeUrl();
    if (authExpired) {
      logout(true);
    }
    requireLogin(redirectPath);
  };

  const activeTitle = effectiveAutoEnabled
    ? (aiBriefing?.title ?? '실데이터 브리핑')
    : analysisPresentation.title;
  const activeMessage = authExpired
    ? authExpiredMessage
    : isGuestBlocked
      ? loginRequiredMessage
      : isAuthCheckPending && !aiBriefing
        ? '로그인 상태를 확인하는 중입니다.'
        : isAwaitingAutoBriefing
          ? '이 브리핑 카드를 확인하면 실데이터 브리핑을 불러옵니다.'
          : effectiveAutoEnabled
            ? ((briefingMeta?.cacheState === 'FAILED_LOCKED'
              ? '현재 브리핑 캐시가 잠겨 있습니다. 운영 갱신 후 다시 확인해 주세요.'
              : isRefreshingBriefing
                ? (aiBriefing?.displayText ?? aiBriefing?.message)
                : aiLoading
                  ? '실데이터를 모아 경기 맥락 브리핑을 정리하는 중입니다.'
                  : (aiBriefing?.displayText ?? aiBriefing?.message))
              || '실데이터 브리핑을 준비하지 못했습니다.')
            : (forceManual || isFutureGame)
              ? `현재 매치업의 승부처는 ${analysisPresentation.title}에서 확인할 수 있습니다.`
              : `현재 매치업의 해석은 ${analysisPresentation.title}에서 확인할 수 있습니다.`;
  const seasonSummary = getSeasonSummary();
  const loginButtonLabel = authExpired
    ? '다시 로그인하기'
    : effectiveAutoEnabled
      ? '로그인하고 브리핑 보기'
      : `로그인하고 ${analysisPresentation.mode === 'review' ? '경기 리뷰' : analysisPresentation.mode === 'prediction' ? '경기 예측' : '상세 분석'} 보기`;
  const analysisButtonLabel = game ? analysisPresentation.buttonLabel : '전력 분석';

  return (
    <>
      {effectiveAutoEnabled ? (
        <Suspense fallback={null}>
          <CoachBriefingAutoRuntime
            game={game}
            gameDetail={gameDetail}
            seasonContext={seasonContext}
            requestMode={effectiveRequestMode}
            analysisType={analysisType}
            autoEnabled={effectiveAutoEnabled}
            shouldStartAutoBriefing={shouldStartAutoBriefing}
            isLoggedIn={isLoggedIn}
            isAuthLoading={isAuthLoading}
            onBriefingChange={setAiBriefing}
            onMetaChange={setBriefingMeta}
            onLoadingChange={setAiLoading}
            onAuthExpiredChange={setAuthExpired}
          />
        </Suspense>
      ) : null}
      <Suspense fallback={<div className="mb-6 min-h-[240px] rounded-xl border border-gray-200 bg-white/70 dark:border-border dark:bg-card/70" />}>
        <CoachBriefingContentRuntime
          dataQuality={briefingMeta?.dataQuality}
          totalEvidenceCount={totalEvidenceCount}
          supportedFactCount={briefingMeta?.supportedFactCount}
          seasonSummary={seasonSummary}
          activeTitle={activeTitle}
          activeMessage={activeMessage}
          briefingStatusMessage={briefingStatusMessage}
          briefingStatusTone={briefingStatusTone}
          showSummaryPoints={showSummaryPoints}
          summaryPoints={summaryPoints}
          inlineDataQualityNote={inlineDataQualityNote}
          showLoginAction={showLoginAction}
          isAuthCheckPending={isAuthCheckPending}
          aiLoading={aiLoading}
          loginButtonLabel={loginButtonLabel}
          analysisButtonLabel={analysisButtonLabel}
          onLoginAction={handleLoginAction}
          game={game}
          gameStatusBucket={gameDetail?.gameStatus}
          homePitcherName={homePitcherName}
          awayPitcherName={awayPitcherName}
          isPastGame={isPastGame}
          isFutureGame={isFutureGame}
          homeTeamId={game?.homeTeam ?? null}
          awayTeamId={game?.awayTeam ?? null}
          winProbabilityHome={briefingMeta?.winProbabilityHome ?? null}
          usedEvidence={briefingMeta?.usedEvidence}
          groundingWarnings={briefingMeta?.groundingWarnings}
          groundingReasons={briefingMeta?.groundingReasons}
          freshnessLabel={briefingFreshnessLabel}
        />
      </Suspense>
    </>
  );
}
