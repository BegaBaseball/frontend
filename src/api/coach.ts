
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

// Backend structured_response from meta event (CoachResponse schema)
export interface CoachStructuredResponse {
    headline: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    key_metrics: Array<{
        label: string;
        value: string;
        status: 'good' | 'warning' | 'danger';
        trend: 'up' | 'down' | 'neutral';
        is_critical: boolean;
    }>;
    analysis: {
        strengths: string[];
        weaknesses: string[];
        risks: Array<{ area: string; level: number; description: string }>;
    };
    detailed_markdown: string;
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
    structuredData?: CoachStructuredResponse;  // Parsed response from meta event
}

export async function analyzeTeam(
    data: AnalyzeRequest,
    onStream?: (chunk: string) => void
): Promise<CoachAnalyzeResponse> {
    const response = await fetch(`${API_URL}/coach/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    // Handle Streaming (SSE)
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";
    let toolCalls: Array<unknown> = [];
    let verified = false;
    let dataSources: Array<unknown> = [];
    let structuredData: CoachStructuredResponse | undefined = undefined;

    if (reader) {
        try {
            let currentEvent = 'message';  // Default event type
            let buffer = '';  // Buffer for incomplete SSE lines

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Keep incomplete last line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    // Parse event type
                    if (trimmedLine.startsWith('event:')) {
                        currentEvent = trimmedLine.slice(6).trim();
                        continue;
                    }

                    if (trimmedLine.startsWith('data:')) {
                        const dataStr = trimmedLine.slice(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(dataStr);

                            // Handle based on event type
                            if (currentEvent === 'message' && parsed.delta) {
                                fullAnswer += parsed.delta;
                                if (onStream) onStream(fullAnswer);
                            } else if (currentEvent === 'meta') {
                                // Capture structured_response from meta event
                                if (parsed.structured_response) {
                                    structuredData = parsed.structured_response;
                                }
                                if (parsed.tool_calls) toolCalls = parsed.tool_calls;
                                if (parsed.verified !== undefined) verified = parsed.verified;
                                if (parsed.data_sources) dataSources = parsed.data_sources;
                            }

                            // Reset event type after processing data
                            currentEvent = 'message';
                        } catch {
                            // ignore partial json
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Streaming error:", error);
        }
    } else {
        return response.json();
    }

    return {
        answer: fullAnswer,
        tool_calls: toolCalls,
        verified: verified,
        data_sources: dataSources,
        structuredData: structuredData
    };
}
