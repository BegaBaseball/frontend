import { AxiosError } from 'axios';

export type ErrorType = 'AUTH' | 'PERMISSION' | 'NOT_FOUND' | 'RATE_LIMIT' | 'CONFLICT' | 'SERVER' | 'NETWORK' | 'UNKNOWN';

export interface ParsedError {
    type: ErrorType;
    responseCode?: string;
    message: string;
    rawMessage?: string;
    statusCode: number | null;
}

type ApiErrorLike = {
    status: number;
    data?: {
        message?: string;
        error?: string;
        timestamp?: string;
        code?: string;
    } | null;
    message: string;
};

const isApiError = (error: unknown): error is ApiErrorLike =>
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number';

const TECHNICAL_MESSAGE_PATTERNS = [
    /request failed with status code \d+/i,
    /^network error$/i,
    /^api error:/i,
    /timeout of \d+ms exceeded/i,
    /failed to fetch/i,
];

const normalizeErrorText = (value: unknown): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const isTechnicalErrorMessage = (message: string): boolean =>
    TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));

const getDefaultErrorMessage = (type: ErrorType, statusCode: number | null, fallback?: string): string => {
    if (type === 'AUTH' || statusCode === 401) {
        return '로그인 정보를 다시 확인해주세요.';
    }

    if (type === 'RATE_LIMIT' || statusCode === 429) {
        return '요청이 많습니다. 잠시 후 다시 시도해주세요.';
    }

    if (type === 'NETWORK' || (typeof statusCode === 'number' && statusCode >= 500)) {
        return '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.';
    }

    if (type === 'PERMISSION' || statusCode === 403) {
        return '접근 권한이 없습니다.';
    }

    if (type === 'NOT_FOUND' || statusCode === 404) {
        return '요청한 정보를 찾을 수 없습니다.';
    }

    if (type === 'CONFLICT' || statusCode === 409) {
        return '이미 처리된 요청입니다.';
    }

    return fallback || '문제가 발생했습니다. 다시 시도해주세요.';
};

export const getDuplicateCommentErrorMessage = (error: unknown, fallback = '댓글 작성에 실패했습니다.'): string => {
    const parsed = parseError(error);
    if (parsed.responseCode === 'DUPLICATE_COMMENT') {
        return '이미 같은 댓글이 등록되었습니다. 잠시 후 다시 시도해주세요.';
    }
    return parsed.message || fallback;
};

const resolveUserFacingMessage = (
    type: ErrorType,
    statusCode: number | null,
    serverMessage: unknown,
    fallback?: string,
): string => {
    const normalizedServerMessage = normalizeErrorText(serverMessage);

    if (type === 'AUTH') {
        if (
            normalizedServerMessage &&
            !isTechnicalErrorMessage(normalizedServerMessage) &&
            !/^unauthorized$/i.test(normalizedServerMessage) &&
            normalizedServerMessage !== '로그인이 필요한 서비스입니다.'
        ) {
            return normalizedServerMessage;
        }

        return getDefaultErrorMessage(type, statusCode, fallback);
    }

    if (type === 'RATE_LIMIT' || type === 'NETWORK' || type === 'SERVER') {
        return getDefaultErrorMessage(type, statusCode, fallback);
    }
    if (normalizedServerMessage && !isTechnicalErrorMessage(normalizedServerMessage)) {
        return normalizedServerMessage;
    }

    return getDefaultErrorMessage(type, statusCode, fallback);
};

export const isNetworkError = (error: unknown): boolean => {
    return (
        error instanceof AxiosError &&
        (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.message === 'Network Error')
    );
};

