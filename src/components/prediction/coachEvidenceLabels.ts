import { resolveEvidenceSources } from './coachEvidenceCore';

export {
    resolveCoachEvidenceCount,
    resolveEvidenceSources,
} from './coachEvidenceCore';

export type EvidenceSourceCategoryId =
    | 'game'
    | 'lineup'
    | 'team'
    | 'opponent'
    | 'comparison'
    | 'situation'
    | 'other';

export interface EvidenceSourceMetadata {
    code: string;
    label: string;
    description: string;
    category: EvidenceSourceCategoryId;
    sortOrder: number;
}

export interface EvidenceSourceGroup {
    category: EvidenceSourceCategoryId;
    title: string;
    items: EvidenceSourceMetadata[];
}

type EvidenceSourceDataQuality = 'grounded' | 'partial' | 'insufficient';

const EVIDENCE_CATEGORY_PRIORITY: Record<EvidenceSourceCategoryId, number> = {
    game: 10,
    lineup: 20,
    team: 30,
    opponent: 40,
    comparison: 50,
    situation: 60,
    other: 999,
};

const CORE_EVIDENCE_COUNT_BY_QUALITY: Record<EvidenceSourceDataQuality, number> = {
    grounded: 5,
    partial: 4,
    insufficient: 3,
};

const DEFAULT_MIN_CORE_EVIDENCE_COUNT = 2;
const DEFAULT_MAX_CORE_EVIDENCE_COUNT = 8;

const EVIDENCE_SOURCE_CATEGORIES: ReadonlyArray<EvidenceSourceCategoryId> = [
    'game',
    'lineup',
    'team',
    'opponent',
    'comparison',
    'situation',
    'other',
];

const EVIDENCE_CATEGORY_LABELS: Record<EvidenceSourceCategoryId, string> = {
    game: '경기 데이터',
    lineup: '선수 구성',
    team: '팀 전력',
    opponent: '상대팀 근거',
    comparison: '상대 전력 비교',
    situation: '승부처',
    other: '기타 근거',
};

/**
 * 코치 분석 `used_evidence` 소스 코드 → 라벨/설명/카테고리/정렬우선순위.
 * 백엔드에서 내려오는 코드 문자열은 그대로 표시하지 말고 사람이 읽기 쉬운 형태로 전개한다.
 */
