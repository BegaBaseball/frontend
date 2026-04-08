import * as React from "react";

import { cn } from "../../lib/utils";

const BUTTON_BASE_CLASS = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[15px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

const BUTTON_VARIANT_CLASSES = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
  outline: "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
  brand: "btn-brand",
  brandOutline: "btn-brand-outline",
} as const;

const BUTTON_SIZE_CLASSES = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9 rounded-md",
  touch: "h-11 rounded-xl px-4 text-[15px] has-[>svg]:px-3",
  touchLg: "h-12 rounded-xl px-6 text-base has-[>svg]:px-4",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT_CLASSES;
export type ButtonSize = keyof typeof BUTTON_SIZE_CLASSES;

interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const buttonVariants = ({ variant = "default", size = "default", className }: ButtonVariantsOptions = {}) => {
  return cn(
    BUTTON_BASE_CLASS,
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className,
  );
};

const mergeRefs = <T,>(...refs: Array<React.Ref<T> | undefined>) => {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === "function") {
        ref(node);
        return;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
};

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
  }
>(({ className, variant, size, type = "button", asChild = false, children, ...props }, ref) => {
  const resolvedClassName = buttonVariants({ variant, size, className });

  if (asChild) {
    const child = React.Children.only(children);

    if (!React.isValidElement<{ className?: string }>(child)) {
      return null;
    }

    const childElement = child as React.ReactElement<any>;
    const childRef = (childElement as React.ReactElement & { ref?: React.Ref<HTMLElement> }).ref;

    return React.cloneElement(childElement, {
      ...props,
      "data-slot": "button",
      className: cn(resolvedClassName, childElement.props.className),
      ref: mergeRefs(childRef, ref as React.Ref<HTMLElement>),
    });
  }

  return (
    <button
      data-slot="button"
      className={resolvedClassName}
      ref={ref}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
