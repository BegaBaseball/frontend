import { ArrowUpDownIcon, SparklesIcon } from '../icons/PublicFeatureIcons';
import { getTeamKoreanName } from '../../utils/teamNames';
import TeamLogo from '../TeamLogo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { OffseasonMovement, SORT_OPTIONS, SortOrder } from './offseasonListTypes';
import { OffseasonPill, OffseasonSectionPill } from './offseasonUi';
import { formatDateLabel, formatRemarks, getDisplayAmount, getMovementSummary } from './offseasonListUtils';

export function OffseasonDesktopTable({
    movements,
    sortOrder,
    onSortChange,
    onSelect,
}: {
    movements: OffseasonMovement[];
    sortOrder: SortOrder;
    onSortChange: (value: SortOrder) => void;
    onSelect: (movement: OffseasonMovement) => void;
}) {
    const headlineCount = movements.filter((item) => item.isBigEvent).length;
    const amountVisibleCount = movements.filter((item) => Boolean(getDisplayAmount(item))).length;
    const activeSortLabel = SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ?? '최신순';

    return (
        <div className="space-y-4 px-4 pb-4 pt-2 md:px-5 md:pb-5">
            <div className="flex items-center justify-between rounded-[28px] border border-zinc-200/80 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="space-y-1">
                    <p className="text-[15px] font-black uppercase tracking-[0.2em] text-zinc-400">Desktop Table View</p>
                    <p className="text-[15px] font-semibold text-zinc-600 dark:text-zinc-300">
                        헤드라인 {headlineCount}건, 금액 표기 {amountVisibleCount}건 포함
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <OffseasonPill className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[14px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                        정렬: {activeSortLabel}
                    </OffseasonPill>
                    <OffseasonPill className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[14px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        총 {movements.length}행
                    </OffseasonPill>
                </div>
            </div>

            <Table className="min-w-[860px] border-separate [border-spacing:0_10px] sm:min-w-full">
                <TableHeader className="sticky top-0 z-20 bg-transparent">
                    <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="h-auto w-[140px] px-2 py-0">
                            <button
                                type="button"
                                onClick={() => onSortChange('latest')}
                                className={`flex h-14 w-full items-center justify-between rounded-2xl border px-4 text-left transition-colors ${sortOrder === 'latest'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                                    : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                    }`}
                            >
                                <span className="space-y-1">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em]">Date</span>
                                    <span className="block text-[15px] font-bold">날짜</span>
                                </span>
                                <ArrowUpDownIcon className={`h-4 w-4 ${sortOrder === 'latest' ? 'opacity-100' : 'opacity-40'}`} />
                            </button>
                        </TableHead>
                        <TableHead className="h-auto w-[130px] px-2 py-0">
                            <div className="flex h-14 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                                <span className="space-y-1">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">Section</span>
                                    <span className="block text-[15px] font-bold text-zinc-700 dark:text-zinc-200">구분</span>
                                </span>
                            </div>
                        </TableHead>
                        <TableHead className="h-auto w-[220px] px-2 py-0">
                            <div className="flex h-14 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                                <span className="space-y-1">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">Club</span>
                                    <span className="block text-[15px] font-bold text-zinc-700 dark:text-zinc-200">팀</span>
                                </span>
                            </div>
                        </TableHead>
                        <TableHead className="h-auto w-[220px] px-2 py-0">
                            <div className="flex h-14 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                                <span className="space-y-1">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">Player</span>
                                    <span className="block text-[15px] font-bold text-zinc-700 dark:text-zinc-200">선수</span>
                                </span>
                            </div>
                        </TableHead>
                        <TableHead className="h-auto min-w-[340px] px-2 py-0">
                            <div className="flex h-14 items-center rounded-2xl border border-zinc-200 bg-white px-4 text-left dark:border-zinc-800 dark:bg-zinc-900">
                                <span className="space-y-1">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">Details</span>
                                    <span className="block text-[15px] font-bold text-zinc-700 dark:text-zinc-200">계약 내용</span>
                                </span>
                            </div>
                        </TableHead>
                        <TableHead className="h-auto w-[170px] px-2 py-0">
                            <button
                                type="button"
                                onClick={() => onSortChange('amount')}
                                className={`ml-auto flex h-14 w-full items-center justify-between rounded-2xl border px-4 text-right transition-colors ${sortOrder === 'amount'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
                                    : 'border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                    }`}
                            >
                                <span className="space-y-1 text-right">
                                    <span className="block text-[14px] font-black uppercase tracking-[0.2em]">Amount</span>
                                    <span className="block text-[15px] font-bold">금액</span>
                                </span>
                                <ArrowUpDownIcon className={`h-4 w-4 ${sortOrder === 'amount' ? 'opacity-100' : 'opacity-40'}`} />
                            </button>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movements.map((item) => {
                        const teamName = getTeamKoreanName(item.team);
                        const amountLabel = getDisplayAmount(item);
                        const summary = getMovementSummary(item);

                        return (
                            <TableRow
                                key={item.id}
                                className="group cursor-pointer border-none hover:bg-transparent"
                                tabIndex={0}
                                onClick={() => onSelect(item)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelect(item);
                                    }
                                }}
                            >
                                <TableCell className={`rounded-l-[26px] border-y border-l px-5 py-4 align-top ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90'
                                    }`}>
                                    <div className="relative pl-4">
                                        <span className={`absolute left-0 top-0 h-full w-1 rounded-full ${item.isBigEvent ? 'bg-yellow-400' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
                                        <div className="space-y-2">
                                            <p className="text-[14px] font-black uppercase tracking-[0.2em] text-zinc-400">
                                                {item.isBigEvent ? 'Headline' : 'Update'}
                                            </p>
                                            <p className="text-[15px] font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
                                                {formatDateLabel(item.date)}
                                            </p>
                                            <p className="text-[14px] font-semibold text-zinc-400 dark:text-zinc-500">ID #{item.id}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={`border-y px-3 py-4 align-top ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90'
                                    }`}>
                                    <OffseasonSectionPill section={item.section} />
                                </TableCell>
                                <TableCell className={`border-y px-3 py-4 align-top ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                                            <TeamLogo team={teamName} size={28} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[15px] font-extrabold tracking-tight text-zinc-800 dark:text-zinc-100">{teamName}</p>
                                            <p className="text-[14px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{item.team}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className={`border-y px-3 py-4 align-top ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90'
                                    }`}>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50">{item.player}</span>
                                            {item.isBigEvent && (
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400/90 text-[#173b34] shadow-sm">
                                                    <SparklesIcon className="h-3.5 w-3.5" />
                                                </span>
                                            )}
                                        </div>
                                        {item.isBigEvent && (
                                                <OffseasonPill className="rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-[14px] font-black text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
                                                    헤드라인 이동
                                                </OffseasonPill>
                                            )}
                                    </div>
                                </TableCell>
                                <TableCell className={`border-y px-3 py-4 align-top text-[15px] font-semibold leading-relaxed ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 text-zinc-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-zinc-200'
                                    : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-300'
                                    }`}>
                                    <div className="space-y-2">
                                        <p className="text-[15px] font-black uppercase tracking-[0.18em] text-zinc-400">Summary</p>
                                        <div className="line-clamp-2">{formatRemarks(summary)}</div>
                                    </div>
                                </TableCell>
                                <TableCell className={`rounded-r-[26px] border-y border-r px-5 py-4 align-top text-right ${item.isBigEvent
                                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/90'
                                    }`}>
                                    <div className="space-y-2">
                                        <p className="text-[14px] font-black uppercase tracking-[0.18em] text-zinc-400">Deal Value</p>
                                        <div className={`inline-flex rounded-2xl px-3 py-2 text-[15px] font-black tracking-tight ${amountLabel
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                            }`}>
                                            {amountLabel || '비공개'}
                                        </div>
                                        <p className="text-[14px] font-semibold text-zinc-400 dark:text-zinc-500">
                                            {item.team}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
