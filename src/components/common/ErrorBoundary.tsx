import React, { Component, ErrorInfo, ReactNode, Suspense, lazy } from 'react';

const LazyErrorBoundaryFallback = lazy(() => import('./ErrorBoundaryFallback'));

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
  resetCount: number;
}

const createClientErrorEventId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `client-error-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

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
    console.error('Uncaught error:', error, errorInfo);
    void import('../../utils/clientErrorReporter').then(({ reportRuntimeError }) => {
      const errorId = reportRuntimeError({
        eventId: this.state.errorId,
        error,
        source: 'runtime',
        componentStack: errorInfo.componentStack,
      });

      if (errorId !== this.state.errorId) {
        this.setState({ errorId });
      }
    });
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
        <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
          <LazyErrorBoundaryFallback
            errorId={this.state.errorId}
            onRetry={this.resetErrorBoundary}
          />
        </Suspense>
      );
    }

    return <React.Fragment key={this.state.resetCount}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
