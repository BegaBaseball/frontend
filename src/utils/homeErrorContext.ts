import axios from 'axios';
import { formatDateForAPI } from './home';

export const buildHomeRequestErrorContext = (error: unknown, endpoint: string, date: Date) => {
    const fallback = {
        endpoint,
        selectedDate: formatDateForAPI(date),
        status: null as number | null,
        responseCode: null as string | null,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown error',
    };

    if (!axios.isAxiosError(error)) {
        return fallback;
    }

    return {
        ...fallback,
        status: error.response?.status ?? null,
        responseCode: error.response?.data?.code ?? null,
        errorName: error.name,
        message: error.message,
    };
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
