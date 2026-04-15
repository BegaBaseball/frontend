import { formatDateForAPI } from './home';
import { PublicApiError } from '../api/publicClient';

type AxiosLikeError = {
    isAxiosError: boolean;
    name?: string;
    message?: string;
    response?: {
        status?: number | null;
        data?: {
            code?: string | null;
        } | null;
    } | null;
};

type PublicApiLikeError = {
    name?: string;
    message?: string;
    status: number;
    data?: {
        code?: string | null;
    } | null;
};

const isAxiosLikeError = (error: unknown): error is AxiosLikeError =>
    typeof error === 'object'
    && error !== null
    && (error as { isAxiosError?: unknown }).isAxiosError === true;

const isPublicApiLikeError = (error: unknown): error is PublicApiLikeError =>
    error instanceof PublicApiError
    || (
        typeof error === 'object'
        && error !== null
        && 'status' in error
        && typeof (error as { status?: unknown }).status === 'number'
    );

export const buildHomeRequestErrorContext = (error: unknown, endpoint: string, date: Date) => {
    const fallback = {
        endpoint,
        selectedDate: formatDateForAPI(date),
        status: null as number | null,
        responseCode: null as string | null,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error',
    };

    if (isPublicApiLikeError(error)) {
        return {
            ...fallback,
            status: error.status,
            responseCode: error.data?.code ?? null,
            errorName: error.name ?? fallback.errorName,
            message: error.message ?? fallback.message,
        };
    }

    if (isAxiosLikeError(error)) {
        return {
            ...fallback,
            status: error.response?.status ?? null,
            responseCode: error.response?.data?.code ?? null,
            errorName: error.name ?? fallback.errorName,
            message: error.message ?? fallback.message,
        };
    }

    return fallback;
};

export interface HomeNavigationState {
    prev: string | null;
    next: string | null;
    hasPrev: boolean;
    hasNext: boolean;
}

export const buildHomeNavigationState = (data?: {
    prevGameDate?: string | null;
    nextGameDate?: string | null;
    hasPrev?: boolean;
    hasNext?: boolean;
} | null): HomeNavigationState => ({
    prev: data?.prevGameDate ?? null,
    next: data?.nextGameDate ?? null,
    hasPrev: data?.hasPrev ?? Boolean(data?.prevGameDate),
    hasNext: data?.hasNext ?? Boolean(data?.nextGameDate),
});
