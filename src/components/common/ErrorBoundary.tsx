import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 커스텀 에러 fallback UI. 제공하지 않으면 기본 UI가 표시됩니다. */
  fallback?: React.ReactNode;
  /** 에러 발생 시 호출되는 콜백 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary
 *
 * 하위 컴포넌트 트리에서 발생한 JavaScript 에러를 잡아
 * 에러 화면을 렌더링합니다. React의 class 기반 API를 사용합니다.
 *
 * 사용 예시:
 * ```tsx
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 *
 * // 커스텀 fallback
 * <ErrorBoundary fallback={<div>오류가 발생했습니다.</div>}>
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo);

    // 개발 환경에서는 콘솔에 상세 정보를 출력합니다.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-white p-8 text-center dark:bg-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            문제가 발생했습니다
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            일시적인 오류입니다. 페이지를 새로고침해 주세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            페이지 새로고침
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
