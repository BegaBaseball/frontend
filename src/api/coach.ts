import { AiDataSource, AiStreamMetaPayload, AiToolCall } from '../types/ai';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';
import type { components as AiStreamComponents } from './generated/aiStreamV2';
import { requestAuthReissue } from './authReissue';
import { normalizeAiDataSources, normalizeAiToolCalls } from './aiMeta';
import {
    AI_EVENT_VERSION_HEADER,
    AiStreamContractError,
    decodeAiStreamV2Event,
    getAiEventVersion,
} from './aiStreamContract';
import {
    decodeAiStreamHttpError,
    normalizeAiStreamEventError,
    RateLimitError,
    type AiStreamErrorDetails,
    type AiStreamRequestError,
} from './aiStreamError';
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

type CoachAnalyzeRequestWire = AiStreamComponents['schemas']['CoachAnalyzeRequest'];
type CoachMetaV2 = AiStreamComponents['schemas']['CoachMetaData'];
type CoachStructuredResponseV2 = AiStreamComponents['schemas']['CoachStructuredResponse'];
type ManualBaseballDataRequestV2 = AiStreamComponents['schemas']['ManualBaseballDataRequest'];

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

export type AnalyzeRequest = Omit<
    Partial<CoachAnalyzeRequestWire>,
    'request_mode' | 'analysis_type' | 'league_context'
> & {
    team_id?: string | null; // deprecated: use home_team_id
    home_team_id?: string | null;
    away_team_id?: string | null;
    league_context?: AnalyzeLeagueContext;
    focus?: string[];
    request_mode: CoachRequestMode;
    analysis_type?: CoachAnalysisType;
    analysisType?: CoachAnalysisType;
    question_override?: string | null;
};

export type CoachRequestMode = 'auto_brief' | 'manual_detail';
export type CoachAnalysisType = 'game_review' | 'game_preview';
export type CoachGenerationMode = 'deterministic_auto' | 'deterministic_review' | 'deterministic_preview' | 'llm_manual' | 'evidence_fallback';
export type CoachDataQuality = 'grounded' | 'partial' | 'insufficient';
export const COACH_MANUAL_STREAM_TIMEOUT_MS = 90000;
export const COACH_STREAM_CONNECT_TIMEOUT_MESSAGE = 'AI 코치 분석 준비가 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
export const COACH_STREAM_IDLE_TIMEOUT_MESSAGE = 'AI 코치 분석 응답이 일정 시간 이상 멈췄습니다. 잠시 후 다시 시도해주세요.';

