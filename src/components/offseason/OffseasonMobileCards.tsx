import { CalendarDays, Info, TrendingUp } from 'lucide-react';

import { getTeamKoreanName } from '../../utils/teamNames';
import TeamLogo from '../TeamLogo';
import { OffseasonMovement } from './offseasonListTypes';
import { OffseasonPill, OffseasonSectionPill } from './offseasonUi';
import { formatDateLabel, formatRemarks, getDisplayAmount, getMovementSummary } from './offseasonListUtils';

export function OffseasonMobileCards({
    movements,
    onSelect,
}: {
    movements: OffseasonMovement[];
    onSelect: (movement: OffseasonMovement) => void;
}) {
    return (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {movements.map((item) => {
                const teamName = getTeamKoreanName(item.team);
                const amountLabel = getDisplayAmount(item);
                const summary = getMovementSummary(item);

                return (
                    <article
                        key={item.id}
                        className={`space-y-4 p-5 transition-colors ${item.isBigEvent ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-white dark:bg-zinc-900'}`}
                        tabIndex={0}
                        onClick={() => onSelect(item)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelect(item);
                            }
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                                    <TeamLogo team={teamName} size={32} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{teamName}</p>
                                        {item.isBigEvent && (
                                            <OffseasonPill className="rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-[14px] font-black text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
                                                주요
                                            </OffseasonPill>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{item.player}</h3>
                                </div>
                            </div>
                            <OffseasonSectionPill section={item.section} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-[14px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateLabel(item.date)}
                            </span>
                            {amountLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[14px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {amountLabel}
                            </span>
                            )}
                        </div>

                        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                            <p className="text-[15px] font-semibold leading-relaxed text-zinc-700 dark:text-zinc-300">
                                {formatRemarks(summary)}
                            </p>
                        </div>

                        <div className="flex items-center justify-between text-[14px] font-semibold text-zinc-400 dark:text-zinc-500">
                            <span className="inline-flex items-center gap-1">
                                <Info className="h-3.5 w-3.5" />
                                ID #{item.id}
                            </span>
                            <span>{item.team}</span>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
