import { useErrorModal } from './contexts/ErrorModalContext';
import ErrorFeedbackPanel from './common/ErrorFeedbackPanel';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

export default function GlobalErrorDialog() {
    const { isOpen, message, statusCode, errorId, source, onRetry, closeErrorModal } = useErrorModal();
    const getPrefixText = (code: number | null): string => {
        if (!code) return '⛔ 요청 실패';
        if (code === 404 || code === 409) return '⚠️ 오류 발생';
        if (code >= 500) return '🚨 시스템 오류';
        return '⛔ 요청 실패';
    };

    if (!isOpen || (typeof window !== 'undefined' && window.Cypress)) return null;

    const displayStatusCode = statusCode || 0;
    const handleRetry = onRetry
        ? async () => {
            closeErrorModal();
            await onRetry();
        }
        : null;

    return (
        <AlertDialog open={isOpen} onOpenChange={closeErrorModal}>
            <AlertDialogContent className="border-red-500 sm:max-w-lg">
                <AlertDialogHeader>
                    {/* 서버 메시지를 Title에 직접 표시 */}
                    <AlertDialogTitle className="text-xl font-bold text-red-600">
                        {getPrefixText(statusCode)} (HTTP {displayStatusCode})
                    </AlertDialogTitle>

                    {/* 보조 정보: 오류 유형과 상태 코드를 Description에 표시 */}
                    <AlertDialogDescription className="text-gray-500 mt-2">
                        {message}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <ErrorFeedbackPanel
                    errorId={errorId}
                    source={source}
                    onRetry={handleRetry}
                />
                <AlertDialogFooter>
                    <AlertDialogAction onClick={closeErrorModal}>
                        확인
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
