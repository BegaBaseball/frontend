import { buttonVariants } from '../ui/button';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import { cn } from '../../lib/utils';
import type { ConfirmOptions } from './confirmDialogCore';

interface ConfirmDialogRendererProps {
  open: boolean;
  options: ConfirmOptions;
  onResult: (result: boolean) => void;
}

export default function ConfirmDialogRenderer({
  open,
  options,
  onResult,
}: ConfirmDialogRendererProps) {
  return (
    <PlainDialog
      open={open}
      onClose={() => onResult(false)}
      title={options.title}
      description={options.description}
      contentTestId="confirm-dialog"
      className="max-w-md"
      bodyClassName="hidden"
      footer={(
        <>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onResult(false)}>
            {options.cancelLabel || '취소'}
          </Button>
          <Button
            type="button"
            onClick={() => onResult(true)}
            className={cn(
              'w-full sm:w-auto',
              options.variant === 'destructive'
                && buttonVariants({ variant: 'destructive' })
            )}
          >
            {options.confirmLabel || '확인'}
          </Button>
        </>
      )}
    >
      {null}
    </PlainDialog>
  );
}
