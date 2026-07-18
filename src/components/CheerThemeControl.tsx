import { useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
import { getDarkModeAccentText } from '../utils/teamColors';

interface CheerThemeControlProps {
  accentColor: string;
  compact?: boolean;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export default function CheerThemeControl({ accentColor, compact = false }: CheerThemeControlProps) {
  const { theme, resolvedTheme, systemTheme, setTheme } = useTheme();
  const activeAccentText = useMemo(
    () => (resolvedTheme === 'dark' ? getDarkModeAccentText(accentColor) : accentColor),
    [accentColor, resolvedTheme],
  );

  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--cheer-line-10)] bg-[var(--cheer-sub-card)]',
        compact ? 'p-3' : 'p-4',
      )}
      aria-labelledby="cheer-theme-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="cheer-theme-heading" className="text-body font-black text-slate-900 dark:text-white">
          화면 테마
        </h2>
        <span className="text-caption font-bold text-slate-500 dark:text-slate-300">
          {theme === 'system' ? `OS ${systemTheme === 'dark' ? '다크' : '라이트'}` : resolvedTheme === 'dark' ? '다크' : '라이트'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-[var(--cheer-panel-bg)] p-1">
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setTheme(option.value)}
              className={cn(
                'min-h-9 whitespace-nowrap rounded-full px-2 text-caption font-black transition-colors active:scale-[0.98]',
                isActive
                  ? 'bg-[var(--cheer-seg-on)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'text-slate-600 hover:bg-white dark:text-white dark:hover:bg-card',
              )}
              style={isActive ? { color: activeAccentText } : undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
