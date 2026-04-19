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
}

const formatGamesBehind = (team: TeamRankRowTeam) => {
  if (team.gamesBehind == null) return null;
  if (team.rank === 1) return '-';
  return team.gamesBehind % 1 === 0 ? team.gamesBehind.toFixed(0) : team.gamesBehind.toFixed(1);
};

export default function TeamRankRow({
  team,
  variant,
  rowClassName = '',
}: TeamRankRowProps) {
  const isTopThree = team.rank <= 3;
  const totalGames = Math.max(0, team.wins + team.draws + team.losses);
  const winsPercent = totalGames > 0 ? (team.wins / totalGames) * 100 : 0;
  const drawsPercent = totalGames > 0 ? (team.draws / totalGames) * 100 : 0;
  const lossesPercent = Math.max(0, 100 - winsPercent - drawsPercent);
  const gamesBehind = formatGamesBehind(team);

  if (variant === 'compact') {
    return (
      <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200/80 px-3 py-2.5 last:border-b-0 dark:border-zinc-800/80 ${rowClassName}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`w-5 shrink-0 text-center text-[15px] font-black ${isTopThree ? 'text-[#2ecc71]' : 'text-zinc-500 dark:text-zinc-500'}`}>
            {team.rank}
          </span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 p-1 shadow-sm dark:bg-white">
            <TeamLogo team={team.displayName} teamId={team.teamId} size={24} className="object-contain" />
          </div>
          <span className="min-w-0 truncate text-[15px] font-black text-gray-900 dark:text-zinc-100">
            {team.displayName}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-black tabular-nums text-gray-900 dark:text-white">{team.winRate}</p>
          <p className="text-[12px] font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
            {team.wins}승 {team.losses}패
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group grid min-w-0 grid-cols-[minmax(0,1fr)_132px] items-center gap-3 border-b border-zinc-200/80 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-slate-100 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40 ${rowClassName} ${isTopThree ? 'border-l border-l-[#2ecc71]/40' : ''}`}>
      <div className="min-w-0">
        <div className="mb-1.5 flex min-w-0 items-center gap-2">
          <span className={`w-5 shrink-0 text-center text-[15px] font-black ${isTopThree ? 'text-[#2ecc71]' : 'text-zinc-500 dark:text-zinc-500'}`}>
            {team.rank}
          </span>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 p-1.5 shadow-sm dark:bg-white">
            <TeamLogo team={team.displayName} teamId={team.teamId} size={28} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black leading-5 text-gray-900 dark:text-zinc-100">
              {team.displayName}
            </p>
            <p className="text-[12px] font-bold leading-4 text-zinc-500 dark:text-zinc-400">
              {totalGames}경기 · {gamesBehind == null ? '승차 없음' : `승차 ${gamesBehind}`}
            </p>
          </div>
        </div>
        <div
          role="img"
          aria-label={`${team.displayName} 시즌 전적 막대: ${team.wins}승 ${team.draws}무 ${team.losses}패`}
          className="ml-7 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          {totalGames > 0 ? (
            <div className="flex h-full w-full">
              <span className="h-full bg-[#2ecc71]" style={{ width: `${winsPercent}%` }} />
              <span className="h-full bg-zinc-300 dark:bg-zinc-600" style={{ width: `${drawsPercent}%` }} />
              <span className="h-full bg-rose-300 dark:bg-rose-500/60" style={{ width: `${lossesPercent}%` }} />
            </div>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[16px] font-black leading-5 tabular-nums text-gray-900 dark:text-white">{team.winRate}</p>
        <p className="mt-1 text-[12px] font-bold tabular-nums text-zinc-600 dark:text-zinc-300">
          {team.wins}승 · {team.draws}무 · {team.losses}패
        </p>
      </div>
    </div>
  );
}
