
import { getApiBaseUrl } from './apiBase';

const API_URL = (() => {
  if (typeof window !== 'undefined' && window.Cypress) {
    return '/ai';
  }

  return import.meta.env.VITE_AI_API_URL || '/ai';
})();
const APP_API_URL = getApiBaseUrl();

export interface AnalyzeLeagueContext {
    season?: number | string;
    season_year?: number;
    league_type?: string;
    round?: string;
    game_no?: number;
    game_date?: string;
    home?: {
        rank: number;
        gamesBehind: number;
        remainingGames: number;
    } | null;
    away?: {
        rank: number;
        gamesBehind: number;
        remainingGames: number;
    } | null;
}

export interface AnalyzeRequest {
    team_id?: string; // deprecated: use home_team_id
    home_team_id?: string;
    away_team_id?: string;
    league_context?: AnalyzeLeagueContext;
    focus?: string[];
    game_id?: string;
    request_mode?: 'auto_brief' | 'manual_detail';
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
    resolved_focus?: string[];
    focus_signature?: string;
    question_signature?: string;
    cache_key_version?: string;
    cache_state?: string;
    cached?: boolean;
    in_progress?: boolean;
    focus_section_missing?: boolean;
    missing_focus_sections?: string[];
}

export interface AnalyzeOptions {
    signal?: AbortSignal;
}

function isAbortLikeError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return true;
    }
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return true;
        }
        const message = error.message.toLowerCase();
        return message.includes('aborterror') || message.includes('aborted');
    }
    return String(error ?? '').toLowerCase().includes('abort');
}

export async function analyzeTeam(
    data: AnalyzeRequest,
    onStream?: (chunk: string) => void,
    options?: AnalyzeOptions
): Promise<CoachAnalyzeResponse> {
    const requestInit: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
        signal: options?.signal,
    };

    let response = await fetch(`${API_URL}/coach/analyze`, requestInit);
    if (response.status === 401) {
        const refreshResponse = await fetch(`${APP_API_URL}/auth/reissue`, {
            method: 'POST',
            credentials: 'include',
        });
        if (refreshResponse.ok) {
            response = await fetch(`${API_URL}/coach/analyze`, requestInit);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
            const parsed = JSON.parse(errorText);
            if (parsed?.detail) {
                errorDetail = String(parsed.detail);
            }
        } catch {
            // keep raw text
        }
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorDetail}`);
    }

    // Handle Streaming (SSE)
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";
    let toolCalls: Array<unknown> = [];
    let verified = false;
    let dataSources: Array<unknown> = [];
    let structuredData: CoachStructuredResponse | undefined = undefined;
    let resolvedFocus: string[] | undefined = undefined;
    let focusSignature: string | undefined = undefined;
    let questionSignature: string | undefined = undefined;
    let cacheKeyVersion: string | undefined = undefined;
    let cacheState: string | undefined = undefined;
    let cached: boolean | undefined = undefined;
    let inProgress: boolean | undefined = undefined;
    let focusSectionMissing: boolean | undefined = undefined;
    let missingFocusSections: string[] | undefined = undefined;

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
                                if (Array.isArray(parsed.resolved_focus)) resolvedFocus = parsed.resolved_focus;
                                if (typeof parsed.focus_signature === 'string') focusSignature = parsed.focus_signature;
                                if (typeof parsed.question_signature === 'string') questionSignature = parsed.question_signature;
                                if (typeof parsed.cache_key_version === 'string') cacheKeyVersion = parsed.cache_key_version;
                                if (typeof parsed.cache_state === 'string') cacheState = parsed.cache_state;
                                if (typeof parsed.in_progress === 'boolean') inProgress = parsed.in_progress;
                                if (parsed.cached !== undefined) cached = Boolean(parsed.cached);
                                if (parsed.focus_section_missing !== undefined) focusSectionMissing = Boolean(parsed.focus_section_missing);
                                if (Array.isArray(parsed.missing_focus_sections)) missingFocusSections = parsed.missing_focus_sections;
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
            if (isAbortLikeError(error)) {
                throw error instanceof Error ? error : new DOMException('aborted', 'AbortError');
            }
            console.error("Streaming error:", error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    } else {
        return response.json();
    }

    return {
        answer: fullAnswer,
        tool_calls: toolCalls,
        verified: verified,
        data_sources: dataSources,
        structuredData: structuredData,
        resolved_focus: resolvedFocus,
        focus_signature: focusSignature,
        question_signature: questionSignature,
        cache_key_version: cacheKeyVersion,
        cache_state: cacheState,
        cached: cached,
        in_progress: inProgress,
        focus_section_missing: focusSectionMissing,
        missing_focus_sections: missingFocusSections
    };
}
