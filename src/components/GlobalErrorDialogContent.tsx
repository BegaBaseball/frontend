import ErrorFeedbackPanel from './common/ErrorFeedbackPanel';
import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';

interface GlobalErrorDialogContentProps {
    isOpen: boolean;
    message: string;
    statusCode: number | null;
    errorId: string | null;
    source: string | null;
    prefixText: string;
    onRetry: (() => Promise<void>) | null;
    closeErrorModal: () => void;
}

export default function GlobalErrorDialogContent({
    isOpen,
    message,
    statusCode,
    errorId,
    source,
    prefixText,
    onRetry,
    closeErrorModal,
}: GlobalErrorDialogContentProps) {
    return (
        <PlainDialog
            open={isOpen}
            onClose={closeErrorModal}
            title={<span className="text-xl font-bold text-red-600">{prefixText} (HTTP {statusCode || 0})</span>}
            description={message}
            className="sm:max-w-lg border-red-500"
            footer={(
                <Button type="button" onClick={closeErrorModal}>
                    확인
                </Button>
            )}
        >
            <ErrorFeedbackPanel
                errorId={errorId}
                source={source}
                onRetry={onRetry}
            />
        </PlainDialog>
    );
}