export interface AnalyzeRequestBase {
    request_mode: CoachRequestMode;
    analysis_type?: CoachAnalysisType;
    analysisType?: CoachAnalysisType;
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

export type CoachRiskImpactTo = 'home' | 'away' | 'both';

export interface CoachRiskItem {
    area: string;
    level: 0 | 1 | 2;
    description: string;
    inning_label?: string | null;
    inning_start?: number | null;
    inning_end?: number | null;
    impact?: string | null;
    impact_to?: CoachRiskImpactTo | null;
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
    analysisType?: CoachAnalysisType;
    analysis_type?: CoachAnalysisType;
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
    analysis_type?: CoachAnalysisType;
    analysisType?: CoachAnalysisType;
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
    llm_skip_reason?: string;
    llmSkipReason?: string;
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

const toCoachStructuredResponse = (
    value: CoachStructuredResponseV2,
): CoachStructuredResponse => ({
    headline: value.headline,
    sentiment: value.sentiment,
    analysisType: value.analysis_type ?? undefined,
    analysis_type: value.analysis_type ?? undefined,
    key_metrics: value.key_metrics ?? [],
    analysis: {
        summary: value.analysis.summary ?? undefined,
        verdict: value.analysis.verdict ?? undefined,
        strengths: value.analysis.strengths ?? [],
        weaknesses: value.analysis.weaknesses ?? [],
        risks: value.analysis.risks ?? [],
        why_it_matters: value.analysis.why_it_matters ?? [],
        swing_factors: value.analysis.swing_factors ?? [],
        watch_points: value.analysis.watch_points ?? [],
        uncertainty: value.analysis.uncertainty ?? [],
    },
    detailed_markdown: value.detailed_markdown,
    coach_note: value.coach_note,
});

const toManualBaseballDataRequest = (
    value: ManualBaseballDataRequestV2,
): ManualBaseballDataRequest => ({
    scope: value.scope,
    missingItems: value.missing_items.map((item) => ({
        key: item.key,
        label: item.label,
        reason: item.reason,
        expected_format: item.expected_format,
    })),
    operatorMessage: value.operator_message,
    blocking: value.blocking,
    code: value.code ?? undefined,
});

export const getCoachDataQualityLabel = (value?: CoachDataQuality): string => {
    switch (value) {
        case 'grounded':
            return '경기 데이터 반영';
        case 'partial':
            return '주요 흐름 중심';
        case 'insufficient':
            return '데이터 확인 필요';
        default:
            return '근거 확인 중';
    }
};

export const getCoachGenerationModeLabel = (value?: CoachGenerationMode): string => {
    switch (value) {
        case 'deterministic_auto':
            return '규칙 기반 자동 브리핑';
        case 'deterministic_review':
            return '규칙 기반 경기 리뷰';
        case 'deterministic_preview':
            return '규칙 기반 경기 프리뷰';
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

export type CoachAnalyzeErrorCode = 'AUTH_EXPIRED' | 'PAYLOAD_TOO_LARGE' | 'REQUEST_FAILED' | 'STREAM_TIMEOUT';

const AI_PROXY_PAYLOAD_TOO_LARGE_CODE = 'AI_PROXY_PAYLOAD_TOO_LARGE';
export const COACH_PAYLOAD_TOO_LARGE_MESSAGE =
    'AI 코치 분석 요청 데이터가 너무 큽니다. 다른 경기로 다시 시도하거나 잠시 후 다시 확인해주세요.';

export class CoachAnalyzeError extends Error {
    readonly code: CoachAnalyzeErrorCode;
    readonly statusCode: number | null;
    readonly upstreamCode: string | null;
    readonly detail: string | null;
    readonly retryable: boolean;
    readonly retryAfterSeconds: number | null;
    readonly supportedVersions: AiStreamErrorDetails['supportedVersions'];

    constructor(
        code: CoachAnalyzeErrorCode,
        message: string,
        statusCode: number | null = null,
        details?: AiStreamErrorDetails,
    ) {
        super(message);
        this.name = 'CoachAnalyzeError';
        this.code = code;
        this.statusCode = statusCode;
        this.upstreamCode = details?.code ?? null;
        this.detail = details?.detail ?? null;
        this.retryable = details?.retryable ?? false;
        this.retryAfterSeconds = details?.retryAfterSeconds ?? null;
        this.supportedVersions = [...(details?.supportedVersions ?? [])];
    }
}

export const isCoachAnalyzeError = (error: unknown): error is CoachAnalyzeError =>
    error instanceof CoachAnalyzeError;

const createCoachRequestFailedError = (
    message = '분석 중 오류가 발생했습니다.',
    statusCode: number | null = null,
    details?: AiStreamErrorDetails,
): CoachAnalyzeError => new CoachAnalyzeError('REQUEST_FAILED', message, statusCode, details);

const createCoachPayloadTooLargeError = (
    statusCode: number | null = null,
    details?: AiStreamErrorDetails,
): CoachAnalyzeError => new CoachAnalyzeError(
    'PAYLOAD_TOO_LARGE',
    COACH_PAYLOAD_TOO_LARGE_MESSAGE,
    statusCode,
    details,
);

const createCoachStreamTimeoutError = (
    message = COACH_STREAM_CONNECT_TIMEOUT_MESSAGE,
    statusCode: number | null = null,
    details?: AiStreamErrorDetails,
): CoachAnalyzeError => new CoachAnalyzeError('STREAM_TIMEOUT', message, statusCode, details);

const isAiProxyPayloadTooLargeCode = (code: string | null | undefined): boolean =>
    code === AI_PROXY_PAYLOAD_TOO_LARGE_CODE;

const createCoachRequestError = (
    statusCode: number | null,
    details: AiStreamErrorDetails,
): CoachAnalyzeError | RateLimitError => {
    if (statusCode === 429) {
        return new RateLimitError(details);
    }
    if (statusCode === 413 || isAiProxyPayloadTooLargeCode(details.code)) {
        return createCoachPayloadTooLargeError(statusCode, details);
    }
    if (statusCode === 504 || details.code === 'AI_UPSTREAM_TIMEOUT') {
        return createCoachStreamTimeoutError(details.message, null, details);
    }
    return createCoachRequestFailedError(
        details.code === 'AI_STREAM_REQUEST_FAILED'
            ? '분석 중 오류가 발생했습니다.'
            : details.message,
        statusCode,
        details,
    );
};

const isCoachRequestMode = (requestMode: AnalyzeRequest['request_mode']): requestMode is CoachRequestMode => (
    requestMode === 'auto_brief' || requestMode === 'manual_detail'
);

const isCoachAnalysisType = (analysisType: unknown): analysisType is CoachAnalysisType => (
    analysisType === 'game_review' || analysisType === 'game_preview'
);

const normalizeCoachAnalysisType = (analysisType?: AnalyzeRequest['analysis_type'] | AnalyzeRequest['analysisType']): CoachAnalysisType | undefined => {
    if (!analysisType) {
        return undefined;
    }
    if (isCoachAnalysisType(analysisType)) {
        return analysisType;
    }
    return undefined;
};

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
    const analysisType = normalizeCoachAnalysisType(
        baseRequest.analysis_type ?? baseRequest.analysisType,
    );
    if (analysisType) {
        requestPayload.analysis_type = analysisType;
    } else {
        delete requestPayload.analysis_type;
    }
    delete requestPayload.analysisType;

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
    const eventVersion = getAiEventVersion();
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
            [AI_EVENT_VERSION_HEADER]: eventVersion,
        },
        body: JSON.stringify(requestPayload),
        signal: options?.signal,
    };

