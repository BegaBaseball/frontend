import type { Icon, IconProps, IconWeight } from '@phosphor-icons/react';

export type AppIconProps = IconProps;

export function createAppIcon(
  Icon: Icon,
  displayName: string,
  defaultWeight: IconWeight = 'regular',
) {
  function AppIcon({
    'aria-hidden': ariaHidden = true,
    focusable = false,
    weight = defaultWeight,
    ...props
  }: AppIconProps) {
    return (
      <Icon
        aria-hidden={ariaHidden}
        focusable={focusable}
        weight={weight}
        {...props}
      />
    );
  }

  AppIcon.displayName = displayName;

  return AppIcon;
}
