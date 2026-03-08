import { AxiosError } from 'axios';
import { ApiError } from './api';

export type ErrorType = 'AUTH' | 'PERMISSION' | 'NOT_FOUND' | 'RATE_LIMIT' | 'CONFLICT' | 'SERVER' | 'NETWORK' | 'UNKNOWN';

export interface ParsedError {
    type: ErrorType;
    responseCode?: string;
    message: string;
    statusCode: number | null;
}

export const isNetworkError = (error: unknown): boolean => {
    return (
        error instanceof AxiosError &&
        (error.code === 'ERR_NETWORK' || error.message === 'Network Error')
    );
};

export const parseError = (error: unknown): ParsedError => {
    // Handle Custom ApiError (fetch wrapper)
    if (error instanceof ApiError) {
        const code = error.status;
        const data = error.data || {};
        const serverMessage = data.message || data.error || error.message;
        const responseCode = data.code;

        if (code === 401) {
            return {
                type: 'AUTH',
                responseCode,
                message: serverMessage || '로그인이 필요한 서비스입니다.',
                statusCode: 401,
            };
        }

        if (code === 403) {
            return {
                type: 'PERMISSION',
                responseCode,
                message: serverMessage || '접근 권한이 없습니다.',
                statusCode: 403,
            };
        }

        if (code === 404) {
            return {
                type: 'NOT_FOUND',
                responseCode,
                message: serverMessage || '요청한 정보를 찾을 수 없습니다.',
                statusCode: 404,
            };
        }

        if (code === 409) {
            return {
                type: 'CONFLICT',
                responseCode,
                message: serverMessage || '이미 처리된 요청입니다.',
                statusCode: 409,
            };
        }

        if (code === 429) {
            return {
                type: 'RATE_LIMIT',
                responseCode,
                message: serverMessage || '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
                statusCode: 429,
            };
        }

        if (code >= 500) {
            return {
                type: 'SERVER',
                responseCode,
                message: serverMessage || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                statusCode: code,
            };
        }

        return {
            type: 'UNKNOWN',
            responseCode,
            message: serverMessage || '알 수 없는 오류가 발생했습니다.',
            statusCode: code,
        };
    }

    // Handle AxiosError (legacy or if mixed usage)
    if (error instanceof AxiosError) {
        const code = error.response?.status;
        const data = error.response?.data as Record<string, unknown> | undefined;
        const serverMessage = data?.message as string ||
            data?.error as string ||
            error.message;
        const responseCode = data?.code as string | undefined;

        if (isNetworkError(error)) {
            return {
                type: 'NETWORK',
                responseCode,
                message: '네트워크 연결 상태를 확인해주세요.',
                statusCode: null,
            };
        }

        if (code === 401) {
            return {
                type: 'AUTH',
                responseCode,
                message: (typeof serverMessage === 'string' ? serverMessage : null) || '로그인이 필요한 서비스입니다.',
                statusCode: 401,
            };
        }

        if (code === 403) {
            return {
                type: 'PERMISSION',
                responseCode,
                message: typeof serverMessage === 'string' && serverMessage ? serverMessage : '접근 권한이 없습니다.',
                statusCode: 403,
            };
        }

        if (code === 404) {
            return {
                type: 'NOT_FOUND',
                responseCode,
                message: serverMessage || '요청한 정보를 찾을 수 없습니다.',
                statusCode: 404,
            };
        }

        if (code === 409) {
            return {
                type: 'CONFLICT',
                responseCode,
                message: typeof serverMessage === 'string' && serverMessage ? serverMessage : '이미 처리된 요청입니다.',
                statusCode: 409,
            };
        }

        if (code === 429) {
            return {
                type: 'RATE_LIMIT',
                responseCode,
                message: typeof serverMessage === 'string' && serverMessage ? serverMessage : '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
                statusCode: 429,
            };
        }

        if (code && code >= 500) {
            return {
                type: 'SERVER',
                responseCode,
                message: serverMessage || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                statusCode: code,
            };
        }

        return {
            type: 'UNKNOWN',
            responseCode,
            message: serverMessage || '알 수 없는 오류가 발생했습니다.',
            statusCode: code || null,
        };
    }

    if (error instanceof Error) {
        return {
            type: 'UNKNOWN',
            responseCode: undefined,
            message: error.message,
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
    if (error instanceof ApiError) {
        return error.data?.message || error.data?.error || error.message || fallback;
    }
    if (error instanceof AxiosError) {
        const data = error.response?.data as Record<string, unknown>;
        return (data?.message as string) || (data?.error as string) || error.message || fallback;
    }
    if (error instanceof Error) return error.message;
    return fallback;
}
