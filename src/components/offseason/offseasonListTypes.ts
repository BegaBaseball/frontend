export interface OffseasonMovement {
    id: number;
    date: string;
    section: string;
    team: string;
    player: string;
    summary?: string | null;
    remarks: string;
    contractTerm?: string | null;
    contractValue?: string | null;
    optionDetails?: string | null;
    counterpartyTeam?: string | null;
    counterpartyDetails?: string | null;
    sourceLabel?: string | null;
    sourceUrl?: string | null;
    announcedAt?: string | null;
    isBigEvent: boolean;
    estimatedAmount: number;
    displayAmount?: string | null;
}

export type SortOrder = 'latest' | 'amount' | 'headline';
export type SectionFilter = 'ALL' | 'FA' | 'TRADE' | 'FOREIGN' | 'RELEASE' | 'MILITARY';

export const TEAM_FILTER_ALL = 'ALL_TEAMS';

export const SECTION_FILTER_OPTIONS: Array<{ value: SectionFilter; label: string }> = [
    { value: 'ALL', label: '전체' },
    { value: 'FA', label: 'FA' },
    { value: 'TRADE', label: '트레이드' },
    { value: 'FOREIGN', label: '외국인' },
    { value: 'RELEASE', label: '방출/웨이버' },
    { value: 'MILITARY', label: '군 관련' },
];

export const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
    { value: 'latest', label: '최신순' },
    { value: 'amount', label: '금액순' },
    { value: 'headline', label: '헤드라인순' },
];
