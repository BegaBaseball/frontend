export function resolveEvidenceSources(usedEvidence?: string[]): string[] {
    if (!Array.isArray(usedEvidence)) return [];

    const seen = new Set<string>();
    const normalized: string[] = [];

    usedEvidence.forEach((code) => {
        if (typeof code !== 'string') return;
        const trimmed = code.trim();
        if (!trimmed || seen.has(trimmed)) return;
        seen.add(trimmed);
        normalized.push(trimmed);
    });

    return normalized;
}

export function resolveCoachEvidenceCount({
    supportedFactCount,
    usedEvidence,
}: {
    supportedFactCount?: number;
    usedEvidence?: string[];
}): number {
    if (
        typeof supportedFactCount === 'number'
        && Number.isFinite(supportedFactCount)
        && supportedFactCount > 0
    ) {
        return supportedFactCount;
    }

    return resolveEvidenceSources(usedEvidence).length;
}
