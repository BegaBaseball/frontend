import { resolveTeamDisplayName } from '../components/TeamLogo';
import { getFullTeamName, TEAM_NAME_TO_ID, TEAM_ID_TO_CODE } from '../constants/teams';

export const getRankingDisplayName = (teamId: string, teamName: string): string => {
    const normalizedTeamId = (teamId || '').trim().toUpperCase();
    const normalizedTeamName = (teamName || '').trim();

    if (normalizedTeamId) {
        const mappedById = getFullTeamName(normalizedTeamId);
        if (mappedById) {
            return mappedById;
        }
    }

    if (normalizedTeamName) {
        const mappedTeamIdByName = TEAM_NAME_TO_ID[normalizedTeamName] || TEAM_NAME_TO_ID[normalizedTeamName.toUpperCase()];
        if (mappedTeamIdByName) {
            const mappedByName = getFullTeamName(mappedTeamIdByName);
            if (mappedByName) {
                return mappedByName;
            }
        }

        const normalizedTeamNameUpper = normalizedTeamName.toUpperCase();
        const mappedByName = getFullTeamName(normalizedTeamNameUpper);
        if (mappedByName && normalizedTeamName !== mappedByName) {
            return mappedByName;
        }

        if (/[가-힣]/.test(normalizedTeamName)) {
            return normalizedTeamName;
        }
    }

    const normalizedTeamNameForCode = normalizedTeamName.toUpperCase();
    const isAllCapsCode = /^[A-Z]{2,10}$/.test(normalizedTeamNameForCode);
    if (isAllCapsCode) {
        const mappedByNameCode = getFullTeamName(normalizedTeamNameForCode);
        return mappedByNameCode || (normalizedTeamId || normalizedTeamName);
    }

    return normalizedTeamName || normalizedTeamId;
};

export const getMateTeamDisplayName = (teamName: string): string => {
    const normalizedTeamName = (teamName || '').trim();
    if (!normalizedTeamName) return '';
    const normalizedTeamNameLower = normalizedTeamName.toLowerCase();

    const resolvedTeamName = resolveTeamDisplayName(normalizedTeamName);
    if (resolvedTeamName && resolvedTeamName !== normalizedTeamName) {
        return resolvedTeamName;
    }

    const directMapped = getFullTeamName(normalizedTeamName);
    if (directMapped && directMapped !== normalizedTeamName) {
        return directMapped;
    }

    const mappedTeamId = TEAM_NAME_TO_ID[normalizedTeamName] || TEAM_NAME_TO_ID[normalizedTeamName.toUpperCase()];
    if (mappedTeamId) {
        return getFullTeamName(mappedTeamId);
    }

    const mappedTeamIdByCode = TEAM_ID_TO_CODE[normalizedTeamName.toLowerCase()];
    if (mappedTeamIdByCode) {
        return getFullTeamName(mappedTeamIdByCode);
    }

    const normalizedWithoutSpace = normalizedTeamName.replace(/\s+/g, '');
    const mappedByNoSpace = getFullTeamName(normalizedWithoutSpace);
    if (mappedByNoSpace && mappedByNoSpace !== normalizedWithoutSpace) {
        return mappedByNoSpace;
    }

    const normalizedWithoutSpaceLower = normalizedWithoutSpace.toLowerCase();
    const mappedTeamIdByNoSpaceCode = TEAM_ID_TO_CODE[normalizedWithoutSpaceLower];
    if (mappedTeamIdByNoSpaceCode) {
        return getFullTeamName(mappedTeamIdByNoSpaceCode);
    }

    const normalizedByTokens = normalizedTeamName.toLowerCase().split(/[^a-z가-힣0-9]+/).filter(Boolean);
    const candidateTeamEntries = [
        ...normalizedByTokens,
        normalizedTeamNameLower,
        normalizedWithoutSpaceLower,
    ];

    for (const candidate of candidateTeamEntries) {
        for (const [alias, teamId] of Object.entries(TEAM_NAME_TO_ID)) {
            const aliasLower = alias.toLowerCase();
            if (candidate.includes(aliasLower) || aliasLower.includes(candidate)) {
                const mapped = getFullTeamName(teamId);
                if (mapped) {
                    return mapped;
                }
            }
        }

        const mappedCodeByAlias = TEAM_ID_TO_CODE[candidate];
        if (mappedCodeByAlias) {
            return getFullTeamName(mappedCodeByAlias);
        }
    }

    const alphaOnly = normalizedTeamNameLower.replace(/[^a-z]/g, '');
    for (const [codeAlias, teamId] of Object.entries(TEAM_ID_TO_CODE)) {
        if (!codeAlias) continue;
        if (alphaOnly.includes(codeAlias)) {
            return getFullTeamName(teamId);
        }
    }

    return normalizedTeamName;
};

export const resolveLeagueBadge = (leagueType?: string): string => {
    const normalized = (leagueType || '').toUpperCase();

    switch (normalized) {
        case 'REGULAR':
            return '정규시즌';
        case 'POSTSEASON':
            return '포스트시즌';
        case 'KOREAN_SERIES':
            return '한국시리즈';
        case 'PRE':
        case 'PRESEASON':
            return '프리시즌';
        case 'OFFSEASON':
            return '기타 일정';
        default:
            return '예정 일정';
    }
};
