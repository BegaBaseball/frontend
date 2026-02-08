import { AxiosError } from 'axios';

export type ErrorType = 'AUTH' | 'PERMISSION' | 'NOT_FOUND' | 'SERVER' | 'NETWORK' | 'UNKNOWN';

export interface ParsedError {
    type: ErrorType;
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
    if (error instanceof AxiosError) {
        const code = error.response?.status;
        const serverMessage = (error.response?.data as any)?.message || error.message;

        if (isNetworkError(error)) {
            return {
                type: 'NETWORK',
                message: '네트워크 연결 상태를 확인해주세요.',
                statusCode: null,
            };
        }

        if (code === 401) {
            return {
                type: 'AUTH',
                message: '로그인이 필요한 서비스입니다.',
                statusCode: 401,
            };
        }

        if (code === 403) {
            return {
                type: 'PERMISSION',
                message: '접근 권한이 없습니다.',
                statusCode: 403,
            };
        }

        if (code === 404) {
            return {
                type: 'NOT_FOUND',
                message: serverMessage || '요청한 정보를 찾을 수 없습니다.',
                statusCode: 404,
            };
        }

        if (code && code >= 500) {
            return {
                type: 'SERVER',
                message: serverMessage || '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                statusCode: code,
            };
        }

        return {
            type: 'UNKNOWN',
            message: serverMessage || '알 수 없는 오류가 발생했습니다.',
            statusCode: code || null,
        };
    }

    if (error instanceof Error) {
        return {
            type: 'UNKNOWN',
            message: error.message,
            statusCode: null,
        };
    }

    return {
        type: 'UNKNOWN',
        message: '알 수 없는 오류가 발생했습니다.',
        statusCode: null,
    };
};
