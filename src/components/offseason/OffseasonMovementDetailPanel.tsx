import { Sparkles } from 'lucide-react';

import { getTeamKoreanName } from '../../utils/teamNames';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '../ui/drawer';
import TeamLogo from '../TeamLogo';
import { OffseasonMovement } from './offseasonListTypes';
import { formatDateLabel, formatDateTimeLabel, formatRemarks, getDisplayAmount, getMovementSummary, getSectionColor } from './offseasonListUtils';

export function OffseasonMovementDetailPanel({
    movement,
    isMobile,
    open,
    onOpenChange,
}: {
    movement: OffseasonMovement | null;
    isMobile: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    if (!movement) {
        return null;
    }

    const teamName = getTeamKoreanName(movement.team);
    const amountLabel = getDisplayAmount(movement);
    const statusLabel = movement.isBigEvent ? '주요 소식' : '일반 업데이트';
    const summary = getMovementSummary(movement);
    const remarks = movement.remarks?.trim() ?? '';
    const sourceUrl = movement.sourceUrl?.trim() ?? '';
    const sourceFacts = [
        { label: '출처', value: movement.sourceLabel?.trim() ?? '' },
        { label: '발표 시각', value: formatDateTimeLabel(movement.announcedAt) },
    ].filter((item) => item.value);
    const detailFacts = [
        { label: '계약 기간', value: movement.contractTerm?.trim() ?? '' },
        { label: '계약 규모', value: movement.contractValue?.trim() ?? '' },
        { label: '옵션', value: movement.optionDetails?.trim() ?? '' },
        {
            label: '상대 구단',
            value: movement.counterpartyTeam?.trim()
                ? `${getTeamKoreanName(movement.counterpartyTeam)} (${movement.counterpartyTeam.trim()})`
                : '',
        },
        { label: '반대급부', value: movement.counterpartyDetails?.trim() ?? '' },
    ].filter((item) => item.value);
    const hasStructuredFacts = detailFacts.length > 0;
    const hasSourceFacts = sourceFacts.length > 0 || Boolean(sourceUrl);
    const showRawRemarks = remarks && remarks !== summary;
    const body = (
        <div className="space-y-5">
            <div className="rounded-[28px] border border-emerald-200/80 bg-[#173b34] p-5 text-white shadow-[0_24px_60px_-36px_rgba(16,37,32,0.95)] dark:border-emerald-950/40 dark:bg-[#173b34]">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.08] p-3 shadow-sm backdrop-blur-sm">
                            <TeamLogo team={teamName} size={40} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${getSectionColor(movement.section)}`}>
                                    {movement.section}
                                </Badge>
                                <Badge className="rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[10px] font-bold text-emerald-50">
                                    {statusLabel}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/65">{teamName}</p>
                                <h3 className="mt-1 text-2xl font-black tracking-tight text-white">{movement.player}</h3>
                            </div>
                        </div>
                    </div>
                    {movement.isBigEvent && (
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-[#173b34] shadow-sm">
                            <Sparkles className="h-5 w-5" />
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {[
                    { label: '이동 날짜', value: formatDateLabel(movement.date) },
                    { label: '팀', value: `${teamName} (${movement.team})` },
                    { label: '계약 금액', value: amountLabel || '비공개 또는 파싱 불가' },
                    { label: '분류 상태', value: statusLabel },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70"
                    >
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-900 dark:text-zinc-50">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Summary</p>
                <div className="mt-3 text-sm font-medium leading-7 text-zinc-700 dark:text-zinc-200">
                    {formatRemarks(summary)}
                </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Structured Details</p>
                        <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">수집된 상세 데이터</p>
                    </div>
                    {hasStructuredFacts && (
                        <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                            {detailFacts.length}개 항목
                        </Badge>
                    )}
                </div>
                {hasStructuredFacts ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {detailFacts.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/80"
                            >
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-900 dark:text-zinc-50">{item.value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-300">
                        계약 조건, 상대 구단, 반대급부 같은 구조화 필드는 아직 등록되지 않았습니다.
                    </p>
                )}
            </div>

            {showRawRemarks && (
                <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Raw Notes</p>
                    <div className="mt-3 text-sm font-medium leading-7 text-zinc-700 dark:text-zinc-200">
                        {formatRemarks(remarks)}
                    </div>
                </div>
            )}

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Source</p>
                        <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">출처 정보</p>
                    </div>
                    {hasSourceFacts && (
                        <Badge className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                            확인 가능
                        </Badge>
                    )}
                </div>
                {hasSourceFacts ? (
                    <div className="mt-4 space-y-3">
                        {sourceFacts.map((item) => (
                            <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                                <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-900 dark:text-zinc-50">{item.value}</p>
                            </div>
                        ))}
                        {sourceUrl && (
                            <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-900/60 dark:hover:text-emerald-200"
                            >
                                원문 출처 열기
                            </a>
                        )}
                    </div>
                ) : (
                    <p className="mt-4 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-300">
                        구단 발표명, 기사 링크, 발표 시각이 아직 수집되지 않았습니다.
                    </p>
                )}
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        데이터 ID #{movement.id}
                    </Badge>
                    <Badge className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        팀 코드 {movement.team}
                    </Badge>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-500 dark:text-zinc-300">
                    상세 패널은 요약, 계약 구조, 출처, 원문 메모를 분리해서 보여주도록 확장되었습니다.
                </p>
            </div>

            <div className="flex justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-5">
                    닫기
                </Button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[90vh] rounded-t-[32px] border-zinc-200 bg-white px-4 pb-6 dark:border-zinc-800 dark:bg-zinc-950">
                    <DrawerHeader className="px-1 pb-4 pt-6 text-left">
                        <DrawerTitle className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                            이적 상세 정보
                        </DrawerTitle>
                        <DrawerDescription className="text-sm font-medium text-zinc-500 dark:text-zinc-300">
                            선택한 선수 이동의 요약, 계약 구조, 출처 정보를 한 번에 확인할 수 있습니다.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-1 pb-2">{body}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-[32px] border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                        이적 상세 정보
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium text-zinc-500 dark:text-zinc-300">
                        선택한 선수 이동의 요약, 원문 메모, 구조화 필드, 출처를 한 번에 확인할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>
                {body}
            </DialogContent>
        </Dialog>
    );
}
