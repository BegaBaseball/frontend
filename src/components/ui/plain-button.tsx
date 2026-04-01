import * as React from 'react';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
type ButtonSize = 'default' | 'sm' | 'icon';

interface PlainButtonProps extends React.ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
  ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-sm',
  icon: 'h-9 w-9 rounded-md p-0',
};

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const mergeRefs = <T,>(...refs: Array<React.Ref<T> | undefined>) => {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === 'function') {
        ref(node);
        return;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
};

const Button = React.forwardRef<HTMLButtonElement, PlainButtonProps>(({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  asChild = false,
  children,
  ...props
}, ref) => {
  const resolvedClassName = joinClassNames(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (asChild) {
    const child = React.Children.only(children);

    if (!React.isValidElement<{ className?: string }>(child)) {
      return null;
    }

    const childRef = (child as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;

    return React.cloneElement(child, {
      ...props,
      className: joinClassNames(resolvedClassName, child.props.className),
      ref: mergeRefs(childRef, ref as React.Ref<HTMLElement>),
    });
  }

  return (
    <button
      data-slot="plain-button"
      className={resolvedClassName}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
