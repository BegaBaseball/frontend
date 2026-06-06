import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './plain-button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function PlainDialogCloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

interface PlainDialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  contentTestId?: string;
  placement?: 'center' | 'bottom' | 'right';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  hideCloseButton?: boolean;
  hideHeader?: boolean;
}

export default function PlainDialog({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  contentTestId,
  placement = 'center',
  children,
  footer,
  className,
  bodyClassName,
  hideCloseButton = false,
  hideHeader = false,
}: PlainDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { active: open });

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {placement === 'right' ? (
        <style>{'@keyframes plainDialogSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}'}</style>
      ) : null}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        className={
          placement === 'bottom'
            ? 'absolute inset-0 flex items-end justify-center'
            : placement === 'right'
              ? 'absolute inset-0 flex items-stretch justify-end'
              : 'absolute inset-0 flex items-center justify-center p-4'
        }
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          aria-labelledby={title && !hideHeader ? titleId : undefined}
          aria-label={!title || hideHeader ? ariaLabel : undefined}
          aria-describedby={description && !hideHeader ? descriptionId : undefined}
          data-testid={contentTestId}
          onClick={(event) => event.stopPropagation()}
          className={joinClassNames(
            placement === 'right'
              ? 'flex h-full w-full max-w-[640px] flex-col overflow-y-auto border-l bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 motion-safe:animate-[plainDialogSlideInRight_0.22s_ease-out] dark:border-border dark:bg-card'
              : 'w-full rounded-xl border bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 dark:border-border dark:bg-card',
            className,
          )}
        >
          {!hideHeader && (title || !hideCloseButton) && (
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-border">
              <div className="min-w-0">
                {title ? (
                  <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descriptionId} className="mt-1 text-[15px] text-gray-600 dark:text-gray-300">
                    {description}
                  </p>
                ) : null}
              </div>
              {!hideCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 p-0 text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <PlainDialogCloseIcon className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
          <div className={joinClassNames(placement === 'right' ? 'flex-1 min-h-0' : 'p-5', bodyClassName)}>
            {children}
          </div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 dark:border-border sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
