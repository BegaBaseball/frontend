import { lazy, Suspense, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  ConfirmDialogContext,
  type ConfirmOptions,
  useConfirmDialog,
  useOptionalConfirmDialog,
} from './confirmDialogCore';

const LazyConfirmDialogRenderer = lazy(() => import('./ConfirmDialogRenderer'));

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    // If there's an existing promise pending, resolve it with false (cancel)
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleResult = useCallback((result: boolean) => {
    setOpen(false);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <LazyConfirmDialogRenderer
            open={open}
            options={options}
            onResult={handleResult}
          />
        </Suspense>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export { useConfirmDialog, useOptionalConfirmDialog };