    const MAX_RETRIES = COACH_STREAM_TIMEOUT_RETRY_ATTEMPTS;
    let attempt = 0;
    let response: Response | null = null;
    let responseError: AiStreamRequestError | null = null;
    let lastUnauthorizedError: AiStreamRequestError | null = null;

    while (true) {
        attempt++;

        try {
            const request = await requestStream(COACH_ANALYZE_ENDPOINT, {
                ...requestInit,
                timeoutMs: getCoachStreamRequestTimeoutMs(requestMode),
            });
            const requestError = request.ok ? null : await decodeAiStreamHttpError(request);

            if (request.status === 401) {
                lastUnauthorizedError = requestError;
                if (requestError?.code === 'AI_UPSTREAM_UNAUTHORIZED') {
                    response = request;
                    responseError = requestError;
                    break;
                }

                try {
                    const refreshSucceeded = await requestAuthReissue();
                    if (refreshSucceeded) {
                        if (attempt < MAX_RETRIES) {
                            continue;
                        }
                    }
                } catch {
                    response = request;
                    responseError = requestError;
                    break;
                }
            }

            if (request.status === 429) {
                response = request;
                responseError = requestError;
                break;
            }

            if (requestError?.retryable && attempt < MAX_RETRIES) {
                await waitForStreamDelay(getStreamRetryDelayMs(attempt), options?.signal);
                continue;
            }

            response = request;
            responseError = requestError;
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
            if (lastUnauthorizedError?.code === 'AI_UPSTREAM_UNAUTHORIZED') {
                throw createCoachRequestFailedError(
                    '분석 중 오류가 발생했습니다.',
                    null,
                    lastUnauthorizedError,
                );
            }
            throw new CoachAnalyzeError(
                'AUTH_EXPIRED',
                '인증이 만료되었습니다. 다시 로그인 후 시도해주세요.',
                401,
                lastUnauthorizedError ?? undefined,
            );
        }
        if (!responseError) {
            throw createCoachRequestFailedError();
        }
        throw createCoachRequestError(response.status, responseError);
    }

