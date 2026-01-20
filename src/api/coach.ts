
const API_URL = import.meta.env.VITE_AI_API_URL || '/ai';

export interface AnalyzeRequest {
    team_id: string;
    focus?: string[];
    game_id?: string;
    question_override?: string;
}

export interface CoachAnalyzeResponse {
    answer?: string;
    tool_calls?: Array<any>;
    verified?: boolean;
    data_sources?: Array<any>;
    error?: string;
}

export async function analyzeTeam(data: AnalyzeRequest): Promise<CoachAnalyzeResponse> {
    const response = await fetch(`${API_URL}/coach/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    return response.json();
}
