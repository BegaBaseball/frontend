import type { CSSProperties } from 'react';

const HOME_MATCH_RETRY_BUTTON_CLASS = 'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-background px-4 text-15 font-semibold text-foreground transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 dark:border-input dark:bg-input/30 dark:hover:bg-input/50';
const HOME_MATCH_ERROR_PANEL_CLASS = 'flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-card rounded-2xl border border-red-100 dark:border-red-900/40 shadow-sm';
const HOME_MATCH_ERROR_ICON_FRAME_CLASS = 'bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4';
const HOME_MATCH_REFRESH_ICON_CLASS = 'mr-1.5 inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent';
const HOME_MATCH_WARNING_ICON_CLASS = 'text-4xl font-black leading-none text-red-500 dark:text-red-400';
const MATCH_PRIORITY_REGION_PROPS = {
  'aria-label': '오늘 경기 중심 영역',
  'data-priority': 'primary',
  'data-testid': 'home-match-priority-panel',
} as const;

interface HomeMatchPanelErrorStateProps {
  style: CSSProperties;
  title: string;
  description: string;
  suppressRecoveryActions: boolean;
  compact?: boolean;
  onRetry: () => void;
}

export default function HomeMatchPanelErrorState({
  style,
  title,
  description,
  suppressRecoveryActions,
  compact = false,
  onRetry,
}: HomeMatchPanelErrorStateProps) {
  return (
    <div className={HOME_MATCH_ERROR_PANEL_CLASS} style={style} {...MATCH_PRIORITY_REGION_PROPS}>
      <div className={HOME_MATCH_ERROR_ICON_FRAME_CLASS}>
        <span className={HOME_MATCH_WARNING_ICON_CLASS} aria-hidden="true">!</span>
      </div>
      <p className="text-gray-700 dark:text-white font-bold mb-1">
        {title}
      </p>
      <p className={compact
        ? 'text-gray-500 dark:text-white text-body font-bold mt-1'
        : 'text-gray-400 dark:text-white text-body font-bold mb-4'}
      >
        {description}
      </p>
      {suppressRecoveryActions ? (
        <p className={`${compact ? 'mt-3 ' : ''}text-body font-bold text-gray-500 dark:text-white`}>
          위의 전체 다시 시도 버튼으로 한 번에 확인하세요.
        </p>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className={`${HOME_MATCH_RETRY_BUTTON_CLASS} ${compact ? 'mt-3 ' : ''}border-primary/30 font-bold text-primary hover:bg-primary/5`}
        >
          <span className={HOME_MATCH_REFRESH_ICON_CLASS} aria-hidden="true" />
          다시 시도
        </button>
      )}
    </div>
  );
}