export const parseError = (error: unknown): ParsedError => {
    // Handle Custom ApiError (fetch wrapper)
    if (isApiError(error)) {
        const code = error.status;
        const data = error.data || {};
        const rawMessage = normalizeErrorText(data.message || data.error || error.message) || undefined;
        const responseCode = data.code;

        if (code === 401) {
            return {
                type: 'AUTH',
                responseCode,
                message: resolveUserFacingMessage('AUTH', 401, rawMessage),
                rawMessage,
                statusCode: 401,
            };
        }

        if (code === 403) {
            return {
                type: 'PERMISSION',
                responseCode,
                message: resolveUserFacingMessage('PERMISSION', 403, rawMessage),
                rawMessage,
                statusCode: 403,
            };
        }

        if (code === 404) {
            return {
                type: 'NOT_FOUND',
                responseCode,
                message: resolveUserFacingMessage('NOT_FOUND', 404, rawMessage),
                rawMessage,
                statusCode: 404,
            };
        }

        if (code === 409) {
            return {
                type: 'CONFLICT',
                responseCode,
                message: resolveUserFacingMessage('CONFLICT', 409, rawMessage),
                rawMessage,
                statusCode: 409,
            };
        }

        if (code === 429) {
            return {
                type: 'RATE_LIMIT',
                responseCode,
                message: resolveUserFacingMessage('RATE_LIMIT', 429, rawMessage),
                rawMessage,
                statusCode: 429,
            };
        }

        if (code >= 500) {
            return {
                type: 'SERVER',
                responseCode,
                message: resolveUserFacingMessage('SERVER', code, rawMessage),
                rawMessage,
                statusCode: code,
            };
        }

        return {
            type: 'UNKNOWN',
            responseCode,
            message: resolveUserFacingMessage('UNKNOWN', code, rawMessage),
            rawMessage,
            statusCode: code,
        };
    }

    // Handle AxiosError (legacy or if mixed usage)
    if (error instanceof AxiosError) {
        const code = error.response?.status;
        const data = error.response?.data as Record<string, unknown> | undefined;
        const rawMessage = normalizeErrorText(
            (data?.message as string) ||
            data?.error as string ||
            error.message,
        ) || undefined;
        const responseCode = data?.code as string | undefined;

        if (isNetworkError(error)) {
            return {
                type: 'NETWORK',
                responseCode,
                message: resolveUserFacingMessage('NETWORK', null, rawMessage),
                rawMessage,
                statusCode: null,
            };
        }

        if (code === 401) {
            return {
                type: 'AUTH',
                responseCode,
                message: resolveUserFacingMessage('AUTH', 401, rawMessage),
                rawMessage,
                statusCode: 401,
            };
        }

        if (code === 403) {
            return {
                type: 'PERMISSION',
                responseCode,
                message: resolveUserFacingMessage('PERMISSION', 403, rawMessage),
                rawMessage,
                statusCode: 403,
            };
        }

        if (code === 404) {
            return {
                type: 'NOT_FOUND',
                responseCode,
                message: resolveUserFacingMessage('NOT_FOUND', 404, rawMessage),
                rawMessage,
                statusCode: 404,
            };
        }

        if (code === 409) {
            return {
                type: 'CONFLICT',
                responseCode,
                message: resolveUserFacingMessage('CONFLICT', 409, rawMessage),
                rawMessage,
                statusCode: 409,
            };
        }

        if (code === 429) {
            return {
                type: 'RATE_LIMIT',
                responseCode,
                message: resolveUserFacingMessage('RATE_LIMIT', 429, rawMessage),
                rawMessage,
                statusCode: 429,
            };
        }

        if (code && code >= 500) {
            return {
                type: 'SERVER',
                responseCode,
                message: resolveUserFacingMessage('SERVER', code, rawMessage),
                rawMessage,
                statusCode: code,
            };
        }

        return {
            type: 'UNKNOWN',
            responseCode,
            message: resolveUserFacingMessage('UNKNOWN', code || null, rawMessage),
            rawMessage,
            statusCode: code || null,
        };
    }

    if (error instanceof Error) {
        const rawMessage = normalizeErrorText(error.message) || undefined;
        return {
            type: 'UNKNOWN',
            responseCode: undefined,
            message: resolveUserFacingMessage('UNKNOWN', null, rawMessage),
            rawMessage,
            statusCode: null,
        };
    }

    return {
        type: 'UNKNOWN',
        responseCode: undefined,
        message: '알 수 없는 오류가 발생했습니다.',
        statusCode: null,
    };
};

/** API 에러에서 메시지 추출 (catch(error: unknown) 패턴용) */
export function getApiErrorMessage(error: unknown, fallback: string): string {
    const parsed = parseError(error);
    if (parsed.type === 'UNKNOWN' && (!parsed.rawMessage || isTechnicalErrorMessage(parsed.rawMessage))) {
        return fallback;
    }
    return parsed.message || fallback;
}
