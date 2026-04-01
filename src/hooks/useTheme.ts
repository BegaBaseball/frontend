import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const normalizeTheme = (value: string | null | undefined, fallback: Theme = 'system'): Theme => {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return fallback;
};

const resolveTheme = (theme: Theme, enableSystem: boolean, systemTheme: ResolvedTheme): ResolvedTheme => {
  if (theme === 'system') {
    return enableSystem ? systemTheme : 'light';
  }

  return theme;
};

const applyTheme = (attribute: string, resolvedTheme: ResolvedTheme) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const backgroundColor = resolvedTheme === 'dark' ? '#020617' : '#ffffff';

  if (attribute === 'class') {
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }

  root.style.colorScheme = resolvedTheme;
  root.style.backgroundColor = resolvedTheme === 'dark' ? '#020617' : '';

  if (document.body) {
    document.body.style.backgroundColor = backgroundColor;
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta instanceof HTMLMetaElement) {
    themeColorMeta.content = backgroundColor;
  }
};

const disableTransitionsTemporarily = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.appendChild(document.createTextNode('*{transition:none!important}'));
  document.head.appendChild(style);

  return () => {
    void window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
};

const defaultThemeContext: ThemeContextValue = {
  theme: 'system',
  resolvedTheme: getSystemTheme(),
  systemTheme: getSystemTheme(),
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContext);

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  storageKey = 'kbo-theme',
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }

    try {
      return normalizeTheme(window.localStorage.getItem(storageKey), defaultTheme);
    } catch {
      return defaultTheme;
    }
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme = useMemo(
    () => resolveTheme(theme, enableSystem, systemTheme),
    [enableSystem, systemTheme, theme],
  );

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(normalizeTheme(nextTheme, defaultTheme));
  }, [defaultTheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener?.('change', updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener?.('change', updateSystemTheme);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      setThemeState(normalizeTheme(event.newValue, defaultTheme));
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (theme === 'system') {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, theme);
      }
    } catch {
      // Ignore storage sync failures and continue with in-memory theme state.
    }
  }, [storageKey, theme]);

  useEffect(() => {
    const restoreTransitions = disableTransitionOnChange ? disableTransitionsTemporarily() : undefined;
    applyTheme(attribute, resolvedTheme);
    restoreTransitions?.();
  }, [attribute, disableTransitionOnChange, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
  }), [resolvedTheme, setTheme, systemTheme, theme]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}