export const EVIDENCE_SOURCE_METADATA: Record<string, Omit<EvidenceSourceMetadata, 'code'>> = {
    game: {
        label: '경기 자체',
        description: '동일 경기의 스코어/이닝 흐름/상대전 기록을 기본으로 반영합니다.',
        category: 'game',
        sortOrder: 10,
    },
    kbo_seasons: {
        label: 'KBO 시즌 흐름',
        description: '동일 리그 시즌 구간에서 반복되는 상위 확률 신호를 반영합니다.',
        category: 'game',
        sortOrder: 20,
    },
    game_metadata: {
        label: '경기 메타데이터',
        description: '구장, 상대, 시간대 같은 환경 요소를 반영합니다.',
        category: 'game',
        sortOrder: 30,
    },
    game_lineups: {
        label: '경기 라인업',
        description: '최신 라인업 입력값으로 타선·수비 구성이 어떻게 바뀌었는지 반영합니다.',
        category: 'lineup',
        sortOrder: 40,
    },
    home_lineup: {
        label: '홈 라인업',
        description: '홈팀 라인업 구성에서 장타/주루 흐름을 반영합니다.',
        category: 'lineup',
        sortOrder: 50,
    },
    away_lineup: {
        label: '원정 라인업',
        description: '원정팀 라인업 구성에서 상대전 투입/운용 지표를 반영합니다.',
        category: 'lineup',
        sortOrder: 60,
    },
    home_pitcher: {
        label: '홈 선발',
        description: '홈팀 선발투수의 컨디션·제구·최근 구위 기반 신호를 반영합니다.',
        category: 'lineup',
        sortOrder: 70,
    },
    away_pitcher: {
        label: '원정 선발',
        description: '원정팀 선발투수의 제구·대비전 기록을 반영합니다.',
        category: 'lineup',
        sortOrder: 80,
    },
    game_summary: {
        label: '경기 요약',
        description: '직전 경기의 핵심 장면 요약 지표를 근거로 사용합니다.',
        category: 'game',
        sortOrder: 90,
    },
    player_form_signals: {
        label: '선수 폼 신호',
        description: '개별 선수의 최근 성적 변화를 포인트화한 데이터로 반영합니다.',
        category: 'lineup',
        sortOrder: 100,
    },
    team_summary: {
        label: '팀 요약',
        description: '최근 경기에서 팀 단위 안정성/득점 패턴을 요약한 값을 반영합니다.',
        category: 'team',
        sortOrder: 110,
    },
    team_advanced_metrics: {
        label: '팀 고급 지표',
        description: '공격/수비 효율성 등 고급 지표 편차를 반영합니다.',
        category: 'team',
        sortOrder: 120,
    },
    team_player_form_signals: {
        label: '팀 선수 폼',
        description: '팀 내 핵심 타자·수비수 최근 폼 변화를 반영합니다.',
        category: 'team',
        sortOrder: 130,
    },
    team_recent_form: {
        label: '팀 최근 흐름',
        description: '팀의 연속 경기 흐름(승패·득실) 기반 시그널을 반영합니다.',
        category: 'team',
        sortOrder: 140,
    },
    opponent_team_summary: {
        label: '상대 팀 요약',
        description: '상대팀 전반적 안정성/공격 패턴을 요약한 수치를 반영합니다.',
        category: 'opponent',
        sortOrder: 150,
    },
    opponent_team_advanced_metrics: {
        label: '상대 팀 고급 지표',
        description: '상대의 고급 지표 대비 우위/열위 포인트를 반영합니다.',
        category: 'opponent',
        sortOrder: 160,
    },
    opponent_player_form_signals: {
        label: '상대 선수 폼',
        description: '상대 핵심 선수의 최근 수치 변화를 반영합니다.',
        category: 'opponent',
        sortOrder: 170,
    },
    opponent_recent_form: {
        label: '상대 최근 흐름',
        description: '상대팀의 최근 경기 흐름(승부·득실)을 반영합니다.',
        category: 'opponent',
        sortOrder: 180,
    },
    head_to_head: {
        label: '맞대결',
        description: '양 팀의 최근 상호전 데이터를 반영합니다.',
        category: 'comparison',
        sortOrder: 190,
    },
    matchup_history: {
        label: '과거 매치업',
        description: '직전 교차 대결 이력/특정 패턴을 반영합니다.',
        category: 'comparison',
        sortOrder: 200,
    },
    series_context: {
        label: '시리즈 맥락',
        description: '직전 시리즈 흐름(홈/원정 포인트, 승부 패턴)을 반영합니다.',
        category: 'comparison',
        sortOrder: 210,
    },
    series_history: {
        label: '시리즈 전력 전개',
        description: '시리즈 누적 승부 흐름과 연속 전개 변화를 반영합니다.',
        category: 'comparison',
        sortOrder: 220,
    },
    game_clutch_moments: {
        label: '승부처 장면',
        description: '승패를 가른 중요 장면(점수 변동 구간) 중심 데이터를 반영합니다.',
        category: 'situation',
        sortOrder: 230,
    },
    clutch_moments: {
        label: '승부처 기록',
        description: '승패를 가른 핵심 장면 집계를 보조 근거로 반영합니다.',
        category: 'situation',
        sortOrder: 231,
    },
    matchup: {
        label: '과거 맞대결',
        description: '양 팀의 최근 상호전 이력을 비교 기준으로 반영합니다.',
        category: 'comparison',
        sortOrder: 231,
    },
};

const UNKNOWN_EVIDENCE_SORT_ORDER = 999;

export const EVIDENCE_SOURCE_LABELS = Object.fromEntries(
    Object.entries(EVIDENCE_SOURCE_METADATA).map(([code, value]) => [code, value.label]),
);

function normalizeEvidenceCode(code: string): string {
    return code.trim();
}

function fallbackEvidenceLabel(code: string): string {
    return normalizeEvidenceCode(code)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b([a-z])([a-zA-Z0-9]*)/g, (_match, first, rest) => `${first.toUpperCase()}${rest}`);
}

function fallbackEvidenceDescription(code: string): string {
    const label = evidenceSourceLabel(code);
    return `${label || '미확인 근거'} 항목을 보조 근거로 반영했습니다.`;
}

function normalizeEvidenceImpactSignals(values?: string[] | null): number {
    return Array.isArray(values)
        ? values.filter((value): value is string => typeof value === 'string' && value.length > 0).length
        : 0;
}

function calculateCoreEvidencePenalty(warningCount: number, reasonCount: number): number {
    const issueCount = Math.max(0, warningCount) + Math.max(0, reasonCount);
    if (issueCount >= 4) return 2;
    if (issueCount >= 1) return 1;
    return 0;
}

