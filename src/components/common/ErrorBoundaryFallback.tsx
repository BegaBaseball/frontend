import ErrorFeedbackPanel from './ErrorFeedbackPanel';

interface ErrorBoundaryFallbackProps {
  errorId?: string;
  onRetry: () => void;
}

export default function ErrorBoundaryFallback({
  errorId,
  onRetry,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">문제가 발생했습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          일시적인 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
        </p>
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
