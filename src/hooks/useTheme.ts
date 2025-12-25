import { useEffect, useState } from 'react';

// 초기 테마 설정 (렌더링 전에 실행)
const getInitialTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem('bega-theme');
  return (saved as 'light' | 'dark') || 'light';
};

// 즉시 HTML 클래스 설정
const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') {
  const root = document.documentElement;
  if (initialTheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(initialTheme);

  useEffect(() => {
    // HTML 요소에 클래스 추가/제거
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // localStorage에 저장
    localStorage.setItem('bega-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
}
