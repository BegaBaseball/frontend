import api from './axios';

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
    const response = await api.get(`/franchises/code/${encodeURIComponent(normalizedCode)}`);
    return response.data;
};

export const fetchTeamFranchiseMetadata = async (teamCode: string): Promise<TeamFranchiseMetadata> => {
    const franchise = await fetchTeamFranchiseByCode(teamCode);
    const response = await api.get(`/franchises/${franchise.id}/metadata`);
    return response.data || {};
};
