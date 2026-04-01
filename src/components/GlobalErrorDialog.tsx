import { lazy, Suspense, useEffect, useState } from 'react';
import type { ErrorModalState, GlobalApiErrorDetail } from '../types/error';
import { shouldIgnoreGlobalApiError } from './contexts/errorModalGuards';

const LazyGlobalErrorDialogContent = lazy(() => import('./GlobalErrorDialogContent'));

const initialState: ErrorModalState = {
    isOpen: false,
    message: '',
    statusCode: null,
    errorId: null,
    source: 'api',
    onRetry: null,
};

export default function GlobalErrorDialog() {
    const [state, setState] = useState<ErrorModalState>(initialState);
    const getPrefixText = (code: number | null): string => {
        if (!code) return '⛔ 요청 실패';
        if (code === 404 || code === 409) return '⚠️ 오류 발생';
        if (code >= 500) return '🚨 시스템 오류';
        return '⛔ 요청 실패';
    };

    useEffect(() => {
        const handleGlobalError = (event: Event) => {
            const customEvent = event as CustomEvent<GlobalApiErrorDetail | undefined>;
            const errorData = customEvent.detail;
            if (shouldIgnoreGlobalApiError(errorData, window.location.pathname)) {
                return;
            }

            setState({
                isOpen: true,
                message: (errorData?.message || '').toString(),
                statusCode: errorData?.statusCode ?? null,
                errorId: errorData?.errorId ?? null,
                source: errorData?.source ?? 'api',
                onRetry: errorData?.onRetry ?? null,
            });
        };

        window.addEventListener('global-api-error', handleGlobalError);
        return () => {
            window.removeEventListener('global-api-error', handleGlobalError);
        };
    }, []);

    const closeErrorModal = () => {
        setState(initialState);
    };

    if (!state.isOpen || (typeof window !== 'undefined' && window.Cypress)) return null;

    const handleRetry = state.onRetry
        ? async () => {
            closeErrorModal();
            await state.onRetry?.();
        }
        : null;

    return (
        <Suspense fallback={null}>
            <LazyGlobalErrorDialogContent
                isOpen={state.isOpen}
                message={state.message}
                statusCode={state.statusCode}
                errorId={state.errorId}
                source={state.source}
                prefixText={getPrefixText(state.statusCode)}
                onRetry={handleRetry}
                closeErrorModal={closeErrorModal}
            />
        </Suspense>
    );
}
