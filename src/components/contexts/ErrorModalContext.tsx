import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorModalContextType, ErrorData, ErrorModalState } from '../../types/error';

// 1. Context 생성 (초기값은 null, 타입 지정)
const ErrorModalContext = createContext<ErrorModalContextType | null>(null);

// Provider props 타입 정의
interface ErrorModalProviderProps {
    children: ReactNode;
}

// 2. Provider 컴포넌트
export function ErrorModalProvider({ children }: ErrorModalProviderProps) {
    const [state, setState] = useState<ErrorModalState>({
        isOpen: false,
        message: '',
        statusCode: null,
    });

    // 모달을 열고 상태를 설정하는 함수
    const openErrorModal = useCallback(({ message, statusCode }: ErrorData) => {
        setState({
            isOpen: true,
            message,
            statusCode,
        });
    }, []);

    // 모달을 닫는 함수
    const closeErrorModal = useCallback(() => {
        setState({
            isOpen: false,
            message: '',
            statusCode: null,
        });
    }, []);

    // 전역 에러 이벤트 리스너
    React.useEffect(() => {
        const handleGlobalError = (event: Event) => {
            const customEvent = event as CustomEvent;
            const errorData = customEvent.detail;
            openErrorModal({
                message: errorData.message,
                statusCode: errorData.statusCode,
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