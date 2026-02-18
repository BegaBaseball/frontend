import { useEffect, useState } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  message?: string;
  subMessage?: string;
  variant?: 'app' | 'auth' | 'inline';
  fullScreen?: boolean;
  minDurationMs?: number;
  showTagline?: boolean;
  className?: string;
}

type SpinnerSizeMap = Record<NonNullable<LoadingSpinnerProps['size']>, string>;

const sizeClasses: SpinnerSizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const sizeRingClasses: SpinnerSizeMap = {
  sm: 'h-14 w-14',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
};

export default function LoadingSpinner({
  size = 'lg',
  text,
  message,
  subMessage,
  variant,
  fullScreen = true,
  minDurationMs = 0,
  showTagline = true,
  className = '',
}: LoadingSpinnerProps) {
  const [readyToShow, setReadyToShow] = useState(minDurationMs <= 0);
  const resolvedMessage = message ?? text ?? '로딩 중...';
  const resolvedVariant = variant ?? 'inline';

  useEffect(() => {
    if (minDurationMs <= 0) {
      if (!readyToShow) {
        setReadyToShow(true);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setReadyToShow(true);
    }, minDurationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [minDurationMs]);

  if (!readyToShow) return null;

  if (resolvedVariant === 'inline') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${fullScreen ? 'min-h-screen bg-background' : 'py-12'} ${className}`}
      >
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`} />
          {resolvedMessage && <p className="mt-4 text-muted-foreground font-medium text-lg">{resolvedMessage}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative min-h-screen w-full overflow-hidden bg-background ${className} flex items-center justify-center px-6 py-12`}
    >
      <div className="pointer-events-none absolute inset-x-[-15%] -top-12 h-56 w-[130%] rounded-[56px] bg-gradient-to-r from-primary/25 via-primary/10 to-transparent blur-3xl opacity-40" />
      <div className="pointer-events-none absolute right-[-15%] top-[20%] h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-card/70 p-8 text-center backdrop-blur-sm shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
        <div className="mx-auto mb-5 h-4 w-24 rounded-full bg-muted/40" />
        <div className="mx-auto mb-6 relative flex items-center justify-center">
          <div className={`rounded-full border-4 border-border ${sizeRingClasses[size]}`} />
          <div className={`absolute inset-2 rounded-full border-4 border-primary/30 ${sizeRingClasses[size]}`} />
          <div
            className={`absolute h-2 w-2 rounded-full bg-primary animate-pulse ${sizeClasses[size]}`}
            style={{ transform: 'translate(-50%, -50%)', top: '50%', left: '50%' }}
          />
          <div
            className={`absolute inset-0 rounded-full border-t-4 border-b-4 border-primary/80 ${sizeRingClasses[size]} animate-spin`}
          />
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">{resolvedMessage}</p>
        {showTagline && subMessage && <p className="text-sm text-muted-foreground">{subMessage}</p>}
      </div>
    </div>
  );
}
