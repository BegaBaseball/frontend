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

    const value: ErrorModalContextType = {
        ...state,
        openErrorModal,
        closeErrorModal,
    };

    return (
        <ErrorModalContext.Provider value={value}>
            {children}
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