function clampCoreEvidenceLimit(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function evidenceSourceLabel(code: string): string {
    const normalizedCode = normalizeEvidenceCode(code);
    return EVIDENCE_SOURCE_METADATA[normalizedCode]?.label ?? fallbackEvidenceLabel(normalizedCode);
}

export function getEvidenceSourceMeta(code: string): EvidenceSourceMetadata {
    const normalizedCode = normalizeEvidenceCode(code);
    const metadata = EVIDENCE_SOURCE_METADATA[normalizedCode];
    return {
        code: normalizedCode,
        label: metadata?.label ?? fallbackEvidenceLabel(normalizedCode),
        description: metadata?.description ?? fallbackEvidenceDescription(normalizedCode),
        category: metadata?.category ?? 'other',
        sortOrder: metadata?.sortOrder ?? UNKNOWN_EVIDENCE_SORT_ORDER,
    };
}

export function pickCoreEvidenceCodes(
    usedEvidence: string[] | undefined,
    options?: {
        dataQuality?: EvidenceSourceDataQuality | undefined;
        groundingWarnings?: string[] | undefined;
        groundingReasons?: string[] | undefined;
        minCount?: number | undefined;
        maxCount?: number | undefined;
    },
): string[] {
    const evidenceSources = resolveEvidenceSources(usedEvidence);
    if (evidenceSources.length === 0) return [];

    const warningCount = normalizeEvidenceImpactSignals(options?.groundingWarnings);
    const reasonCount = normalizeEvidenceImpactSignals(options?.groundingReasons);
    const penalty = calculateCoreEvidencePenalty(warningCount, reasonCount);

    const quality = options?.dataQuality === 'partial' || options?.dataQuality === 'insufficient' || options?.dataQuality === 'grounded'
        ? options.dataQuality
        : 'grounded';

    const baseLimit = CORE_EVIDENCE_COUNT_BY_QUALITY[quality];
    const minCount = options?.minCount ?? DEFAULT_MIN_CORE_EVIDENCE_COUNT;
    const maxCount = options?.maxCount ?? DEFAULT_MAX_CORE_EVIDENCE_COUNT;
    const targetCount = clampCoreEvidenceLimit(baseLimit - penalty, minCount, maxCount);
    const limit = Math.min(evidenceSources.length, targetCount);

    if (limit <= 0) return [];

    const prioritized = evidenceSources
        .map((code) => getEvidenceSourceMeta(code))
        .sort((a, b) => {
            const categoryWeight = EVIDENCE_CATEGORY_PRIORITY[a.category] - EVIDENCE_CATEGORY_PRIORITY[b.category];
            if (categoryWeight !== 0) return categoryWeight;
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.label.localeCompare(b.label, 'ko');
        });

    return prioritized.slice(0, limit).map((item) => item.code);
}

export function getEvidenceSourceCategoryLabel(category: EvidenceSourceCategoryId): string {
    return EVIDENCE_CATEGORY_LABELS[category];
}

export function getEvidenceSourceGroups(codes: string[]): EvidenceSourceGroup[] {
    const seen = new Set<string>();
    const grouped: Map<EvidenceSourceCategoryId, EvidenceSourceMetadata[]> = new Map();

    codes.forEach((code) => {
        const normalized = normalizeEvidenceCode(String(code || ''));
        if (!normalized) return;
        if (seen.has(normalized)) return;
        seen.add(normalized);

        const meta = getEvidenceSourceMeta(normalized);
        const list = grouped.get(meta.category) ?? [];
        list.push(meta);
        grouped.set(meta.category, list);
    });

    const groups = EVIDENCE_SOURCE_CATEGORIES
        .map((category): EvidenceSourceGroup | null => {
            const items = grouped.get(category);
            if (!items || items.length === 0) return null;
            return {
                category,
                title: EVIDENCE_CATEGORY_LABELS[category],
                items: items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
            };
        })
        .filter((item): item is EvidenceSourceGroup => item !== null);

    const leftover = Array.from(grouped.entries())
        .filter(([category]) => !EVIDENCE_SOURCE_CATEGORIES.includes(category))
        .flatMap(([, items]) => items)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

    if (leftover.length > 0) {
        groups.push({
            category: 'other',
            title: EVIDENCE_CATEGORY_LABELS.other,
            items: leftover,
        });
    }

    return groups;
}
