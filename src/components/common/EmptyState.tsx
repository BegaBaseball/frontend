import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

type EmptyStateTone = 'neutral' | 'warning' | 'danger';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  testId?: string;
  tone?: EmptyStateTone;
  className?: string;
  contentClassName?: string;
}

const toneClasses: Record<EmptyStateTone, string> = {
  neutral: 'border-border/70 bg-card/80 text-card-foreground',
  warning: 'border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100',
  danger: 'border-rose-200/70 bg-rose-50/80 text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-100',
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  testId = 'empty-state',
  tone = 'neutral',
  className,
  contentClassName,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex min-h-[180px] flex-col items-center justify-center rounded-2xl border px-5 py-8 text-center shadow-sm',
        toneClasses[tone],
        className,
      )}
    >
      <div className={cn('flex max-w-md flex-col items-center', contentClassName)}>
        {icon ? (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background/80 text-current shadow-inner">
            {icon}
          </div>
        ) : null}
        <h3 className="text-18 font-bold leading-snug tracking-normal text-current">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-15 font-semibold leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
