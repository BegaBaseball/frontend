import ErrorFeedbackPanel from './ErrorFeedbackPanel';

interface ErrorBoundaryFallbackProps {
  errorId?: string;
  debugMessage?: string;
  onRetry: () => void;
}

export default function ErrorBoundaryFallback({
  errorId,
  debugMessage,
  onRetry,
}: ErrorBoundaryFallbackProps) {
  const shouldShowDebugMessage = typeof window !== 'undefined' && 'Cypress' in window && Boolean(debugMessage);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-black leading-none text-red-600 dark:text-red-400" aria-hidden="true">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">문제가 발생했습니다</h1>
        <p className="text-gray-600 dark:text-white mb-8">
          일시적인 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </p>
        {shouldShowDebugMessage && (
          <pre className="mb-4 max-h-28 overflow-auto rounded-lg bg-gray-100 p-3 text-left text-xs text-gray-700">
            {debugMessage}
          </pre>
        )}
        <ErrorFeedbackPanel
          errorId={errorId}
          source="runtime"
          onRetry={onRetry}
          onReload={() => window.location.reload()}
        />
      </div>
    </div>
  );
}
