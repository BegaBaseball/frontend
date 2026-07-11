import type { ButtonHTMLAttributes } from 'react';

import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from '../../ui/button';

interface FallbackDesignSystemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
}

const toLocalVariant = (variant?: string): ButtonVariant | undefined => {
  switch (variant) {
    case 'destructive':
    case 'outline':
    case 'secondary':
    case 'ghost':
    case 'link':
    case 'brand':
    case 'brandOutline':
      return variant;
    case 'primary':
      return 'brand';
    default:
      return undefined;
  }
};

const toLocalSize = (size?: string): ButtonSize | undefined => {
  switch (size) {
    case 'default':
    case 'sm':
    case 'lg':
    case 'icon':
    case 'iconTouch':
    case 'touch':
    case 'touchLg':
      return size;
    case 'large':
      return 'lg';
    default:
      return undefined;
  }
};

export default function FallbackDesignSystemButton({
  variant,
  size,
  ...props
}: FallbackDesignSystemButtonProps) {
  return (
    <Button
      variant={toLocalVariant(variant)}
      size={toLocalSize(size)}
      {...props}
    />
  );
}
