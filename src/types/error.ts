// 모달을 열 때 전달되는 오류 데이터의 타입
export interface ErrorData {
    message: string;
    statusCode: number;
}

// Context에서 관리하는 상태의 타입
export interface ErrorModalState {
    isOpen: boolean;
    message: string;
    statusCode: number | null; // 초기에는 null일 수 있음
}

// Context에서 노출되는 값과 함수의 타입
export interface ErrorModalContextType extends ErrorModalState {
    openErrorModal: (data: ErrorData) => void;
    closeErrorModal: () => void;
}

export interface ServerErrorResponse {
    status: number;
    error: string; // HTTP 상태 코드 텍스트 ("Conflict", "Not Found" 등)
    message: string; // GlobalExceptionHandler가 던지는 상세 메시지
    timestamp: string;
}