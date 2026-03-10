import { OffseasonMovement, SectionFilter } from './offseasonListTypes';

const MONEY_TEXT_PATTERN = /(?:\d+\s*년\s*)?\d+(?:,\d+)*\s*(?:억|만\s*원|만\s*달러|달러)/;

const trimToText = (value?: string | null) => {
    if (!value) {
        return '';
    }

    return value.trim();
};

export const getSectionColor = (section: string) => {
    const normalized = section?.toUpperCase() || '';

    if (normalized.includes('FA')) {
        return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200';
    }
    if (normalized.includes('트레이드')) {
        return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200';
    }
    if (normalized.includes('외국인') || normalized.includes('용병')) {
        return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200';
    }
    if (normalized.includes('방출') || normalized.includes('웨이버')) {
        return 'border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200';
    }
    if (normalized.includes('군') || normalized.includes('상무') || normalized.includes('입대') || normalized.includes('전역')) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200';
    }

    return 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';
};

export const formatRemarks = (text?: string | null) => {
    const normalized = trimToText(text);

    if (!normalized) {
        return <span className="italic text-zinc-400">세부 내용이 아직 등록되지 않았습니다.</span>;
    }

    const parts = normalized.split(MONEY_TEXT_PATTERN);
    const matches = normalized.match(new RegExp(MONEY_TEXT_PATTERN, 'g')) ?? [];
    const merged: string[] = [];

    parts.forEach((part, index) => {
        merged.push(part);

        if (matches[index]) {
            merged.push(matches[index]);
        }
    });

    return (
        <span className="leading-relaxed">
            {merged.map((part, index) => {
                if (MONEY_TEXT_PATTERN.test(part)) {
                    return (
                        <span
                            key={`${part}-${index}`}
                            className="font-semibold text-emerald-700 underline decoration-emerald-300/70 underline-offset-4 dark:text-emerald-300"
                        >
                            {part}
                        </span>
                    );
                }

                return <span key={`${part}-${index}`}>{part}</span>;
            })}
        </span>
    );
};

export const matchesSectionFilter = (section: string, filter: SectionFilter) => {
    if (filter === 'ALL') {
        return true;
    }

    const normalized = section?.toUpperCase() || '';

    switch (filter) {
        case 'FA':
            return normalized.includes('FA');
        case 'TRADE':
            return normalized.includes('트레이드');
        case 'FOREIGN':
            return normalized.includes('외국인') || normalized.includes('용병');
        case 'RELEASE':
            return normalized.includes('방출') || normalized.includes('웨이버');
        case 'MILITARY':
            return normalized.includes('군') || normalized.includes('상무') || normalized.includes('입대') || normalized.includes('전역');
        default:
            return true;
    }
};

export const toDateValue = (value: string) => {
    if (!value) {
        return 0;
    }

    return new Date(`${value}T00:00:00`).getTime();
};

export const formatDateLabel = (value: string) => {
    const [year, month, day] = value.split('-');

    if (!year || !month || !day) {
        return value;
    }

    return `${year}.${month}.${day}`;
};

export const formatDateTimeLabel = (value?: string | null) => {
    const normalized = trimToText(value);

    if (!normalized) {
        return '';
    }

    const [datePart, timePart = ''] = normalized.split('T');
    const dateLabel = formatDateLabel(datePart);

    if (!timePart) {
        return dateLabel;
    }

    const [hour = '', minute = ''] = timePart.split(':');

    if (!hour || !minute) {
        return normalized;
    }

    return `${dateLabel} ${hour}:${minute}`;
};

export const getMovementSummary = (movement: OffseasonMovement) => {
    const summary = trimToText(movement.summary);

    if (summary) {
        return summary;
    }

    const remarks = trimToText(movement.remarks);

    if (remarks) {
        return remarks;
    }

    return '세부 내용 준비 중';
};

export const getDisplayAmount = (movement: OffseasonMovement) => {
    if (trimToText(movement.displayAmount)) {
        return trimToText(movement.displayAmount);
    }

    if (trimToText(movement.contractValue)) {
        return trimToText(movement.contractValue);
    }

    const matchedAmount = movement.remarks?.match(MONEY_TEXT_PATTERN)?.[0];

    if (matchedAmount) {
        return matchedAmount;
    }

    if ((movement.estimatedAmount ?? 0) > 0) {
        return `${movement.estimatedAmount}억`;
    }

    return '';
};
