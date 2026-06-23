export type ErrorSource = 'runtime' | 'unhandled_rejection' | 'api';
export type ErrorRetryHandler = (() => Promise<void> | void) | null;

// 모달을 열 때 전달되는 오류 데이터의 타입
export interface ErrorData {
    message: string;
    statusCode: number | null;
    errorId?: string | null;
    source?: ErrorSource;
    onRetry?: ErrorRetryHandler;
}

// Context에서 관리하는 상태의 타입
export interface ErrorModalState {
    isOpen: boolean;
    message: string;
    statusCode: number | null; // 초기에는 null일 수 있음
    errorId: string | null;
    source: ErrorSource;
    onRetry: ErrorRetryHandler;
}

// Context에서 노출되는 값과 함수의 타입
export interface ErrorModalContextType extends ErrorModalState {
    openErrorModal: (data: ErrorData) => void;
    closeErrorModal: () => void;
}

export interface ServerErrorResponse {
    success?: false;
    message?: string;
    code?: string;
    data?: unknown;
    errors?: Record<string, string>;
    status?: number;
}

export interface GlobalApiErrorDetail extends ErrorData {
    responseCode?: string;
    endpoint?: string | null;
}
