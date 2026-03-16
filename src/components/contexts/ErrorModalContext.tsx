import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorModalContextType, ErrorData, ErrorModalState, GlobalApiErrorDetail } from '../../types/error';
import { shouldIgnoreGlobalApiError } from './errorModalGuards';

// 1. Context 생성 (초기값은 null, 타입 지정)
const ErrorModalContext = createContext<ErrorModalContextType | null>(null);

// Provider props 타입 정의
interface ErrorModalProviderProps {
    children: ReactNode;
}

// 2. Provider 컴포넌트
export function ErrorModalProvider({ children }: ErrorModalProviderProps) {
    const initialState: ErrorModalState = {
        isOpen: false,
        message: '',
        statusCode: null,
        errorId: null,
        source: 'api',
        onRetry: null,
    };
    const [state, setState] = useState<ErrorModalState>(initialState);

    // 모달을 열고 상태를 설정하는 함수
    const openErrorModal = useCallback(({ message, statusCode, errorId, source = 'api', onRetry = null }: ErrorData) => {
        setState({
            isOpen: true,
            message,
            statusCode,
            errorId: errorId ?? null,
            source,
            onRetry,
        });
    }, []);

    // 모달을 닫는 함수
    const closeErrorModal = useCallback(() => {
        setState(initialState);
    }, [initialState]);

    // 전역 에러 이벤트 리스너
    React.useEffect(() => {
        const handleGlobalError = (event: Event) => {
            const customEvent = event as CustomEvent<GlobalApiErrorDetail | undefined>;
            const errorData = customEvent.detail;
            if (shouldIgnoreGlobalApiError(errorData, window.location.pathname)) {
                return;
            }

            const message = (errorData?.message || '').toString();
            const statusCode = errorData?.statusCode ?? null;
            openErrorModal({
                message,
                statusCode,
                errorId: errorData?.errorId ?? null,
                source: errorData?.source ?? 'api',
                onRetry: errorData?.onRetry ?? null,
            });
        };

        window.addEventListener('global-api-error', handleGlobalError);
        return () => {
            window.removeEventListener('global-api-error', handleGlobalError);
        };
    }, [openErrorModal]);

    const value: ErrorModalContextType = {
        ...state,
        openErrorModal,
        closeErrorModal,
    };

    return (
        <ErrorModalContext.Provider value={value}>
            {children}
            {/* GlobalErrorDialog 컴포넌트를 Provider 내부에서 렌더링하면 사용 편의성 증가 (선택사항) */}
        </ErrorModalContext.Provider>
    );
}

// 3. Custom Hook (반드시 Context 타입 검사)
export function useErrorModal(): ErrorModalContextType {
    const context = useContext(ErrorModalContext);
    if (!context) {
        throw new Error('useErrorModal must be used within an ErrorModalProvider');
    }
    return context;
}
