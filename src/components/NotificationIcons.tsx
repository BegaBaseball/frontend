import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({
  className,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
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
      {...props}
    >
      {children}
    </svg>
  );
}

export function NotificationCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  );
}

export function NotificationCheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5 13 4 4L19 7" />
    </BaseIcon>
  );
}

export function NotificationBellIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M4 8a8 8 0 1 1 16 0c0 2.85.82 4.26 1.75 5.47.37.49.11 1.2-.5 1.2H2.75c-.61 0-.87-.71-.5-1.2C3.18 12.26 4 10.85 4 8Z" />
    </BaseIcon>
  );
}

export function NotificationMessageCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7.5 18.5 3 21l1.1-4.5A8.5 8.5 0 1 1 20.5 12c0 4.7-3.8 8.5-8.5 8.5a8.4 8.4 0 0 1-4.5-1.3Z" />
    </BaseIcon>
  );
}

export function NotificationMessageSquareIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </BaseIcon>
  );
}

export function NotificationHeartIcon(props: IconProps) {
  const { className, ...restProps } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...restProps}
    >
      <path
        d="m12 20.5-1.45-1.32C5.4 14.53 2 11.42 2 7.5A4.5 4.5 0 0 1 6.5 3 5.1 5.1 0 0 1 12 6.09 5.1 5.1 0 0 1 17.5 3 4.5 4.5 0 0 1 22 7.5c0 3.92-3.4 7.03-8.55 11.69L12 20.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function NotificationUserPlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </BaseIcon>
  );
}

export function NotificationFileTextIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h2" />
    </BaseIcon>
  );
}

export function NotificationRepeatIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </BaseIcon>
  );
}

export function NotificationTrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

export function NotificationCheckCheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 12 3 3 5-5" />
      <path d="m13 12 3 3 5-5" />
    </BaseIcon>
  );
}

export function NotificationClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function NotificationCalendarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
    </BaseIcon>
  );
}

export function NotificationAlertTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function NotificationStarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3.5 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.77 6.44 20.62l1.06-6.2L3 10.03l6.22-.9L12 3.5Z" />
    </BaseIcon>
  );
}

export function NotificationShieldAlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5c0 5 3.3 8.7 7 10 3.7-1.3 7-5 7-10V6l-7-3Z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}
