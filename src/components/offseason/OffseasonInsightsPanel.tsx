import { useMemo } from 'react';

import { getTeamKoreanName } from '../../utils/teamNames';
import { Card } from '../ui/card';
import { Building2Icon, NewspaperIcon } from '../icons/PublicFeatureIcons';
import { OffseasonMovement } from './offseasonListTypes';
import { OffseasonPill, OffseasonSectionPill } from './offseasonUi';
import { formatDateLabel, getMovementSummary } from './offseasonListUtils';

export function OffseasonInsightsPanel({
    movements,
    onSelect,
}: {
    movements: OffseasonMovement[];
    onSelect: (movement: OffseasonMovement) => void;
}) {
    const teamSummary = useMemo(() => {
        return Array.from(
            movements.reduce((accumulator, movement) => {
                const teamName = getTeamKoreanName(movement.team);
                accumulator.set(teamName, (accumulator.get(teamName) ?? 0) + 1);
                return accumulator;
            }, new Map<string, number>()),
        )
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
            .slice(0, 4);
    }, [movements]);

    const sectionSummary = useMemo(() => {
        return Array.from(
            movements.reduce((accumulator, movement) => {
                accumulator.set(movement.section, (accumulator.get(movement.section) ?? 0) + 1);
                return accumulator;
            }, new Map<string, number>()),
        )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [movements]);

    const headlineSummary = useMemo(() => movements.filter((movement) => movement.isBigEvent).slice(0, 3), [movements]);
    const sectionMax = sectionSummary[0]?.[1] ?? 1;

    return (
        <section className="space-y-4">
            <div className="px-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">현재 필터 요약</h2>
                <p className="mt-1 text-[15px] font-semibold text-zinc-500 dark:text-white">
                    지금 보이는 결과 기준으로 가장 활발한 팀, 구분 비중, 주요 이적을 바로 훑어볼 수 있습니다.
                </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1.1fr]">
                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-white">
                                <Building2Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black uppercase tracking-[0.18em] text-zinc-400">Active Teams</p>
                                <p className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">가장 활발한 구단</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {teamSummary.map(([teamName, count], index) => (
                                <div
                                    key={teamName}
                                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-[14px] font-black text-white dark:bg-white dark:text-white">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="text-[15px] font-black tracking-tight text-zinc-900 dark:text-white">{teamName}</p>
                                            <p className="text-[14px] font-semibold text-zinc-400 dark:text-white">현재 조건 기준 이동 건수</p>
                                        </div>
                                    </div>
                                    <OffseasonPill className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[14px] font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                                        {count}건
                                    </OffseasonPill>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="space-y-4 p-5">
                        <div>
                            <p className="text-[14px] font-black uppercase tracking-[0.18em] text-zinc-400">Section Mix</p>
                            <p className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">구분별 비중</p>
                        </div>
                        <div className="space-y-3">
                            {sectionSummary.map(([section, count]) => (
                                <div key={section} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <OffseasonSectionPill section={section} />
                                        <span className="text-[14px] font-bold text-zinc-500 dark:text-white">{count}건</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <div
                                            className="h-2 rounded-full bg-[#173b34] dark:bg-emerald-300"
                                            style={{ width: `${Math.max((count / sectionMax) * 100, 10)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-white">
                                <NewspaperIcon className="h-5 w-5" />
                            </div>
                            <div>
                            <p className="text-[14px] font-black uppercase tracking-[0.18em] text-zinc-400">Headlines</p>
                                <p className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">지금 볼 만한 이동</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {headlineSummary.length > 0 ? headlineSummary.map((movement) => (
                                <button
                                    key={movement.id}
                                    type="button"
                                    onClick={() => onSelect(movement)}
                                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/20"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[14px] font-black uppercase tracking-[0.18em] text-zinc-400">
                                                {formatDateLabel(movement.date)}
                                            </p>
                                            <p className="mt-1 text-[15px] font-black tracking-tight text-zinc-900 dark:text-white">
                                                {movement.player} · {getTeamKoreanName(movement.team)}
                                            </p>
                                        </div>
                                        <OffseasonPill className="rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-[14px] font-black text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
                                            주요
                                        </OffseasonPill>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-relaxed text-zinc-600 dark:text-white">
                                        {getMovementSummary(movement)}
                                    </p>
                                </button>
                            )) : (
                                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-[15px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-white">
                                    현재 필터 조건에서는 주요 소식으로 분류된 이동이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </section>
    );
}
