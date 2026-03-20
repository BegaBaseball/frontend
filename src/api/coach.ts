
import { AiDataSource, AiStreamMetaPayload, AiToolCall } from '../types/ai';
import api from './axios';
import { normalizeAiDataSources, normalizeAiToolCalls } from './aiMeta';
import { consumeSseStream } from './sse';
import {
    COACH_STREAM_TIMEOUT_RETRY_ATTEMPTS,
    DEFAULT_STREAM_TIMEOUT_MS,
    getStreamRetryDelayMs,
    CHATBOT_STREAM_INCOMPLETE_ERROR,
    CHATBOT_STREAM_TIMEOUT_ERROR,
    isStreamAbortError,
    isStreamReadTimeoutError,
    isStreamRequestTimeoutError,
    requestStream,
    waitForStreamDelay,
} from './stream';

const COACH_ANALYZE_ENDPOINT = '/ai/coach/analyze';

export interface AnalyzeLeagueContext {
    season?: number | string;
    season_year?: number;
    league_type?: string;
    league_type_code?: number;
    round?: string;
    stage_label?: string;
    game_no?: number;
    series_game_no?: number;
    game_date?: string;
    home_pitcher?: string;
    away_pitcher?: string;
    lineup_announced?: boolean;
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
    request_mode: CoachRequestMode;
    question_override?: string;
}

export type CoachRequestMode = 'auto_brief' | 'manual_detail';
export type CoachGenerationMode = 'deterministic_auto' | 'llm_manual' | 'evidence_fallback';
export type CoachDataQuality = 'grounded' | 'partial' | 'insufficient';

export interface AnalyzeRequestBase {
    request_mode: CoachRequestMode;
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

export interface CoachRiskItem {
    area: string;
    level: 0 | 1 | 2;
    description: string;
}

export interface CoachStructuredAnalysis {
    summary?: string;
    verdict?: string;
    strengths: string[];
    weaknesses: string[];
    risks: CoachRiskItem[];
    why_it_matters?: string[];
    swing_factors?: string[];
    watch_points?: string[];
    uncertainty?: string[];
}

// Structured response data from LLM
export interface CoachAnalysisData {
    dashboard: CoachDashboard;
    metrics: CoachMetric[];
    detailed_analysis: string;
    coach_note: string;
    analysis_summary: string;
    verdict: string;
    strengths: string[];
    weaknesses: string[];
    risks: CoachRiskItem[];
    why_it_matters: string[];
    swing_factors: string[];
    watch_points: string[];
    uncertainty: string[];
    game_status_bucket?: string;
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
        summary?: string;
        verdict?: string;
        strengths: string[];
        weaknesses: string[];
        risks: CoachRiskItem[];
        why_it_matters?: string[];
        swing_factors?: string[];
        watch_points?: string[];
        uncertainty?: string[];
    };
    detailed_markdown: string;
    coach_note: string;
}

// API Response wrapper
export interface CoachAnalyzeResponse {
    data?: CoachAnalysisData;
    request_mode?: CoachRequestMode;
    raw_answer?: string;  // For debugging
    answer?: string;
    tool_calls?: AiToolCall[];
    verified?: boolean;
    data_sources?: AiDataSource[];
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
    generation_mode?: CoachGenerationMode;
    data_quality?: CoachDataQuality;
    used_evidence?: string[];
    grounding_warnings?: string[];
    grounding_reasons?: string[];
    supported_fact_count?: number;
    game_status_bucket?: string;
}

export const getCoachDataQualityLabel = (value?: CoachDataQuality): string => {
    switch (value) {
        case 'grounded':
            return '실데이터 기반';
        case 'partial':
            return '실데이터 일부 기반';
        case 'insufficient':
            return '데이터 부족';
        default:
            return '근거 확인 중';
    }
};

export const getCoachGenerationModeLabel = (value?: CoachGenerationMode): string => {
    switch (value) {
        case 'deterministic_auto':
            return '규칙 기반 자동 브리핑';
        case 'llm_manual':
            return '근거 기반 상세 분석';
        case 'evidence_fallback':
            return '근거 기반 보수 생성';
        default:
            return '생성 방식 확인 중';
    }
};

