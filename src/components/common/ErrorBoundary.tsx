import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorFeedbackPanel from './ErrorFeedbackPanel';
import { createClientErrorEventId, reportRuntimeError } from '../../utils/clientErrorReporter';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  resetCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    resetCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return {
      hasError: true,
      error,
      errorId: createClientErrorEventId(),
      resetCount: 0,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = reportRuntimeError({
      eventId: this.state.errorId,
      error,
      source: 'runtime',
      componentStack: errorInfo.componentStack,
    });
    console.error('Uncaught error:', error, errorInfo);
    if (errorId !== this.state.errorId) {
      this.setState({ errorId });
    }
  }

  private resetErrorBoundary = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorId: undefined,
      resetCount: prevState.resetCount + 1,
    }));
  }

  public render() {
    if (this.state.hasError) {
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
              errorId={this.state.errorId}
              source="runtime"
              onRetry={this.resetErrorBoundary}
              onReload={() => window.location.reload()}
            />
          </div>
        </div>
      );
    }

    return <React.Fragment key={this.state.resetCount}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
