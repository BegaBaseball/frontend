declare module 'design_system/Button' {
  import type { ButtonHTMLAttributes, ComponentType } from 'react';

  export interface RemoteButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: string;
    size?: string;
  }

  const RemoteButton: ComponentType<RemoteButtonProps>;
  export default RemoteButton;
}

declare module 'design_system/Modal' {
  import type { ComponentType, ReactNode } from 'react';

  export interface RemoteModalProps {
    open?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    title?: ReactNode;
    children?: ReactNode;
  }

  const RemoteModal: ComponentType<RemoteModalProps>;
  export default RemoteModal;
}

declare module 'design_system/ThemeProvider' {
  import type { ComponentType, ReactNode } from 'react';

  export interface RemoteThemeProviderProps {
    children?: ReactNode;
    theme?: string;
    defaultTheme?: string;
  }

  export const ThemeProvider: ComponentType<RemoteThemeProviderProps>;
  export default ThemeProvider;
}