export interface AnalyzeOptions {
    signal?: AbortSignal;
}

export type CoachAnalyzeErrorCode = 'AUTH_EXPIRED' | 'REQUEST_FAILED';

export class CoachAnalyzeError extends Error {
    code: CoachAnalyzeErrorCode;
    statusCode: number | null;

    constructor(code: CoachAnalyzeErrorCode, message: string, statusCode: number | null = null) {
        super(message);
        this.name = 'CoachAnalyzeError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export const isCoachAnalyzeError = (error: unknown): error is CoachAnalyzeError =>
    error instanceof CoachAnalyzeError;

const createCoachRequestFailedError = (message = '분석 중 오류가 발생했습니다.'): CoachAnalyzeError =>
    new CoachAnalyzeError('REQUEST_FAILED', message);

const isCoachRequestMode = (requestMode: AnalyzeRequest['request_mode']): requestMode is CoachRequestMode => (
    requestMode === 'auto_brief' || requestMode === 'manual_detail'
);

const normalizeCoachRequestMode = (requestMode?: AnalyzeRequest['request_mode']): CoachRequestMode => {
    if (!requestMode) {
        return 'manual_detail';
    }
    if (isCoachRequestMode(requestMode)) {
        return requestMode;
    }
    throw new Error(`Unsupported request_mode: ${requestMode}`);
};

const normalizeQuestionOverride = (questionOverride: AnalyzeRequest['question_override']): string | undefined => {
    if (typeof questionOverride !== 'string') {
        return undefined;
    }
    const trimmed = questionOverride.trim();
    if (!trimmed) {
        return undefined;
    }
    return trimmed;
};

const buildCoachAnalyzePayload = (
    requestMode: CoachRequestMode,
    baseRequest: AnalyzeRequest,
    normalizedQuestionOverride: string | undefined,
): AnalyzeRequest => {
    const requestPayload: AnalyzeRequest = {
        ...baseRequest,
        request_mode: requestMode,
    };

    if (requestMode === 'auto_brief') {
        // 자동 브리핑 경로에서는 질문 오버라이드는 정책상 허용되지 않습니다.
        delete requestPayload.question_override;
        return requestPayload;
    }

    if (normalizedQuestionOverride) {
        requestPayload.question_override = normalizedQuestionOverride;
    } else {
        delete requestPayload.question_override;
    }

    return requestPayload;
};

export async function analyzeTeam(
    data: AnalyzeRequest,
    onStream?: (chunk: string) => void,
    options?: AnalyzeOptions
): Promise<CoachAnalyzeResponse> {
    const requestMode = normalizeCoachRequestMode(data.request_mode);
    const normalizedQuestionOverride = normalizeQuestionOverride(data.question_override);
    const requestPayload = buildCoachAnalyzePayload(
        requestMode,
        {
            ...data,
            request_mode: requestMode,
        },
        normalizedQuestionOverride,
    );

    const requestInit: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: options?.signal,
    };

    const MAX_RETRIES = COACH_STREAM_TIMEOUT_RETRY_ATTEMPTS;
    let attempt = 0;
    let response: Response | null = null;

    while (true) {
        attempt++;

        try {
            const request = await requestStream(COACH_ANALYZE_ENDPOINT, {
                ...requestInit,
                timeoutMs: DEFAULT_STREAM_TIMEOUT_MS,
            });

            if (request.status === 401) {
                try {
                    const refreshResponse = await api.post('/auth/reissue', undefined, {
                        skipGlobalErrorHandler: true,
                    });
                    if (refreshResponse.status >= 200 && refreshResponse.status < 300) {
                        if (attempt < MAX_RETRIES) {
                            continue;
                        }
                    }
                } catch {
                    response = request;
                    break;
                }
            }

            if (request.status >= 500 && request.status < 600) {
                if (attempt < MAX_RETRIES) {
                    const delay = getStreamRetryDelayMs(attempt);
                    await waitForStreamDelay(delay, options?.signal);
                    continue;
                }
            }

            response = request;
            break;
        } catch (error) {
            if (isStreamAbortError(error)) {
                throw error instanceof Error ? error : new DOMException('aborted', 'AbortError');
            }

            if (attempt >= MAX_RETRIES) {
                if (isStreamRequestTimeoutError(error)) {
                    throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
                }
                throw error instanceof Error ? error : new Error(String(error));
            }

            if (isStreamRequestTimeoutError(error) || error instanceof TypeError) {
                const delay = getStreamRetryDelayMs(attempt);
                await waitForStreamDelay(delay, options?.signal);
                continue;
            }

            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    if (!response || !response.ok) {
        if (!response) {
            throw new Error('Failed to connect to coach stream');
        }
        if (response.status === 401) {
            throw new CoachAnalyzeError(
                'AUTH_EXPIRED',
                '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.',
                401,
            );
        }
        const errorText = await response.text();
        let errorDetail = 'coach_internal_error';
        if (response.status < 500) {
            errorDetail = errorText;
            try {
                const parsed = JSON.parse(errorText);
                if (parsed?.detail) {
                    errorDetail = String(parsed.detail);
                }
            } catch {
                // keep raw text for 4xx
            }
        }
        if (response.status >= 500) {
            throw new CoachAnalyzeError(
                'REQUEST_FAILED',
                '분석 중 오류가 발생했습니다.',
                response.status,
            );
        }
        throw new Error(errorDetail);
    }

    // Handle Streaming (SSE)
    const responseBody = response.body;
    let fullAnswer = "";
    let toolCalls: AiToolCall[] = [];
    let verified = false;
    let dataSources: AiDataSource[] = [];
    let structuredData: CoachStructuredResponse | undefined = undefined;
    let resolvedFocus: string[] | undefined = undefined;
    let focusSignature: string | undefined = undefined;
    let questionSignature: string | undefined = undefined;
    let requestModeFromMeta: CoachRequestMode = requestPayload.request_mode;
    let cacheKeyVersion: string | undefined = undefined;
    let cacheState: string | undefined = undefined;
    let cached: boolean | undefined = undefined;
    let inProgress: boolean | undefined = undefined;
    let focusSectionMissing: boolean | undefined = undefined;
    let missingFocusSections: string[] | undefined = undefined;
    let generationMode: CoachGenerationMode | undefined = undefined;
    let dataQuality: CoachDataQuality | undefined = undefined;
    let usedEvidence: string[] | undefined = undefined;
    let groundingWarnings: string[] | undefined = undefined;
    let groundingReasons: string[] | undefined = undefined;
    let supportedFactCount: number | undefined = undefined;
    let gameStatusBucket: string | undefined = undefined;

    if (responseBody) {
        try {
            const handleMetaPayload = (parsed: AiStreamMetaPayload & Record<string, unknown>) => {
                if (parsed.structured_response) {
                    structuredData = parsed.structured_response as CoachStructuredResponse;
                }
                if (parsed.tool_calls) toolCalls = normalizeAiToolCalls(parsed.tool_calls);
                if (parsed.verified !== undefined) verified = parsed.verified as boolean;
                if (parsed.data_sources) dataSources = normalizeAiDataSources(parsed.data_sources);
                if (Array.isArray(parsed.resolved_focus)) resolvedFocus = parsed.resolved_focus as string[];
                if (
                    parsed.request_mode === 'auto_brief'
                    || parsed.request_mode === 'manual_detail'
                ) {
                    requestModeFromMeta = parsed.request_mode;
                }
                if (typeof parsed.focus_signature === 'string') focusSignature = parsed.focus_signature;
                if (typeof parsed.question_signature === 'string') questionSignature = parsed.question_signature;
                if (typeof parsed.cache_key_version === 'string') cacheKeyVersion = parsed.cache_key_version;
                if (typeof parsed.cache_state === 'string') cacheState = parsed.cache_state;
                if (typeof parsed.in_progress === 'boolean') inProgress = parsed.in_progress;
                if (parsed.cached !== undefined) cached = Boolean(parsed.cached);
                if (parsed.focus_section_missing !== undefined) focusSectionMissing = Boolean(parsed.focus_section_missing);
                if (Array.isArray(parsed.missing_focus_sections)) missingFocusSections = parsed.missing_focus_sections as string[];
                if (
                    parsed.generation_mode === 'deterministic_auto'
                    || parsed.generation_mode === 'llm_manual'
                    || parsed.generation_mode === 'evidence_fallback'
                ) {
                    generationMode = parsed.generation_mode;
                }
                if (
                    parsed.data_quality === 'grounded'
                    || parsed.data_quality === 'partial'
                    || parsed.data_quality === 'insufficient'
                ) {
                    dataQuality = parsed.data_quality;
                }
                if (Array.isArray(parsed.used_evidence)) {
                    usedEvidence = parsed.used_evidence
                        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
                        .map((value: string) => value.trim());
                }
                if (Array.isArray(parsed.grounding_warnings)) {
                    groundingWarnings = parsed.grounding_warnings
                        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
                        .map((value: string) => value.trim());
                }
                if (Array.isArray(parsed.grounding_reasons)) {
                    groundingReasons = parsed.grounding_reasons
                        .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
                        .map((value: string) => value.trim());
                }
                if (typeof parsed.supported_fact_count === 'number' && Number.isFinite(parsed.supported_fact_count)) {
                    supportedFactCount = parsed.supported_fact_count;
                } else if (typeof parsed.supported_fact_count === 'string' && parsed.supported_fact_count.trim() !== '') {
                    const normalizedCount = Number(parsed.supported_fact_count);
                    if (Number.isFinite(normalizedCount) && normalizedCount >= 0) {
                        supportedFactCount = normalizedCount;
                    }
                }
                if (typeof parsed.game_status_bucket === 'string') {
                    gameStatusBucket = parsed.game_status_bucket;
                }
            };

            const { sawDone } = await consumeSseStream(responseBody, {
                timeoutMs: DEFAULT_STREAM_TIMEOUT_MS,
                signal: options?.signal,
                onEvent: ({ event, data: dataStr }) => {
                    if (event !== 'message' && event !== 'meta' && event !== 'error') {
                        return;
                    }

                    let parsed: AiStreamMetaPayload & Record<string, unknown>;
                    try {
                        parsed = JSON.parse(dataStr) as AiStreamMetaPayload & Record<string, unknown>;
                    } catch {
                        return;
                    }

                    if (event === 'message' && typeof parsed.delta === 'string') {
                        fullAnswer += parsed.delta;
                        if (onStream) onStream(fullAnswer);
                        return;
                    }

                    if (event === 'meta') {
                        handleMetaPayload(parsed);
                        return;
                    }

                    if (event === 'error') {
                        const publicMessage = typeof parsed.message === 'string' && parsed.message.trim() !== ''
                            ? parsed.message
                            : '분석 중 오류가 발생했습니다.';
                        throw createCoachRequestFailedError(publicMessage);
                    }
                },
            });

            if (!sawDone) {
                throw new Error(CHATBOT_STREAM_INCOMPLETE_ERROR);
            }
        } catch (error) {
            if (isStreamReadTimeoutError(error)) {
                throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
            }
            if (error instanceof Error && error.message === CHATBOT_STREAM_INCOMPLETE_ERROR) {
                throw createCoachRequestFailedError();
            }
            if (isStreamAbortError(error)) {
                throw error instanceof Error ? error : new DOMException('aborted', 'AbortError');
            }
            const errorLike = error instanceof Error ? error : undefined;
            console.error("Streaming error:", {
                name: errorLike?.name ?? 'Error',
                message: errorLike?.message ?? 'Streaming request failed',
                type: typeof error,
            });
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
        request_mode: requestModeFromMeta,
        cache_key_version: cacheKeyVersion,
        cache_state: cacheState,
        cached: cached,
        in_progress: inProgress,
        focus_section_missing: focusSectionMissing,
        missing_focus_sections: missingFocusSections,
        generation_mode: generationMode,
        data_quality: dataQuality,
        used_evidence: usedEvidence,
        grounding_warnings: groundingWarnings,
        grounding_reasons: groundingReasons,
        supported_fact_count: supportedFactCount,
        game_status_bucket: gameStatusBucket,
    };
}
