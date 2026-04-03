import { publicGet } from './publicClient';

export interface TeamFranchiseSummaryResponse {
    id: number;
    name: string;
    originalCode: string;
    currentCode: string;
    webUrl?: string | null;
}

export type TeamFranchiseSummary = TeamFranchiseSummaryResponse;

export interface TeamFranchiseMetadata {
    summary?: string;
    description?: string;
    foundedYear?: number | string;
    homeStadium?: string;
    owner?: string;
    ceo?: string;
    homepage?: string;
    website?: string;
    address?: string;
    [key: string]: unknown;
}

const normalizeTeamCode = (teamCode: string): string => teamCode.trim();

export const fetchTeamFranchiseByCode = async (teamCode: string): Promise<TeamFranchiseSummaryResponse> => {
    const normalizedCode = normalizeTeamCode(teamCode);
    return publicGet<TeamFranchiseSummaryResponse>(`/franchises/code/${encodeURIComponent(normalizedCode)}`);
};

export const fetchTeamFranchiseMetadata = async (teamCode: string): Promise<TeamFranchiseMetadata> => {
    const franchise = await fetchTeamFranchiseByCode(teamCode);
    const response = await publicGet<TeamFranchiseMetadata>(`/franchises/${franchise.id}/metadata`);
    return response || {};
};
