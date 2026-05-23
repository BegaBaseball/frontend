import { AiDataSource, AiStreamMetaPayload, AiToolCall } from '../types/ai';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import { normalizeAiDataSources, normalizeAiToolCalls } from './aiMeta';
import { requestPrivateReissue } from './privateClient';
import { consumeSseStream } from './sse';
import {
    COACH_STREAM_TIMEOUT_RETRY_ATTEMPTS,
    DEFAULT_STREAM_TIMEOUT_MS,
    getStreamRetryDelayMs,
    CHATBOT_STREAM_INCOMPLETE_ERROR,
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
export const COACH_MANUAL_STREAM_TIMEOUT_MS = 90000;
export const COACH_STREAM_CONNECT_TIMEOUT_MESSAGE = 'AI 코치 분석 준비가 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
export const COACH_STREAM_IDLE_TIMEOUT_MESSAGE = 'AI 코치 분석 응답이 일정 시간 이상 멈췄습니다. 잠시 후 다시 시도해주세요.';

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
    validation_status?: string;
    manual_data_request?: ManualBaseballDataRequest;
    win_probability_home?: number | null;
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
            return '확인 근거 기반';
        default:
            return '확인 중';
    }
};

export interface AnalyzeOptions {
    signal?: AbortSignal;
    onPreviewChunk?: (text: string, attempt: number) => void;
    onPreviewReset?: (attempt: number) => void;
    onStatus?: (status: string) => void;
}

export type CoachAnalyzeErrorCode = 'AUTH_EXPIRED' | 'REQUEST_FAILED' | 'STREAM_TIMEOUT';

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

const createCoachStreamTimeoutError = (
    message = COACH_STREAM_CONNECT_TIMEOUT_MESSAGE,
): CoachAnalyzeError => new CoachAnalyzeError('STREAM_TIMEOUT', message);

interface ParsedCoachErrorPayload {
    code?: string;
    detail?: string;
    message?: string;
    rawText: string;
}

const readCoachErrorPayload = async (response: Response): Promise<ParsedCoachErrorPayload> => {
    const clone = response.clone();
    const rawText = await clone.text();
    if (!rawText) {
        return { rawText };
    }

    try {
        const parsed = JSON.parse(rawText) as {
            code?: unknown;
            detail?: unknown;
            message?: unknown;
        };
        return {
            code: typeof parsed.code === 'string' ? parsed.code : undefined,
            detail: typeof parsed.detail === 'string' ? parsed.detail : undefined,
            message: typeof parsed.message === 'string' ? parsed.message : undefined,
            rawText,
        };
    } catch {
        return { rawText };
    }
};

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

export const getCoachStreamReadTimeoutMs = (requestMode: CoachRequestMode): number => (
    requestMode === 'manual_detail' ? COACH_MANUAL_STREAM_TIMEOUT_MS : DEFAULT_STREAM_TIMEOUT_MS
);

