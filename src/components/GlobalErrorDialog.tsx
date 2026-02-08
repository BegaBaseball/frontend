import { useErrorModal } from './contexts/ErrorModalContext';
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
    const { isOpen, message, statusCode, closeErrorModal } = useErrorModal();
    const getPrefixText = (code: number | null): string => {
        if (!code) return '⛔ 요청 실패';
        if (code === 404 || code === 409) return '⚠️ 오류 발생';
        if (code >= 500) return '🚨 시스템 오류';
        return '⛔ 요청 실패';
    };

    if (!isOpen || (typeof window !== 'undefined' && (window as any).Cypress)) return null;

    const displayStatusCode = statusCode || 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={closeErrorModal}>
            <AlertDialogContent className="border-red-500">
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
                <AlertDialogFooter>
                    <AlertDialogAction onClick={closeErrorModal}>
                        확인
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}