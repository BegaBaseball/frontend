import { useTheme } from '../hooks/useTheme';
import { MoonIcon, SunIcon } from './icons/PublicShellIcons';

interface ThemeToggleButtonProps {
  className?: string;
  iconClassName?: string;
  ariaLabelDark?: string;
  ariaLabelLight?: string;
}

export default function ThemeToggleButton({
  className = '',
  iconClassName = 'h-6 w-6',
  ariaLabelDark = '다크 모드로 변경',
  ariaLabelLight = '라이트 모드로 변경',
}: ThemeToggleButtonProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';
  const nextTheme = isDarkMode ? 'light' : 'dark';

  const handleThemeToggle = () => {
    if (typeof setTheme === 'function') {
      setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextTheme);
    localStorage?.setItem('kbo-theme', nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleThemeToggle}
      aria-label={isDarkMode ? ariaLabelLight : ariaLabelDark}
      className={`relative inline-flex p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary ${className}`}
    >
      {isDarkMode ? <SunIcon className={iconClassName} /> : <MoonIcon className={iconClassName} />}
    </button>
  );
}
