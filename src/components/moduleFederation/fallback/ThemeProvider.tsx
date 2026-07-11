import type { ReactNode } from 'react';

interface FallbackDesignSystemThemeProviderProps {
  children?: ReactNode;
  theme?: string;
  defaultTheme?: string;
}

export function ThemeProvider({ children }: FallbackDesignSystemThemeProviderProps) {
  return <>{children}</>;
}

export default ThemeProvider;
