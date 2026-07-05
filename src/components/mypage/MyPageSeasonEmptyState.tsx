import type { ReactNode } from 'react';

type MyPageSeasonEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  tone?: 'default' | 'danger';
};

export default function MyPageSeasonEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
  tone = 'default',
}: MyPageSeasonEmptyStateProps) {
  const classes = [
    'mypage-season-empty',
    tone === 'danger' ? 'is-danger' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {icon && (
        <span className="mypage-season-empty-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <strong className="mypage-season-empty-title">{title}</strong>
      {description && (
        <p className="mypage-season-empty-copy">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          className="mypage-season-empty-action"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
