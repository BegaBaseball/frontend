import type { HomeCoreLoadSuccessState, HomeLoadState } from '../api/homeCore';

interface HomeLoadTelemetryPayload {
    selectedDate: string;
    loadState: HomeLoadState;
    success: HomeCoreLoadSuccessState;
    showConnectionError: boolean;
}

export const logHomeLoadTelemetry = ({
    selectedDate,
    loadState,
    success,
    showConnectionError,
}: HomeLoadTelemetryPayload) => {
    const homeLoadLogContext = {
        selectedDate,
        source: loadState.source,
        isFallback: loadState.isFallback,
        timedOut: loadState.timedOut,
        timedOutSections: loadState.timedOutSections,
        failedSections: loadState.failedSections,
        failureReason: loadState.failureReason,
        success,
    };

    console.info('[HomeLoad]', {
        event: 'home_load_completed',
        ...homeLoadLogContext,
    });

    if (showConnectionError) {
        console.warn('[HomeLoad]', {
            event: loadState.failureReason === 'manual-data-required'
                ? 'home_load_manual_data_required'
                : 'home_load_all_sections_failed',
            ...homeLoadLogContext,
            manualDataRequest: loadState.manualDataRequest,
        });
    }
};