export const getCoachStreamRequestTimeoutMs = (requestMode: CoachRequestMode): number => (
    requestMode === 'manual_detail' ? COACH_MANUAL_STREAM_TIMEOUT_MS : DEFAULT_STREAM_TIMEOUT_MS
);

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
    let lastUnauthorizedPayload: ParsedCoachErrorPayload | null = null;

    while (true) {
        attempt++;

        try {
            const request = await requestStream(COACH_ANALYZE_ENDPOINT, {
                ...requestInit,
                timeoutMs: getCoachStreamRequestTimeoutMs(requestMode),
            });

            if (request.status === 401) {
                lastUnauthorizedPayload = await readCoachErrorPayload(request);
                if (lastUnauthorizedPayload.code === 'AI_UPSTREAM_UNAUTHORIZED') {
                    response = request;
                    break;
                }

                try {
                    const refreshSucceeded = await requestPrivateReissue();
                    if (refreshSucceeded) {
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
                    throw createCoachStreamTimeoutError(COACH_STREAM_CONNECT_TIMEOUT_MESSAGE);
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
            if (lastUnauthorizedPayload?.code === 'AI_UPSTREAM_UNAUTHORIZED') {
                throw createCoachRequestFailedError();
            }
            throw new CoachAnalyzeError(
                'AUTH_EXPIRED',
                '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.',
                401,
            );
        }
        const errorPayload = await readCoachErrorPayload(response);
        let errorDetail = 'coach_internal_error';
        if (response.status < 500) {
            errorDetail = errorPayload.detail || errorPayload.message || errorPayload.rawText;
        }
        if (response.status >= 500) {
            if (response.status === 504 || errorPayload.code === 'AI_UPSTREAM_TIMEOUT') {
                throw createCoachStreamTimeoutError(
                    errorPayload.message || 'AI 서비스 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
                );
            }
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
    let validationStatus: string | undefined = undefined;
    let manualDataRequest: ManualBaseballDataRequest | undefined = undefined;
    let winProbabilityHome: number | null | undefined = undefined;

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
                if (typeof parsed.validation_status === 'string') validationStatus = parsed.validation_status;
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
                if (parsed.manual_data_request && typeof parsed.manual_data_request === 'object') {
                    manualDataRequest = parsed.manual_data_request as ManualBaseballDataRequest;
                }
                const rawWinProb = (parsed as Record<string, unknown>).win_probability_home;
                if (
                    typeof rawWinProb === 'number'
                    && Number.isFinite(rawWinProb)
                    && rawWinProb >= 0
                    && rawWinProb <= 1
                ) {
                    winProbabilityHome = rawWinProb;
                }
            };

            const { sawDone } = await consumeSseStream(responseBody, {
                timeoutMs: getCoachStreamReadTimeoutMs(requestMode),
                signal: options?.signal,
                onEvent: ({ event, data: dataStr }) => {
                    if (
                        event !== 'message'
                        && event !== 'meta'
                        && event !== 'error'
                        && event !== 'preview_chunk'
                        && event !== 'preview_reset'
                        && event !== 'status'
                    ) {
                        return;
                    }

                    let parsed: AiStreamMetaPayload & Record<string, unknown>;
                    try {
                        parsed = JSON.parse(dataStr) as AiStreamMetaPayload & Record<string, unknown>;
                    } catch {
                        return;
                    }

                    if (event === 'preview_chunk') {
                        if (options?.onPreviewChunk && typeof parsed.text === 'string') {
                            const attempt = typeof parsed.attempt === 'number' ? parsed.attempt : 1;
                            options.onPreviewChunk(parsed.text, attempt);
                        }
                        return;
                    }

                    if (event === 'preview_reset') {
                        if (options?.onPreviewReset) {
                            const attempt = typeof parsed.attempt === 'number' ? parsed.attempt : 1;
                            options.onPreviewReset(attempt);
                        }
                        return;
                    }

                    if (event === 'status') {
                        if (options?.onStatus && typeof parsed.status === 'string') {
                            options.onStatus(parsed.status);
                        }
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

            const hasRecoverableTerminalState = Boolean(structuredData) && inProgress !== true;
            if (!sawDone && !hasRecoverableTerminalState) {
                throw new Error(CHATBOT_STREAM_INCOMPLETE_ERROR);
            }
            if (!sawDone && hasRecoverableTerminalState) {
                console.warn('Coach stream closed without done event after terminal meta.', {
                    requestMode: requestModeFromMeta,
                    cacheState,
                    gameStatusBucket,
                });
            }
        } catch (error) {
            if (isStreamReadTimeoutError(error)) {
                throw createCoachStreamTimeoutError(COACH_STREAM_IDLE_TIMEOUT_MESSAGE);
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
        validation_status: validationStatus,
        manual_data_request: manualDataRequest,
        win_probability_home: winProbabilityHome,
    };
}
