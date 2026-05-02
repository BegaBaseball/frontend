import { formatDateForAPI } from './home';
import { PublicApiError } from '../api/publicClient';
import type { ManualBaseballDataRequest } from '../types/manualBaseballData';

type AxiosLikeError = {
    isAxiosError: boolean;
    name?: string;
    message?: string;
    response?: {
        status?: number | null;
        data?: {
            code?: string | null;
            data?: unknown;
        } | null;
    } | null;
};

type PublicApiLikeError = {
    name?: string;
    message?: string;
    status: number;
    data?: {
        code?: string | null;
        data?: unknown;
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

const isManualBaseballDataRequest = (value: unknown): value is ManualBaseballDataRequest => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Partial<ManualBaseballDataRequest>;
    return typeof candidate.scope === 'string'
        && Array.isArray(candidate.missingItems)
        && typeof candidate.operatorMessage === 'string'
        && typeof candidate.blocking === 'boolean';
};

const extractManualBaseballDataRequest = (data: unknown): ManualBaseballDataRequest | null => {
    if (!data || typeof data !== 'object') {
        return null;
    }

    const envelope = data as { code?: unknown; data?: unknown };
    if (isManualBaseballDataRequest(envelope.data)) {
        return {
            ...envelope.data,
            code: typeof envelope.code === 'string' ? envelope.code : envelope.data.code,
        };
    }

    if (isManualBaseballDataRequest(data)) {
        return data;
    }

    return null;
};

export const buildHomeRequestErrorContext = (error: unknown, endpoint: string, date: Date) => {
    const fallback = {
        endpoint,
        selectedDate: formatDateForAPI(date),
        status: null as number | null,
        responseCode: null as string | null,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error',
        manualDataRequest: null as ManualBaseballDataRequest | null,
    };

    if (isPublicApiLikeError(error)) {
        return {
            ...fallback,
            status: error.status,
            responseCode: error.data?.code ?? null,
            errorName: error.name ?? fallback.errorName,
            message: error.message ?? fallback.message,
            manualDataRequest: extractManualBaseballDataRequest(error.data),
        };
    }

    if (isAxiosLikeError(error)) {
        return {
            ...fallback,
            status: error.response?.status ?? null,
            responseCode: error.response?.data?.code ?? null,
            errorName: error.name ?? fallback.errorName,
            message: error.message ?? fallback.message,
            manualDataRequest: extractManualBaseballDataRequest(error.response?.data),
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
