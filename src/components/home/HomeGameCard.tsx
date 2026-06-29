import { lazy, Suspense, type KeyboardEvent } from 'react';

const LazyTeamLogo = lazy(() => import('../TeamLogo'));

const HOME_TEAM_FULL_NAME_BY_CODE: Record<string, string> = {
  LG: 'LG 트윈스',
  DB: '두산 베어스',
  DO: '두산 베어스',
  OB: '두산 베어스',
  SSG: 'SSG 랜더스',
  SK: 'SSG 랜더스',
  KT: 'KT 위즈',
  KH: '키움 히어로즈',
  KI: '키움 히어로즈',
  NX: '키움 히어로즈',
  WO: '키움 히어로즈',
  KW: '키움 히어로즈',
  NC: 'NC 다이노스',
  SS: '삼성 라이온즈',
  LT: '롯데 자이언츠',
  KIA: 'KIA 타이거즈',
  HT: 'KIA 타이거즈',
  HH: '한화 이글스',
};

const HOME_STADIUM_LABEL_RULES: Array<readonly [string, string]> = [
  ['잠실', '서울 · 잠실야구장'],
  ['고척', '서울 · 고척스카이돔'],
  ['문학', '인천 · SSG랜더스필드'],
  ['인천', '인천 · SSG랜더스필드'],
  ['ssg랜더스필드', '인천 · SSG랜더스필드'],
  ['수원', '수원 · KT위즈파크'],
  ['kt위즈파크', '수원 · KT위즈파크'],
  ['ktwiz파크', '수원 · KT위즈파크'],
  ['대전', '대전 · 한화생명볼파크'],
  ['한화생명', '대전 · 한화생명볼파크'],
  ['광주', '광주 · KIA 챔피언스필드'],
  ['kia챔피언스', '광주 · KIA 챔피언스필드'],
  ['기아챔피언스', '광주 · KIA 챔피언스필드'],
  ['대구', '대구 · 삼성 라이온즈파크'],
  ['삼성라이온즈', '대구 · 삼성 라이온즈파크'],
  ['라팍', '대구 · 삼성 라이온즈파크'],
  ['창원', '창원 · NC파크'],
  ['nc파크', '창원 · NC파크'],
  ['부산', '부산 · 사직야구장'],
  ['사직', '부산 · 사직야구장'],
];

const normalizeHomeStadiumKey = (value: string): string =>
  value.toLowerCase().replace(/[\s\-_/()·.]/g, '');

const resolveHomeGameTeamFullName = (teamId: string, explicitFullName?: string): string => {
  const explicit = explicitFullName?.trim();
  if (explicit) {
    return explicit;
  }

  const fallback = teamId.trim();
  return HOME_TEAM_FULL_NAME_BY_CODE[fallback.toUpperCase()] || fallback;
};

const formatHomeGameStadiumLabel = (value?: string | null): string => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return '';
  }

  const normalizedValue = normalizeHomeStadiumKey(trimmedValue);
  const match = HOME_STADIUM_LABEL_RULES.find(([token]) => normalizedValue.includes(token));
  return match?.[1] ?? trimmedValue;
};

const HOME_GAME_CLOCK_ICON_CLASS = 'inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current text-gray-400';
const HOME_GAME_LOCATION_ICON_CLASS = 'inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current';
const HOME_GAME_ARROW_ICON_CLASS = 'inline-block h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current transition-transform group-hover:translate-x-0.5';

interface HomeGameCardProps {
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
  onSelectPrediction?: () => void;
  shouldMountTeamLogo?: boolean;
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
      badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
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
        badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
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
        badge: 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
        dot: 'bg-gray-400',
      };
    case 'DRAW':
      return {
        label: '무승부',
        badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
        dot: 'bg-gray-500',
      };
    default:
      return {
        label: '상태 미정',
        badge: 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
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
    return 'text-gray-700 dark:text-white';
  }
  return 'text-gray-500 dark:text-white';
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
    score: 'text-gray-800 dark:text-white',
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
        <span className={`text-22 font-black tabular-nums leading-none tracking-tight ${tone.score}`}>
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
    <span className={`inline-flex h-8 min-w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 px-2 text-11 font-black text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${align === 'end' ? 'ml-auto' : ''}`}>
      {label}
    </span>
  );
}

const resolveTeamLogoFallbackText = (team: string, label: string): string => {
  const source = label.trim() || team.trim();
  if (!source) {
    return '?';
  }

  const alphaToken = source.match(/[A-Za-z]+/)?.[0];
  if (alphaToken) {
    return alphaToken.slice(0, 2).toUpperCase();
  }

  const hangul = source.match(/[가-힣]/g)?.slice(0, 2).join('');
  return hangul || source.slice(0, 2);
};

