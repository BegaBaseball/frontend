import type { KeyboardEvent } from 'react';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import { getFullTeamName } from '../constants/teams';

interface GameCardProps {
  game: {
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
  };
  featured?: boolean;
  variant?: 'default' | 'home';
  onSelectPrediction?: () => void;
}

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
              {(game.stadium ?? '').replace('구장', '')}
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
