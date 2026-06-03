import type { KeyboardEvent } from 'react';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import { getFullTeamName } from '../constants/teams';
import { ArrowRightIcon, ClockIcon, MapPinIcon } from './icons/PublicShellIcons';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';

interface GameCardProps {
  game: {
    gameDate?: string;
    sourceDate?: string;
    homeTeam: string;
    homeTeamFull: string;
    awayTeam: string;
    awayTeamFull: string;
    time: string;
    stadium: string;
    status?: string;
    gameStatus?: string;
    gameStatusKr?: string;
    gameInfo: string;
    homeScore?: number | string;
    awayScore?: number | string;
    winner?: string;
    leagueType?: string;
    leagueBadge?: string;
    homePitcher?: PitcherLike;
    awayPitcher?: PitcherLike;
  };
  featured?: boolean;
  variant?: 'default' | 'home';
  onSelectPrediction?: () => void;
}

type PitcherLike = string | { name?: string | null } | null | undefined;

type NormalizedGameStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'DRAW'
  | 'UNKNOWN';

const parseScore = (value?: number | string | null): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(`${value}`.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveGameStatus = (status?: string): NormalizedGameStatus => {
  const normalized = (status || '').trim().toUpperCase();

  if (normalized === 'FINAL' || normalized === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (normalized === 'IN_PROGRESS' || normalized === 'INPROGRESS' || normalized === 'LIVE' || normalized === 'PLAYING') {
    return 'LIVE';
  }

  if (normalized === 'POSTPONED') {
    return 'POSTPONED';
  }

  if (normalized === 'CANCELLED' || normalized === 'CANCEL') {
    return 'CANCELLED';
  }

  if (normalized === 'DRAW') {
    return 'DRAW';
  }

  if (
    normalized === 'SCHEDULED'
    || normalized === 'READY'
    || normalized === 'UPCOMING'
    || normalized === 'NOT_STARTED'
    || normalized === 'PRE_GAME'
    || normalized === 'BEFORE_GAME'
  ) {
    return 'SCHEDULED';
  }

  return 'UNKNOWN';
};

const isUnresolvedMissingStatus = (status?: string | null): boolean => (
  status?.trim().toUpperCase() === 'UNRESOLVED_MISSING'
);

const getHomeStatusTone = (status: NormalizedGameStatus, isResultPending = false) => {
  if (isResultPending) {
    return {
      label: '결과 확인 중',
      badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200',
      dot: 'bg-slate-400',
    };
  }

  switch (status) {
    case 'SCHEDULED':
      return {
        label: '경기 예정',
        badge: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-950/20 dark:text-sky-200',
        dot: 'bg-sky-500',
      };
    case 'LIVE':
      return {
        label: 'LIVE',
        badge: 'border-red-200 bg-white text-red-700 dark:border-red-700/40 dark:bg-white/[0.06] dark:text-red-200',
        dot: 'bg-red-500 animate-pulse',
      };
    case 'COMPLETED':
      return {
        label: '경기 종료',
        badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-200',
        dot: 'bg-gray-500',
      };
    case 'POSTPONED':
      return {
        label: '경기 연기',
        badge: 'border-amber-200 bg-white text-amber-700 dark:border-amber-700/40 dark:bg-white/[0.06] dark:text-amber-200',
        dot: 'bg-amber-500',
      };
    case 'CANCELLED':
      return {
        label: '경기 취소',
        badge: 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300',
        dot: 'bg-gray-400',
      };
    case 'DRAW':
      return {
        label: '무승부',
        badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-200',
        dot: 'bg-gray-500',
      };
    default:
      return {
        label: '상태 미정',
        badge: 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-300',
        dot: 'bg-gray-400',
      };
  }
};

const getOutcomeTextClass = (label: string) => {
  if (label === '승') {
    return 'text-red-700 dark:text-red-200';
  }
  if (label === '패') {
    return 'text-blue-600 dark:text-blue-200';
  }
  if (label === '무') {
    return 'text-gray-700 dark:text-gray-200';
  }
  return 'text-gray-500 dark:text-gray-300';
};

const getTeamResultTone = (label: string) => {
  if (label === '승') {
    return {
      frame: 'border-red-200 bg-white dark:border-red-700/45 dark:bg-white/[0.05]',
      score: 'text-red-700 dark:text-red-200',
    };
  }
  if (label === '패') {
    return {
      frame: 'border-blue-100 bg-white dark:border-blue-500/30 dark:bg-white/[0.035]',
      score: 'text-blue-600/75 dark:text-blue-200/75',
    };
  }
  return {
    frame: 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.04]',
    score: 'text-gray-800 dark:text-gray-100',
  };
};

function TeamResultBadge({
  score,
  outcomeLabel,
  align,
}: {
  score: number;
  outcomeLabel: string;
  align: 'start' | 'end';
}) {
  const tone = getTeamResultTone(outcomeLabel);
  const outcomeText = outcomeLabel ? `, ${outcomeLabel}` : '';

  return (
    <div className={`flex shrink-0 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`inline-flex h-10 min-w-[3rem] items-center justify-center rounded-md border px-2.5 ${tone.frame}`}
        aria-label={`${score}점${outcomeText}`}
      >
        <span className={`text-[22px] font-black tabular-nums leading-none tracking-tight ${tone.score}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

function HomeSideLabel({
  label,
  align,
}: {
  label: string;
  align: 'start' | 'end';
}) {
  return (
    <span className={`inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 text-[11px] font-black text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 ${align === 'end' ? 'ml-auto' : ''}`}>
      {label}
    </span>
  );
}

function MobileTeamRow({
  team,
  displayName,
  fullName,
  score,
  outcomeLabel,
  showScore,
  side,
}: {
  team: string;
  displayName: string;
  fullName: string;
  score?: number;
  outcomeLabel: string;
  showScore: boolean;
  side: 'away' | 'home';
}) {
  const isHome = side === 'home';
  const scoreNode = showScore && score !== undefined ? (
    <TeamResultBadge
      score={score}
      outcomeLabel={outcomeLabel}
      align={isHome ? 'start' : 'end'}
    />
  ) : (
    <HomeSideLabel label={isHome ? '홈' : '원정'} align={isHome ? 'start' : 'end'} />
  );

  const identityNode = (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${isHome ? 'justify-end text-right' : ''}`}>
      {!isHome ? (
        <TeamLogo team={team} size={36} className="h-9 w-9 shrink-0" />
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-[17px] font-black leading-tight text-gray-950 dark:text-white">{displayName}</p>
        <p className="truncate text-[12px] font-bold leading-tight text-gray-400 dark:text-gray-500">{fullName}</p>
      </div>
      {isHome ? (
        <TeamLogo team={team} size={36} className="h-9 w-9 shrink-0" />
      ) : null}
    </div>
  );

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
      {isHome ? scoreNode : identityNode}
      {isHome ? identityNode : scoreNode}
    </div>
  );
}

const resolveMeaningfulStatusLabel = (statusKr?: string, status?: string) => {
  const trimmed = statusKr?.trim();
  const normalizedStatus = status?.trim().toUpperCase();

  if (trimmed && trimmed !== '정보 없음') {
    return isUnresolvedMissingStatus(trimmed) ? '결과 확인 중' : trimmed;
  }

  return normalizedStatus === 'UNRESOLVED_MISSING' ? '결과 확인 중' : null;
};

const resolvePitcherName = (pitcher: PitcherLike): string | null => {
  if (!pitcher) {
    return null;
  }

  const raw = typeof pitcher === 'string' ? pitcher : pitcher.name;
  const trimmed = raw?.trim();
  return trimmed && trimmed !== '정보 없음' ? trimmed : null;
};

const resolveLeagueLabel = (leagueType?: string, leagueBadge?: string): string | null => {
  const badge = leagueBadge?.trim();
  if (badge) {
    return badge;
  }

  switch (leagueType?.trim().toUpperCase()) {
    case 'REGULAR':
      return '정규시즌';
    case 'POSTSEASON':
      return '포스트시즌';
    case 'KOREAN_SERIES':
      return '한국시리즈';
    case 'PRE':
    case 'PRESEASON':
      return '시범경기';
    default:
      return null;
  }
};

export default function GameCard({ game, featured = false, variant = 'default', onSelectPrediction }: GameCardProps) {
  // 경기 상태에 따른 뱃지 스타일
  const getStatusBadgeStyle = (status: NormalizedGameStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return {
          bg: 'bg-sky-50/95 dark:bg-sky-900/35 border border-sky-200/80 dark:border-sky-700/55',
          color: 'text-sky-700 dark:text-sky-200',
          text: '경기 예정'
        };
      case 'LIVE': // Live status
        return {
          bg: 'bg-red-50/95 dark:bg-red-900/35 border border-red-200/80 dark:border-red-700/55',
          color: 'text-red-700 dark:text-red-200',
          text: 'LIVE'
        };
      case 'COMPLETED':
        return {
          bg: 'bg-emerald-50/95 dark:bg-emerald-900/35 border border-emerald-200/80 dark:border-emerald-700/55',
          color: 'text-emerald-700 dark:text-emerald-200',
          text: '경기 종료'
        };
      case 'CANCELLED':
        return {
          bg: 'bg-zinc-50/90 dark:bg-zinc-800/55 border border-zinc-200/80 dark:border-zinc-700/55',
          color: 'text-zinc-600 dark:text-zinc-200',
          text: '경기 취소'
        };
      case 'POSTPONED':
        return {
          bg: 'bg-orange-50/95 dark:bg-orange-900/35 border border-orange-200/80 dark:border-orange-700/55',
          color: 'text-orange-700 dark:text-orange-200',
          text: '우천 취소' // Usually weather related
        };
      case 'DRAW':
        return {
          bg: 'bg-violet-50/95 dark:bg-violet-900/35 border border-violet-200/80 dark:border-violet-700/55',
          color: 'text-violet-700 dark:text-violet-200',
          text: '무승부'
        };
      default:
        return {
          bg: 'bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/55',
          color: 'text-slate-700 dark:text-slate-200',
          text: '상태 미정'
        };
    }
  };

  const statusCode = resolveGameStatus(game.gameStatus || game.status);
  const statusStyle = getStatusBadgeStyle(statusCode);
  const isCompleted = statusCode === 'COMPLETED' || statusCode === 'DRAW';
  const isCardSelectable = typeof onSelectPrediction === 'function';

  const normalizedHomeScore = parseScore(game.homeScore);
  const normalizedAwayScore = parseScore(game.awayScore);
  const isResultViewable = normalizedHomeScore !== undefined && normalizedAwayScore !== undefined;
  const resultScores = isResultViewable ? {
    home: normalizedHomeScore,
    away: normalizedAwayScore,
  } : null;

  const homeTeamName = (game.homeTeamFull?.trim() || getFullTeamName(game.homeTeam) || game.homeTeam).trim();
  const awayTeamName = (game.awayTeamFull?.trim() || getFullTeamName(game.awayTeam) || game.awayTeam).trim();
  const winnerText = game.winner?.trim();
  const winnerSide = (() => {
    if (!winnerText) {
      return null;
    }
    if (
      winnerText === homeTeamName
      || winnerText === game.homeTeamFull
      || winnerText === game.homeTeam
    ) {
      return 'home';
    }
    if (
      winnerText === awayTeamName
      || winnerText === game.awayTeamFull
      || winnerText === game.awayTeam
    ) {
      return 'away';
    }
    return null;
  })();

  const hasOutcome = isResultViewable
    ? statusCode !== 'POSTPONED' && statusCode !== 'CANCELLED' && statusCode !== 'SCHEDULED'
    : isCompleted && winnerSide !== null;
  const isTie = resultScores !== null && resultScores.home === resultScores.away;
  const isAwayLeading = resultScores !== null && resultScores.away > resultScores.home;
  const isHomeLeading = resultScores !== null && resultScores.home > resultScores.away;
  const awayOutcomeLabel = hasOutcome
    ? isTie
      ? '무'
      : isAwayLeading
        ? '승'
        : '패'
    : '';
  const homeOutcomeLabel = hasOutcome
    ? isTie
      ? '무'
      : isHomeLeading
        ? '승'
        : '패'
    : '';

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isCardSelectable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectPrediction();
    }
  };
  const isHomeVariant = variant === 'home';

  if (isHomeVariant) {
    const rawStatus = game.gameStatus || game.status;
    const isResultPending = isUnresolvedMissingStatus(game.gameStatusKr) || isUnresolvedMissingStatus(rawStatus);
    const homeStatusTone = getHomeStatusTone(statusCode, isResultPending);
    const homeStatusText = resolveMeaningfulStatusLabel(game.gameStatusKr, rawStatus) || homeStatusTone.label;
    const displayTime = game.time?.trim() || '시간 미정';
    const displayStadium = formatStadiumDisplayName(game.stadium) || '구장 미정';
    const meaningfulGameInfo = game.gameInfo?.trim() && game.gameInfo.trim() !== '정보 없음'
      ? game.gameInfo.trim()
      : null;
    const leagueLabel = resolveLeagueLabel(game.leagueType, game.leagueBadge);
    const awayPitcherName = resolvePitcherName(game.awayPitcher);
    const homePitcherName = resolvePitcherName(game.homePitcher);
    const pitcherMatchupLabel = awayPitcherName || homePitcherName
      ? `선발 ${awayPitcherName || '미정'} · ${homePitcherName || '미정'}`
      : null;
    const defaultDetailLabel = isResultPending
      ? '결과 데이터 확인 중'
      : statusCode === 'SCHEDULED'
        ? '예정 일정'
        : statusCode === 'LIVE'
          ? '실시간 진행'
          : statusCode === 'COMPLETED' || statusCode === 'DRAW'
            ? '최종 스코어'
            : statusCode === 'POSTPONED' || statusCode === 'CANCELLED'
              ? '일정 변동'
              : '상태 확인 중';
    const desktopDetailLabel = pitcherMatchupLabel || meaningfulGameInfo || leagueLabel || defaultDetailLabel;
    const mobileMetaLabel = [displayStadium, leagueLabel].filter(Boolean).join(' · ') || displayStadium;
    const awayDisplayName = awayTeamName.split(' ')[0] || game.awayTeam;
    const homeDisplayName = homeTeamName.split(' ')[0] || game.homeTeam;
    const outcomeSummary = hasOutcome && resultScores === null && winnerSide
      ? `${winnerSide === 'away' ? awayDisplayName : homeDisplayName} 승`
      : null;
    const showTeamScores = hasOutcome && resultScores !== null;
    const showOutcomeLabels = hasOutcome && statusCode !== 'LIVE';
    const matchupMarker = showTeamScores
      ? statusCode === 'LIVE'
        ? 'LIVE'
        : isTie
          ? '무승부'
          : '종료'
      : isResultPending
        ? '결과 대기'
        : statusCode === 'POSTPONED' || statusCode === 'CANCELLED'
          ? '변동'
          : outcomeSummary || 'VS';
    const matchupMarkerClass = showTeamScores
      ? statusCode === 'LIVE'
        ? 'border-red-200 bg-red-50 text-[11px] text-red-700 dark:border-red-700/40 dark:bg-red-950/15 dark:text-red-200'
        : 'border-gray-200 bg-gray-50 text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300'
      : isResultPending
        ? 'border-slate-200 bg-slate-50 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200'
        : outcomeSummary
          ? 'border-red-200 bg-red-50/60 text-[12px] text-red-700 dark:border-red-700/40 dark:bg-red-950/15 dark:text-red-200'
          : statusCode === 'POSTPONED' || statusCode === 'CANCELLED'
            ? 'border-amber-200 bg-amber-50 text-[11px] text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/15 dark:text-amber-200'
            : 'border-transparent text-[16px] text-gray-400 dark:text-gray-500';
    const actionLabel = isResultPending
      ? '경기 보기'
      : statusCode === 'LIVE'
        ? 'LIVE 보기'
        : showTeamScores || isCompleted
          ? '결과 보기'
          : statusCode === 'POSTPONED' || statusCode === 'CANCELLED'
            ? '경기 보기'
            : '승부예측';

    return (
      <Card
        className={`group flex h-full min-h-[168px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-card-foreground shadow-sm transition-all duration-200 dark:border-white/10 dark:bg-card lg:min-h-[104px]
          ${isCardSelectable ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-50/60 hover:shadow-md dark:hover:border-white/20 dark:hover:bg-white/[0.04]' : ''}
          ${featured ? 'ring-1 ring-emerald-400/30' : ''}`}
        role={isCardSelectable ? 'button' : undefined}
        tabIndex={isCardSelectable ? 0 : undefined}
        onClick={isCardSelectable ? onSelectPrediction : undefined}
        onKeyDown={isCardSelectable ? handleCardKeyDown : undefined}
        aria-label={isCardSelectable ? `${game.awayTeamFull} 대 ${game.homeTeamFull} ${actionLabel}` : undefined}
      >
        <div className="flex h-full flex-col gap-3 p-3 sm:p-4 lg:hidden">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1 text-[15px] font-black leading-none text-gray-950 dark:text-white sm:text-[17px]">
              <ClockIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="break-keep">{displayTime}</span>
            </span>
            <span className={`inline-flex max-w-[58%] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black ${homeStatusTone.badge}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${homeStatusTone.dot}`} />
              <span className="truncate">{homeStatusText}</span>
            </span>
          </div>

          <div className="space-y-2">
            <MobileTeamRow
              team={game.awayTeam}
              displayName={awayDisplayName}
              fullName={awayTeamName}
              score={resultScores?.away}
              outcomeLabel={awayOutcomeLabel}
              showScore={showTeamScores}
              side="away"
            />
            <div className="flex items-center justify-center">
              <div className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 font-black ${matchupMarkerClass}`}>
                {matchupMarker}
              </div>
            </div>
            <MobileTeamRow
              team={game.homeTeam}
              displayName={homeDisplayName}
              fullName={homeTeamName}
              score={resultScores?.home}
              outcomeLabel={homeOutcomeLabel}
              showScore={showTeamScores}
              side="home"
            />
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-white/8">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-gray-500 dark:text-gray-400">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{mobileMetaLabel}</span>
            </span>
            {isCardSelectable ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-black text-gray-700 transition-colors group-hover:border-primary/30 group-hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:group-hover:text-emerald-200">
                {actionLabel}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden h-full grid-cols-[5.5rem_minmax(0,1.25fr)_5rem_minmax(0,1.25fr)_minmax(8rem,0.85fr)_7.5rem] items-center gap-4 p-4 lg:grid">
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 text-[15px] font-black leading-none text-gray-950 dark:text-white sm:text-[17px]">
              <ClockIcon className="hidden h-3.5 w-3.5 text-gray-400 lg:block" />
              <span className="break-keep">{displayTime}</span>
            </span>
            {leagueLabel ? (
              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-black text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
                {leagueLabel}
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <TeamLogo team={game.awayTeam} size={38} className="h-10 w-10 shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-[17px] font-black leading-tight text-gray-950 dark:text-white">{awayDisplayName}</p>
                <p className="truncate text-[12px] font-bold leading-tight text-gray-400 dark:text-gray-500">{awayTeamName}</p>
                {awayPitcherName ? (
                  <p className="truncate text-[11px] font-black leading-tight text-gray-500 dark:text-gray-400">선발 {awayPitcherName}</p>
                ) : null}
                {showOutcomeLabels && !showTeamScores ? (
                  <span className={`mt-1 block text-[11px] font-black ${getOutcomeTextClass(awayOutcomeLabel)}`}>
                    {awayOutcomeLabel || '-'}
                  </span>
                ) : null}
              </div>
            </div>
            {showTeamScores ? (
              <TeamResultBadge
                score={resultScores.away}
                outcomeLabel={awayOutcomeLabel}
                align="end"
              />
            ) : null}
          </div>

          <div className="text-center">
            <div className={`inline-flex items-center justify-center rounded-full border px-2 py-1 font-black ${matchupMarkerClass}`}>
              {matchupMarker}
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-4 text-right">
            {showTeamScores ? (
              <TeamResultBadge
                score={resultScores.home}
                outcomeLabel={homeOutcomeLabel}
                align="start"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-[17px] font-black leading-tight text-gray-950 dark:text-white">{homeDisplayName}</p>
                <p className="truncate text-[12px] font-bold leading-tight text-gray-400 dark:text-gray-500">{homeTeamName}</p>
                {homePitcherName ? (
                  <p className="truncate text-[11px] font-black leading-tight text-gray-500 dark:text-gray-400">선발 {homePitcherName}</p>
                ) : null}
                {showOutcomeLabels && !showTeamScores ? (
                  <span className={`mt-1 block text-[11px] font-black ${getOutcomeTextClass(homeOutcomeLabel)}`}>
                    {homeOutcomeLabel || '-'}
                  </span>
                ) : null}
              </div>
              <TeamLogo team={game.homeTeam} size={38} className="h-10 w-10 shrink-0" />
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-start gap-1">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[14px] font-bold text-gray-500 dark:text-gray-400">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{displayStadium}</span>
            </span>
            <span className="max-w-full truncate text-[12px] font-bold text-gray-400 dark:text-gray-500">
              {desktopDetailLabel}
            </span>
          </div>

          <div className="flex min-w-0 flex-col items-end gap-2">
            <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-black ${homeStatusTone.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${homeStatusTone.dot}`} />
              <span className="truncate">{homeStatusText}</span>
            </span>
            {isCardSelectable ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12px] font-black text-gray-700 transition-colors group-hover:border-primary/30 group-hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200 dark:group-hover:text-emerald-200">
                {actionLabel}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            ) : (
              <span className="min-w-0 truncate text-[13px] font-bold text-gray-400 dark:text-gray-500">
                {desktopDetailLabel}
              </span>
            )}
          </div>
        </div>
      </Card>
    );
  }

    return (
    <Card
      className={`group relative overflow-hidden transition-all duration-200
        ${isCardSelectable ? 'cursor-pointer hover:bg-accent/60' : ''}
        ${featured ? 'ring-1 ring-emerald-400/30' : ''}
        ${isHomeVariant ? 'h-full' : ''}
        rounded-2xl border border-border bg-card/95 text-card-foreground flex flex-col`}
      role={isCardSelectable ? 'button' : undefined}
      tabIndex={isCardSelectable ? 0 : undefined}
      onClick={isCardSelectable ? onSelectPrediction : undefined}
      onKeyDown={isCardSelectable ? handleCardKeyDown : undefined}
      aria-label={isCardSelectable ? `${game.awayTeamFull} 대 ${game.homeTeamFull} 승부예측으로 이동` : undefined}
    >
      <div className={`${isHomeVariant ? 'p-3 sm:p-4' : 'p-4 sm:p-5'} flex flex-col relative z-10`}>
        {/* Header: 구장 & 시간 & 상태 */}
        <div className={`flex min-w-0 items-center justify-between gap-2 ${isHomeVariant ? 'mb-4' : 'mb-5'}`}>
          <div className="flex min-w-0 items-center gap-2">
            <span className={`min-w-0 truncate bg-muted px-2 py-1 rounded border border-border/80 font-semibold text-muted-foreground ${isHomeVariant ? 'text-[14px] sm:text-[15px]' : 'text-[16px]'}`}>
              {formatStadiumDisplayName(game.stadium) || '구장 미정'}
            </span>
            <span className={`shrink-0 font-mono text-muted-foreground ${isHomeVariant ? 'text-[14px] sm:text-[15px]' : 'text-[16px]'}`}>
              {game.time}
            </span>
          </div>

          {statusStyle && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full ${isHomeVariant ? 'px-2.5 py-1 text-[14px] sm:text-[15px]' : 'px-3 py-1 text-[16px]'} font-semibold border
              ${statusCode === 'COMPLETED' ? 'text-[#2ecc71] border-[#2ecc71]/40 bg-[#2ecc71]/10' :
                statusCode === 'LIVE' ? 'text-rose-400 border-rose-900 bg-rose-950/30' :
                  'text-muted-foreground border-border bg-secondary'}`}
            >
              {statusStyle.text}
            </span>
          )}
        </div>

        {/* Main Content: 팀 로고 & 점수 */}
        <div className={`flex items-center justify-between ${isHomeVariant ? 'px-0' : 'px-1'}`}>
          {/* Away Team */}
          <div className={`flex flex-col items-center gap-2.5 ${isHomeVariant ? 'w-20 sm:w-28 lg:w-24' : 'w-20'}`}>
            <div className={`${isHomeVariant ? 'w-16 h-16 sm:w-20 sm:h-20 lg:w-[4.5rem] lg:h-[4.5rem] xl:w-20 xl:h-20' : 'w-16 h-16'} flex items-center justify-center p-2 rounded-[1rem] bg-secondary border border-border/80`}>
              <TeamLogo team={game.awayTeam} size="full" className="w-full h-full object-contain" />
            </div>
            <span className={`font-bold tracking-tight text-foreground ${isHomeVariant ? 'text-[15px] sm:text-[17px]' : 'text-[16px]'}`}>
              {(game.awayTeamFull ?? '').split(' ')[0]}
            </span>
          </div>

          {/* Score & W/L Area */}
        <div className="flex flex-col items-center justify-center flex-1">
            {hasOutcome ? (
              <>
                <div className="flex items-center gap-3 font-black text-3xl sm:text-4xl tracking-widest text-foreground mb-2">
                  <span>{resultScores?.away ?? '-'}</span>
                  <span className="text-muted-foreground text-2xl sm:text-3xl pb-1">:</span>
                  <span>{resultScores?.home ?? '-'}</span>
                </div>

                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-[16px] font-bold">
                    <span className={`w-1.5 h-1.5 rounded-full ${awayOutcomeLabel === '승'
                      ? 'bg-[#2ecc71] shadow-[0_0_6px_rgba(46,204,113,0.5)]'
                      : awayOutcomeLabel === '패'
                        ? 'bg-rose-500'
                        : 'bg-zinc-500'
                    }`}
                    ></span>
                    <span className={awayOutcomeLabel === '승' ? 'text-[#2ecc71]' : awayOutcomeLabel === '패' ? 'text-rose-500' : 'text-zinc-500'}>
                      {awayOutcomeLabel || '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[16px] font-bold">
                    <span className={homeOutcomeLabel === '승' ? 'text-[#2ecc71]' : homeOutcomeLabel === '패' ? 'text-rose-500' : 'text-zinc-500'}>
                      {homeOutcomeLabel || '-'}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${homeOutcomeLabel === '승'
                      ? 'bg-[#2ecc71] shadow-[0_0_6px_rgba(46,204,113,0.5)]'
                      : homeOutcomeLabel === '패'
                        ? 'bg-rose-500'
                        : 'bg-zinc-500'
                    }`}
                    ></span>
                  </div>
                </div>
              </>
            ) : (
              <span className={`${isHomeVariant ? 'text-2xl sm:text-3xl' : 'text-3xl'} font-black text-zinc-600 tracking-widest`}>
                VS
              </span>
            )}
          </div>

          {/* Home Team */}
          <div className={`flex flex-col items-center gap-2.5 ${isHomeVariant ? 'w-20 sm:w-28 lg:w-24' : 'w-20'}`}>
            <div className={`${isHomeVariant ? 'w-16 h-16 sm:w-20 sm:h-20 lg:w-[4.5rem] lg:h-[4.5rem] xl:w-20 xl:h-20' : 'w-16 h-16'} flex items-center justify-center p-2 rounded-[1rem] bg-secondary border border-border/80`}>
              <TeamLogo team={game.homeTeam} size="full" className="w-full h-full object-contain" />
            </div>
            <span className={`font-bold tracking-tight text-foreground ${isHomeVariant ? 'text-[15px] sm:text-[17px]' : 'text-[16px]'}`}>
              {(game.homeTeamFull ?? '').split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Footer: 경기 정보 */}
        <div className={`flex justify-center ${isHomeVariant ? 'mt-4' : 'mt-5'}`}>
          {game.gameInfo ? (
            <span className={`${isHomeVariant ? 'text-[14px] sm:text-[15px]' : 'text-[16px]'} font-semibold text-muted-foreground px-3 py-1.5 rounded-md border border-border bg-secondary`}>
              {game.gameInfo}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
