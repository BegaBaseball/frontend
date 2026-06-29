import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../lib/utils';

export function FieldLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      className={cn('flex items-center gap-2 text-body font-semibold text-gray-900 dark:text-white', className)}
      {...props}
    />
  );
}
