import type { KeyboardEvent, MouseEvent } from 'react';
import { AlertTriangle, CalendarDays, Clock3, ArrowUpRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import TeamLogo from './TeamLogo';

const KOREAN_DAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface ScheduledGame {
  gameId: string;
  time: string;
  stadium: string;
  gameStatus: string;
  gameStatusKr?: string;
  homeTeam: string;
  homeTeamFull: string;
  awayTeam: string;
  awayTeamFull: string;
  sourceDate?: string;
  leagueType?: string;
  leagueBadge?: string;
}

interface ScheduledGameCardProps {
  game: ScheduledGame;
  onSelectPrediction: () => void;
}

const formatSourceDate = (sourceDate?: string) => {
  if (!sourceDate) return '날짜 미정';
  const date = new Date(`${sourceDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return sourceDate;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = KOREAN_DAYS[date.getDay()];
  return `${year}.${month}.${day} (${dayOfWeek})`;
};

export default function ScheduledGameCard({ game, onSelectPrediction }: ScheduledGameCardProps) {
  const normalizedStatus = (game.gameStatus || '').toUpperCase();
  const isSecondary = normalizedStatus === 'POSTPONED' || normalizedStatus === 'CANCELLED';
  const hasMeaningfulStatusLabel = Boolean(
    game.gameStatusKr &&
    game.gameStatusKr.trim() &&
    game.gameStatusKr.trim() !== '정보 없음'
  );

  const statusLabel = hasMeaningfulStatusLabel
    ? game.gameStatusKr!.trim()
    : (normalizedStatus === 'POSTPONED' ? '경기 연기' : normalizedStatus === 'CANCELLED' ? '경기 취소' : '경기 예정');
  const leagueLabel = game.leagueBadge || '예정 경기';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectPrediction();
    }
  };

  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSelectPrediction();
  };

    return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelectPrediction}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/12 bg-gradient-to-b from-white via-white to-slate-50 dark:from-secondary/90 dark:via-secondary/75 dark:to-secondary/55 shadow-sm hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 dark:hover:border-emerald-500/40 hover:ring-1 hover:ring-emerald-100/80 dark:hover:ring-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background h-[224px]"
      aria-label={`${game.awayTeamFull} 대 ${game.homeTeamFull} 승부예측으로 이동`}
    >
      <div className="p-4 md:p-5 space-y-3.5 relative z-10">
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-emerald-500/[0.12] to-transparent dark:via-emerald-400/[0.2]" />

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-[16px] font-bold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200 shadow-sm">
            <Clock3 className="w-3.5 h-3.5" />
            {game.time || '시간 미정'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[16px] font-semibold ${
              isSecondary
              ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40'
              : 'text-sky-700 dark:text-sky-300 bg-sky-50/90 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/40'
            }`}
          >
            {isSecondary ? <AlertTriangle className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/90 dark:border-white/12 dark:bg-secondary/60 px-3 py-2.5 shadow-sm">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <TeamLogo team={game.awayTeam} size={26} />
            <span className="font-semibold text-[16px] text-gray-900 dark:text-gray-100 truncate">{(game.awayTeamFull ?? '').split(' ')[0]}</span>
          </div>
          <span className="h-px w-6 bg-gray-300 dark:bg-gray-600" />
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span className="font-semibold text-[16px] text-gray-900 dark:text-gray-100 truncate">{(game.homeTeamFull ?? '').split(' ')[0]}</span>
            <TeamLogo team={game.homeTeam} size={26} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[16px] font-semibold text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-secondary px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10">
              <CalendarDays className="w-3 h-3" />
              {formatSourceDate(game.sourceDate)}
            </span>
            <span className="inline-flex items-center text-[16px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-md">
              {leagueLabel}
            </span>
          </div>
          <div className="text-[16px] text-gray-600 dark:text-gray-200 leading-relaxed">
            <p className="truncate">{(game.stadium ?? '').replace('구장', '') || '구장 미정'}</p>
            <p className="text-[16px] font-semibold text-slate-500 dark:text-slate-300">선발 발표 전</p>
          </div>
        </div>

        <Button
          onClick={handleButtonClick}
          className="w-full h-9 text-[16px] font-bold bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
        >
          승부예측 하러가기
          <ArrowUpRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
}
