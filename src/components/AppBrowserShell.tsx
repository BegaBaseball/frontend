import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../hooks/useTheme';
import AppShellRuntime from './AppShellRuntime';

export default function AppBrowserShell() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="kbo-theme"
      disableTransitionOnChange
    >
      <BrowserRouter>
        <HelmetProvider>
          <AppShellRuntime />
        </HelmetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