function HomeTeamLogoFallback({
  team,
  label,
  className,
}: {
  team: string;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-gray-200 bg-white text-11 font-black text-primary dark:border-white/10 dark:bg-white/[0.08] ${className}`}
      aria-label={`${label || team} 로고`}
    >
      {resolveTeamLogoFallbackText(team, label)}
    </div>
  );
}

function HomeDeferredTeamLogo({
  team,
  label,
  size,
  className,
  shouldMount,
}: {
  team: string;
  label: string;
  size: number;
  className: string;
  shouldMount: boolean;
}) {
  if (!shouldMount) {
    return <HomeTeamLogoFallback team={team} label={label} className={className} />;
  }

  return (
    <Suspense fallback={<HomeTeamLogoFallback team={team} label={label} className={className} />}>
      <LazyTeamLogo team={team} size={size} className={className} />
    </Suspense>
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
  shouldMountTeamLogo,
}: {
  team: string;
  displayName: string;
  fullName: string;
  score?: number;
  outcomeLabel: string;
  showScore: boolean;
  side: 'away' | 'home';
  shouldMountTeamLogo: boolean;
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
        <HomeDeferredTeamLogo team={team} label={displayName} size={36} className="h-9 w-9 shrink-0" shouldMount={shouldMountTeamLogo} />
      ) : null}
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-17 font-black leading-tight text-gray-950 dark:text-white">{displayName}</p>
        <p className="truncate text-12 font-bold leading-tight text-gray-400 dark:text-white">{fullName}</p>
      </div>
      {isHome ? (
        <HomeDeferredTeamLogo team={team} label={displayName} size={36} className="h-9 w-9 shrink-0" shouldMount={shouldMountTeamLogo} />
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

export default function HomeGameCard({ game, onSelectPrediction, shouldMountTeamLogo = true }: HomeGameCardProps) {
  const statusCode = resolveGameStatus(game.gameStatus || game.status);
  const isCompleted = statusCode === 'COMPLETED' || statusCode === 'DRAW';
  const isCardSelectable = typeof onSelectPrediction === 'function';

  const normalizedHomeScore = parseScore(game.homeScore);
  const normalizedAwayScore = parseScore(game.awayScore);
  const isResultViewable = normalizedHomeScore !== undefined && normalizedAwayScore !== undefined;
  const resultScores = isResultViewable ? {
    home: normalizedHomeScore,
    away: normalizedAwayScore,
  } : null;

  const homeTeamName = resolveHomeGameTeamFullName(game.homeTeam, game.homeTeamFull);
  const awayTeamName = resolveHomeGameTeamFullName(game.awayTeam, game.awayTeamFull);
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

  const rawStatus = game.gameStatus || game.status;
  const isResultPending = isUnresolvedMissingStatus(game.gameStatusKr) || isUnresolvedMissingStatus(rawStatus);
  const homeStatusTone = getHomeStatusTone(statusCode, isResultPending);
  const homeStatusText = resolveMeaningfulStatusLabel(game.gameStatusKr, rawStatus) || homeStatusTone.label;
  const displayTime = game.time?.trim() || '시간 미정';
  const displayStadium = formatHomeGameStadiumLabel(game.stadium) || '구장 미정';
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
      ? 'border-red-200 bg-red-50 text-11 text-red-700 dark:border-red-700/40 dark:bg-red-950/15 dark:text-red-200'
      : 'border-gray-200 bg-gray-50 text-11 text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
    : isResultPending
      ? 'border-slate-200 bg-slate-50 text-11 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
      : outcomeSummary
        ? 'border-red-200 bg-red-50/60 text-12 text-red-700 dark:border-red-700/40 dark:bg-red-950/15 dark:text-red-200'
        : statusCode === 'POSTPONED' || statusCode === 'CANCELLED'
          ? 'border-amber-200 bg-amber-50 text-11 text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/15 dark:text-amber-200'
          : 'border-transparent text-body text-gray-400 dark:text-white';
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
    <div
      className={`group flex h-full min-h-[168px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-card-foreground shadow-sm transition-all duration-200 dark:border-white/10 dark:bg-card lg:min-h-[104px]
        ${isCardSelectable ? 'cursor-pointer hover:border-gray-300 hover:bg-gray-50/60 hover:shadow-md dark:hover:border-white/20 dark:hover:bg-white/[0.04]' : ''}`}
      role={isCardSelectable ? 'button' : undefined}
      tabIndex={isCardSelectable ? 0 : undefined}
      onClick={isCardSelectable ? onSelectPrediction : undefined}
      onKeyDown={isCardSelectable ? handleCardKeyDown : undefined}
      aria-label={isCardSelectable ? `${game.awayTeamFull} 대 ${game.homeTeamFull} ${actionLabel}` : undefined}
    >
      <div className="flex h-full flex-col gap-3 p-3 sm:p-4 lg:hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 text-15 font-black leading-none text-gray-950 dark:text-white sm:text-17">
            <span className={HOME_GAME_CLOCK_ICON_CLASS} aria-hidden="true" />
            <span className="break-keep">{displayTime}</span>
          </span>
          <span className={`inline-flex max-w-[58%] items-center gap-1 rounded-full border px-2 py-0.5 text-11 font-black ${homeStatusTone.badge}`}>
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
            shouldMountTeamLogo={shouldMountTeamLogo}
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
            shouldMountTeamLogo={shouldMountTeamLogo}
          />
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-white/8">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-13 font-bold text-gray-500 dark:text-white">
            <span className={HOME_GAME_LOCATION_ICON_CLASS} aria-hidden="true" />
            <span className="truncate">{mobileMetaLabel}</span>
          </span>
          {isCardSelectable ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-12 font-black text-gray-700 transition-colors group-hover:border-primary/30 group-hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:group-hover:text-emerald-200">
              {actionLabel}
              <span className={HOME_GAME_ARROW_ICON_CLASS} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden h-full grid-cols-home-game-card items-center gap-4 p-4 lg:grid">
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 text-15 font-black leading-none text-gray-950 dark:text-white sm:text-17">
            <span className={`hidden lg:block ${HOME_GAME_CLOCK_ICON_CLASS}`} aria-hidden="true" />
            <span className="break-keep">{displayTime}</span>
          </span>
          {leagueLabel ? (
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-11 font-black text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
              {leagueLabel}
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <HomeDeferredTeamLogo team={game.awayTeam} label={awayDisplayName} size={38} className="h-10 w-10 shrink-0" shouldMount={shouldMountTeamLogo} />
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-17 font-black leading-tight text-gray-950 dark:text-white">{awayDisplayName}</p>
              <p className="truncate text-12 font-bold leading-tight text-gray-400 dark:text-white">{awayTeamName}</p>
              {awayPitcherName ? (
                <p className="truncate text-11 font-black leading-tight text-gray-500 dark:text-white">선발 {awayPitcherName}</p>
              ) : null}
              {showOutcomeLabels && !showTeamScores ? (
                <span className={`mt-1 block text-11 font-black ${getOutcomeTextClass(awayOutcomeLabel)}`}>
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
              <p className="truncate text-17 font-black leading-tight text-gray-950 dark:text-white">{homeDisplayName}</p>
              <p className="truncate text-12 font-bold leading-tight text-gray-400 dark:text-white">{homeTeamName}</p>
              {homePitcherName ? (
                <p className="truncate text-11 font-black leading-tight text-gray-500 dark:text-white">선발 {homePitcherName}</p>
              ) : null}
              {showOutcomeLabels && !showTeamScores ? (
                <span className={`mt-1 block text-11 font-black ${getOutcomeTextClass(homeOutcomeLabel)}`}>
                  {homeOutcomeLabel || '-'}
                </span>
              ) : null}
            </div>
            <HomeDeferredTeamLogo team={game.homeTeam} label={homeDisplayName} size={38} className="h-10 w-10 shrink-0" shouldMount={shouldMountTeamLogo} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-caption font-bold text-gray-500 dark:text-white">
            <span className={HOME_GAME_LOCATION_ICON_CLASS} aria-hidden="true" />
            <span className="truncate">{displayStadium}</span>
          </span>
          <span className="max-w-full truncate text-12 font-bold text-gray-400 dark:text-white">
            {desktopDetailLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-end gap-2">
          <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-12 font-black ${homeStatusTone.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${homeStatusTone.dot}`} />
            <span className="truncate">{homeStatusText}</span>
          </span>
          {isCardSelectable ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-12 font-black text-gray-700 transition-colors group-hover:border-primary/30 group-hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:group-hover:text-emerald-200">
              {actionLabel}
              <span className={HOME_GAME_ARROW_ICON_CLASS} aria-hidden="true" />
            </span>
          ) : (
            <span className="min-w-0 truncate text-13 font-bold text-gray-400 dark:text-white">
              {desktopDetailLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
