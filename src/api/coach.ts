
const API_URL = import.meta.env.VITE_AI_API_URL || '/ai';

export interface AnalyzeRequest {
    team_id: string;
    focus?: string[];
    game_id?: string;
    question_override?: string;
}

// Structured dashboard stat
export interface DashboardStat {
    label: string;
    value: string;
    status: string;
    trend: 'up' | 'down' | 'neutral';
    is_critical: boolean;
}

// Dashboard section
export interface CoachDashboard {
    headline: string;
    context: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    stats: DashboardStat[];
}

// Metric card data
export interface CoachMetric {
    category: string;
    name: string;
    value: string;
    description: string;
    risk_level: 0 | 1 | 2; // 0=danger, 1=warning, 2=success
    trend: 'up' | 'down' | 'neutral';
}

// Structured response data from LLM
export interface CoachAnalysisData {
    dashboard: CoachDashboard;
    metrics: CoachMetric[];
    detailed_analysis: string;
    coach_note: string;
}

// API Response wrapper
export interface CoachAnalyzeResponse {
    data?: CoachAnalysisData;
    raw_answer?: string;  // For debugging
    answer?: string;
    tool_calls?: Array<unknown>;
    verified?: boolean;
    data_sources?: Array<unknown>;
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