    if (
        eventVersion === '2'
        && response.headers.get(AI_EVENT_VERSION_HEADER) !== '2'
    ) {
        throw new AiStreamContractError(
            'AI stream negotiated version header is missing or mismatched.',
        );
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
    let analysisType: CoachAnalysisType | undefined = requestPayload.analysis_type;
    let cacheKeyVersion: string | undefined = undefined;
    let cacheState: string | undefined = undefined;
    let cached: boolean | undefined = undefined;
    let inProgress: boolean | undefined = undefined;
    let llmSkipReason: string | undefined = undefined;
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
            const handleLegacyMetaPayload = (parsed: AiStreamMetaPayload & Record<string, unknown>) => {
                const parsedAnalysisType = normalizeCoachAnalysisType(
                    (parsed.analysis_type ?? parsed.analysisType) as AnalyzeRequest['analysis_type'],
                );
                if (parsedAnalysisType) {
                    analysisType = parsedAnalysisType;
                }
                if (parsed.structured_response) {
                    const parsedStructuredData = parsed.structured_response as CoachStructuredResponse;
                    const structuredAnalysisType = normalizeCoachAnalysisType(
                        parsedStructuredData.analysis_type ?? parsedStructuredData.analysisType,
                    );
                    if (structuredAnalysisType) {
                        analysisType = structuredAnalysisType;
                    }
                    structuredData = analysisType
                        ? {
                            ...parsedStructuredData,
                            analysisType,
                            analysis_type: analysisType,
                        }
                        : parsedStructuredData;
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
                const parsedLlmSkipReason = parsed.llm_skip_reason ?? parsed.llmSkipReason;
                if (typeof parsedLlmSkipReason === 'string' && parsedLlmSkipReason.trim() !== '') {
                    llmSkipReason = parsedLlmSkipReason.trim();
                }
                if (parsed.focus_section_missing !== undefined) focusSectionMissing = Boolean(parsed.focus_section_missing);
                if (Array.isArray(parsed.missing_focus_sections)) missingFocusSections = parsed.missing_focus_sections as string[];
                if (
                    parsed.generation_mode === 'deterministic_auto'
                    || parsed.generation_mode === 'deterministic_review'
                    || parsed.generation_mode === 'deterministic_preview'
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

            const handleV2MetaPayload = (parsed: CoachMetaV2) => {
                if (parsed.analysis_type) {
                    analysisType = parsed.analysis_type;
                }
                if (parsed.structured_response) {
                    structuredData = toCoachStructuredResponse(parsed.structured_response);
                    if (parsed.structured_response.analysis_type) {
                        analysisType = parsed.structured_response.analysis_type;
                    }
                }
                if (parsed.tool_calls) {
                    toolCalls = normalizeAiToolCalls(parsed.tool_calls.map((toolCall) => ({
                        tool_name: toolCall.tool_name,
                        parameters: toolCall.parameters,
                    })));
                }
                if (parsed.verified !== undefined && parsed.verified !== null) {
                    verified = parsed.verified;
                }
                if (parsed.data_sources) {
                    dataSources = normalizeAiDataSources(parsed.data_sources.map((source) => ({
                        title: source.title ?? undefined,
                        url: source.url ?? undefined,
                        content: source.content ?? undefined,
                    })));
                }
                if (parsed.resolved_focus) resolvedFocus = parsed.resolved_focus;
                if (parsed.request_mode) requestModeFromMeta = parsed.request_mode;
                if (parsed.focus_signature) focusSignature = parsed.focus_signature;
                if (parsed.question_signature) questionSignature = parsed.question_signature;
                if (parsed.cache_key_version) cacheKeyVersion = parsed.cache_key_version;
                if (parsed.cache_state) cacheState = parsed.cache_state;
                if (parsed.validation_status) validationStatus = parsed.validation_status;
                if (parsed.in_progress !== undefined && parsed.in_progress !== null) {
                    inProgress = parsed.in_progress;
                }
                if (parsed.cached !== undefined && parsed.cached !== null) {
                    cached = parsed.cached;
                }
                if (parsed.llm_skip_reason) llmSkipReason = parsed.llm_skip_reason;
                if (
                    parsed.focus_section_missing !== undefined
                    && parsed.focus_section_missing !== null
                ) {
                    focusSectionMissing = parsed.focus_section_missing;
                }
                if (parsed.missing_focus_sections) {
                    missingFocusSections = parsed.missing_focus_sections;
                }
                if (parsed.generation_mode) generationMode = parsed.generation_mode;
                if (parsed.data_quality) dataQuality = parsed.data_quality;
                if (parsed.used_evidence) usedEvidence = parsed.used_evidence;
                if (parsed.grounding_warnings) groundingWarnings = parsed.grounding_warnings;
                if (parsed.grounding_reasons) groundingReasons = parsed.grounding_reasons;
                if (parsed.supported_fact_count !== undefined && parsed.supported_fact_count !== null) {
                    supportedFactCount = parsed.supported_fact_count;
                }
                if (parsed.game_status_bucket) gameStatusBucket = parsed.game_status_bucket;
                if (parsed.manual_data_request) {
                    manualDataRequest = toManualBaseballDataRequest(parsed.manual_data_request);
                }
                if (parsed.win_probability_home !== undefined) {
                    winProbabilityHome = parsed.win_probability_home;
                }
            };

            const { sawDone } = await consumeSseStream(responseBody, {
                timeoutMs: getCoachStreamReadTimeoutMs(requestMode),
                signal: options?.signal,
                onEvent: ({ event, data: dataStr }) => {
                    if (eventVersion === '2') {
                        const decoded = decodeAiStreamV2Event({ event, data: dataStr });
                        switch (decoded.type) {
                            case 'coach.status':
                                options?.onStatus?.(decoded.data.status);
                                return;
                            case 'coach.preview.chunk':
                                options?.onPreviewChunk?.(
                                    decoded.data.text,
                                    decoded.data.attempt,
                                );
                                return;
                            case 'coach.preview.reset':
                                options?.onPreviewReset?.(decoded.data.attempt);
                                return;
                            case 'coach.message.delta':
                                fullAnswer += decoded.data.delta;
                                if (onStream) onStream(fullAnswer);
                                return;
                            case 'coach.meta':
                                handleV2MetaPayload(decoded.data);
                                return;
                            case 'stream.error':
                                throw createCoachRequestError(
                                    null,
                                    normalizeAiStreamEventError(decoded.data),
                                );
                            case 'stream.done':
                                return;
                            case 'chat.status':
                            case 'chat.queue':
                            case 'chat.message.delta':
                            case 'chat.meta':
                                throw new AiStreamContractError(
                                    `Unexpected chat event on coach stream: ${decoded.type}`,
                                );
                        }
                    }

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
                        handleLegacyMetaPayload(parsed);
                        return;
                    }

                    if (event === 'error') {
                        const code = typeof parsed.code === 'string'
                            ? parsed.code
                            : typeof parsed.message === 'string'
                                ? parsed.message
                                : 'AI_STREAM_EVENT_ERROR';
                        const message = typeof parsed.message === 'string' && parsed.message.trim() !== ''
                            ? parsed.message
                            : '분석 중 오류가 발생했습니다.';
                        throw createCoachRequestError(null, {
                            code,
                            message,
                            detail: typeof parsed.detail === 'string' ? parsed.detail : null,
                            retryable: true,
                            retryAfterSeconds: null,
                            supportedVersions: [],
                        });
                    }
                },
                isTerminalEvent: eventVersion === '2'
                    ? ({ event }) => event === 'stream.done'
                    : undefined,
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
        analysis_type: analysisType,
        analysisType,
        cache_key_version: cacheKeyVersion,
        cache_state: cacheState,
        cached: cached,
        in_progress: inProgress,
        llm_skip_reason: llmSkipReason,
        llmSkipReason,
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
