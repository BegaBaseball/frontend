import TeamLogo from '../TeamLogo';

export interface TeamRankRowTeam {
  rank: number;
  teamId: string;
  displayName: string;
  winRate: string;
  wins: number;
  draws: number;
  losses: number;
  gamesBehind?: number;
}

interface TeamRankRowProps {
  team: TeamRankRowTeam;
  variant: 'compact' | 'rich';
  rowClassName?: string;
  sparkline?: ('W' | 'D' | 'L')[];
}

const SPARKLINE_COLORS: Record<'W' | 'D' | 'L', string> = {
  W: '#22c55e',
  D: '#eab308',
  L: '#ef4444',
};

const formatGamesBehind = (team: TeamRankRowTeam) => {
  if (team.gamesBehind == null) return null;
  if (team.rank === 1) return '-';
  return team.gamesBehind % 1 === 0 ? team.gamesBehind.toFixed(0) : team.gamesBehind.toFixed(1);
};

export default function TeamRankRow({
  team,
  variant,
  rowClassName = '',
  sparkline,
}: TeamRankRowProps) {
  const isTopThree = team.rank <= 3;
  const totalGames = Math.max(0, team.wins + team.draws + team.losses);
  const winsPercent = totalGames > 0 ? (team.wins / totalGames) * 100 : 0;
  const drawsPercent = totalGames > 0 ? (team.draws / totalGames) * 100 : 0;
  const lossesPercent = Math.max(0, 100 - winsPercent - drawsPercent);
  const gamesBehind = formatGamesBehind(team);

  if (variant === 'compact') {
    return (
      <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200/80 px-3 py-2.5 last:border-b-0 dark:border-zinc-800/80 ${isTopThree ? 'border-l border-l-[#2d5f4f]/40 dark:border-l-emerald-700/60' : ''} ${rowClassName}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`w-5 shrink-0 text-center text-15 font-black lg:text-17 ${isTopThree ? 'text-[#2d5f4f] dark:text-emerald-200' : 'text-zinc-500 dark:text-white'}`}>
            {team.rank}
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 p-1 shadow-sm dark:bg-white lg:h-10 lg:w-10">
            <TeamLogo team={team.displayName} teamId={team.teamId} size={28} className="object-contain" />
          </div>
          <span className="min-w-0 truncate text-15 font-black text-gray-900 dark:text-white lg:text-17">
            {team.displayName}
          </span>
        </div>
        <div className="text-right">
          <p className="text-15 font-black tabular-nums text-gray-900 dark:text-white lg:text-17">{team.winRate}</p>
          <p className="text-12 font-bold tabular-nums text-zinc-500 dark:text-white lg:text-13">
            {team.wins}승 {team.losses}패
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_120px] items-center gap-3 overflow-hidden border-b border-zinc-200/80 px-4 py-2 transition-colors last:border-b-0 hover:bg-slate-100 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40 xl:grid-cols-[minmax(0,1fr)_148px] ${rowClassName} ${isTopThree ? 'border-l border-l-[#2d5f4f]/40 dark:border-l-emerald-700/60' : ''}`}>
      <div className="min-w-0">
        <div className="mb-1 flex min-w-0 items-center gap-2">
          <span className={`w-6 shrink-0 text-center text-17 font-black ${isTopThree ? 'text-[#2d5f4f] dark:text-emerald-200' : 'text-zinc-500 dark:text-white'}`}>
            {team.rank}
          </span>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 p-1 shadow-sm dark:bg-white">
            <TeamLogo team={team.displayName} teamId={team.teamId} size={32} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-black leading-5 text-gray-900 dark:text-white">
              {team.displayName}
            </p>
            <p className="truncate whitespace-nowrap text-12 font-bold leading-4 text-zinc-500 dark:text-white">
              {totalGames}경기 · {gamesBehind == null ? '승차 없음' : `승차 ${gamesBehind}`}
            </p>
          </div>
        </div>
        <div
          role="img"
          aria-label={`${team.displayName} 시즌 전적 막대: ${team.wins}승 ${team.draws}무 ${team.losses}패`}
          className="ml-8 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          {totalGames > 0 ? (
            <div className="flex h-full w-full">
              <span className="h-full bg-[#2d5f4f]" style={{ width: `${winsPercent}%` }} />
              <span className="h-full bg-zinc-300 dark:bg-zinc-600" style={{ width: `${drawsPercent}%` }} />
              <span className="h-full bg-rose-300 dark:bg-rose-500/60" style={{ width: `${lossesPercent}%` }} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-17 font-black leading-6 tabular-nums text-gray-900 dark:text-white">{team.winRate}</p>
        <p className="mt-0.5 whitespace-nowrap text-12 font-bold leading-4 tabular-nums text-zinc-600 dark:text-white">
          {team.wins}승 · {team.draws}무 · {team.losses}패
        </p>
        {sparkline && sparkline.length > 0 && (
          <div className="mt-1.5 flex justify-end gap-[3px]">
            {sparkline.map((result, i) => (
              <span
                key={i}
                className="inline-block rounded-full"
                style={{ width: 6, height: 6, background: SPARKLINE_COLORS[result] }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
