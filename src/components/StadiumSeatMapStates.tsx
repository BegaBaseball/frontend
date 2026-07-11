import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

import { RefreshIcon, WarningTriangleIcon } from './icons/StadiumGuideIcons';

interface StadiumSeatMapStateProps {
  label?: string;
  stadiumName?: string | null;
}

export function StadiumSeatMapLoadingSkeleton({ label, stadiumName }: StadiumSeatMapStateProps) {
  return (
    <div
      data-testid="stadium-seatmap-loading"
      className="stadium-seatmap-state-card overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-primary">좌석도 로딩 중</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-600 dark:text-white">
            {stadiumName || '선택한 구장'}
          </p>
          {label && (
            <p className="mt-1 truncate text-xs font-black text-slate-400 dark:text-white">
              {label}
            </p>
          )}
        </div>
        <div className="stadium-seatmap-state-block h-8 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="stadium-seatmap-state-inner min-h-[320px] animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="stadium-seatmap-state-block h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="stadium-seatmap-state-block h-24 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
          <div className="stadium-seatmap-state-block h-24 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
          <div className="stadium-seatmap-state-block h-24 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
        </div>
        <div className="mt-5 space-y-3">
          <div className="stadium-seatmap-state-block h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="stadium-seatmap-state-block h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="stadium-seatmap-state-block h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

export function StadiumSeatMapManualRequired({ stadiumName }: StadiumSeatMapStateProps) {
  return (
    <div
      data-testid="stadium-seatmap-manual-required"
      data-error-code="MANUAL_BASEBALL_DATA_REQUIRED"
      className="stadium-seatmap-state-card flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/70 px-5 py-10 text-center shadow-sm dark:border-amber-500/40 dark:bg-amber-950/20"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <WarningTriangleIcon className="h-6 w-6" />
      </div>
      <p className="rounded-full bg-amber-100 px-3 py-1 text-11 font-black text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
        좌석도 준비 중
      </p>
      <h4 className="mt-3 text-lg font-black text-slate-900 dark:text-white">
        {stadiumName || '선택한 구장'} 좌석도는 준비 중입니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-white">
        공식 좌석도와 선택 영역 검수가 끝나면 이 자리에서 바로 확인할 수 있습니다.
      </p>
    </div>
  );
}

export function StadiumSeatMapErrorFallback({
  stadiumName,
  onRetry,
}: StadiumSeatMapStateProps & { onRetry: () => void }) {
  return (
    <div
      data-testid="stadium-seatmap-error"
      className="stadium-seatmap-state-card flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/70 px-5 py-10 text-center shadow-sm dark:border-red-400/40 dark:bg-red-950/20"
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <WarningTriangleIcon className="h-6 w-6" />
      </div>
      <h4 className="text-lg font-black text-slate-900 dark:text-white">
        {stadiumName || '선택한 구장'} 좌석도를 불러오지 못했습니다
      </h4>
      <p className="mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-white">
        공식 좌석도 모듈을 다시 불러올 수 있습니다. 반복되면 공식 좌석도 asset과 hit-area 데이터를 확인해야 합니다.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
      >
        <RefreshIcon className="h-4 w-4" />
        다시 시도
      </button>
    </div>
  );
}

interface StadiumSeatMapErrorBoundaryProps {
  children: ReactNode;
  fallback: (onRetry: () => void) => ReactNode;
  resetKey: string;
}

interface StadiumSeatMapErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

export class StadiumSeatMapErrorBoundary extends Component<StadiumSeatMapErrorBoundaryProps, StadiumSeatMapErrorBoundaryState> {
  public state: StadiumSeatMapErrorBoundaryState = {
    hasError: false,
    retryCount: 0,
  };

  public static getDerivedStateFromError(): Partial<StadiumSeatMapErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Stadium seat map render error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: StadiumSeatMapErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, retryCount: 0 });
    }
  }

  private retry = () => {
    this.setState((state) => ({
      hasError: false,
      retryCount: state.retryCount + 1,
    }));
  };

  public render() {
    if (this.state.hasError) {
      return this.props.fallback(this.retry);
    }

    return (
      <Fragment key={`${this.props.resetKey}:${this.state.retryCount}`}>
        {this.props.children}
      </Fragment>
    );
  }
}
