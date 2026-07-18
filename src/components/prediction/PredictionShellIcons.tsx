import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({
  size = 24,
  className,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

export function PredictionLineChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
      <circle cx="7" cy="15" r="1" />
      <circle cx="11" cy="11" r="1" />
      <circle cx="14" cy="14" r="1" />
      <circle cx="19" cy="7" r="1" />
    </BaseIcon>
  );
}

export function PredictionCoinsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <ellipse cx="12" cy="7" rx="6.5" ry="3.5" />
      <path d="M5.5 7v5c0 1.9 2.9 3.5 6.5 3.5s6.5-1.6 6.5-3.5V7" />
      <path d="M5.5 12v5c0 1.9 2.9 3.5 6.5 3.5s6.5-1.6 6.5-3.5v-5" />
    </BaseIcon>
  );
}

export function PredictionGamepadIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 9h10a4 4 0 0 1 3.9 4.8l-.6 2.7A2.5 2.5 0 0 1 17.9 19c-.6 0-1.2-.2-1.7-.7l-1.5-1.5h-5.4L7.8 18.3c-.5.5-1.1.7-1.7.7a2.5 2.5 0 0 1-2.4-2l-.6-2.7A4 4 0 0 1 7 9Z" />
      <path d="M8 12v4" />
      <path d="M6 14h4" />
      <circle cx="16.5" cy="13.5" r="1" />
      <circle cx="18.5" cy="15.5" r="1" />
    </BaseIcon>
  );
}

export function PredictionLoaderIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </BaseIcon>
  );
}

export function PredictionBaseballIcon({
  size = 56,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="28" cy="28" r="25" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M12 9 C25 20 25 36 12 47" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 4" />
      <path d="M44 9 C31 20 31 36 44 47" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.5 4" />
    </svg>
  );
}

export function PredictionBaseballOutlineIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M7.2 5.7c3 2.7 3 9.9 0 12.6" />
      <path d="M16.8 5.7c-3 2.7-3 9.9 0 12.6" />
    </BaseIcon>
  );
}

export function PredictionBrainIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8.5 5.5A3 3 0 0 1 12 4a3 3 0 0 1 3.5 1.5" />
      <path d="M7 9a3 3 0 0 0 0 6" />
      <path d="M17 9a3 3 0 0 1 0 6" />
      <path d="M8 15.5A3.5 3.5 0 0 0 12 20a3.5 3.5 0 0 0 4-4.5" />
      <path d="M12 4v16" />
      <path d="M9 11h6" />
    </BaseIcon>
  );
}

export function PredictionCalendarDaysIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 17h.01" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function PredictionCloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  );
}

export function PredictionChevronLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </BaseIcon>
  );
}

export function PredictionChevronRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </BaseIcon>
  );
}

export function PredictionTrendingUpIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 17h18" />
      <path d="m6 14 4-4 3 3 5-6" />
      <path d="M14 7h4v4" />
    </BaseIcon>
  );
}

export function PredictionTargetIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5V3" />
      <path d="M12 21v-2" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
    </BaseIcon>
  );
}

export function PredictionHashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 9h14" />
      <path d="M4 15h14" />
      <path d="M10 4 8 20" />
      <path d="m16 4-2 16" />
    </BaseIcon>
  );
}

export function PredictionCheckCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </BaseIcon>
  );
}

export function PredictionFlameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3s4 2.5 4 6.5c0 2.2-1.1 3.64-2.14 4.95-.94 1.2-1.86 2.36-1.86 4.05" />
      <path d="M8.5 9.5c-1.67 1.5-2.5 3.38-2.5 5.64C6 18.93 8.69 21 12 21s6-2.07 6-5.86c0-2.55-.87-4.58-2.62-6.36" />
      <path d="M12 21c-1.8-1.07-2.5-2.4-2.5-4.05 0-1.76.92-2.97 1.89-4.24.73-.95 1.48-1.93 1.73-3.2 0 0 2.38 1.5 2.38 4.4C15.5 17.34 14.17 19.62 12 21Z" />
    </BaseIcon>
  );
}

export function PredictionWarningTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function PredictionMinusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function PredictionArrowUpRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 17 17 7" />
      <path d="M10 7h7v7" />
    </BaseIcon>
  );
}

export function PredictionArrowDownRightIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m7 7 10 10" />
      <path d="M10 17h7v-7" />
    </BaseIcon>
  );
}

export function PredictionClockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function PredictionZapIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
    </BaseIcon>
  );
}

export function PredictionLockIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </BaseIcon>
  );
}

export function PredictionPencilIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14 7 3 3" />
    </BaseIcon>
  );
}

export function PredictionSparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.1 3.4L16.5 7.5l-3.4 1.1L12 12l-1.1-3.4L7.5 7.5l3.4-1.1L12 3Z" />
      <path d="m18.5 12 0.7 2.3 2.3 0.7-2.3 0.7-0.7 2.3-0.7-2.3-2.3-0.7 2.3-0.7 0.7-2.3Z" />
      <path d="m6 14 0.8 2.5L9.3 17l-2.5 0.8L6 20.3l-0.8-2.5L2.7 17l2.5-0.8L6 14Z" />
    </BaseIcon>
  );
}

export function PredictionUsersIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
  );
}

export function PredictionShieldIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.88 8.58 7 10 4.12-1.42 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" />
    </BaseIcon>
  );
}

export function PredictionWindIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 8h12a3 3 0 1 0-3-3" />
      <path d="M3 12h16" />
      <path d="M3 16h10a3 3 0 1 1-3 3" />
    </BaseIcon>
  );
}

export function PredictionBarChartIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-7" />
      <path d="M12 20V9" />
      <path d="M17 20V5" />
    </BaseIcon>
  );
}

export function PredictionCrosshairIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <circle cx="12" cy="12" r="1.5" />
    </BaseIcon>
  );
}

export function PredictionEyeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </BaseIcon>
  );
}

export function PredictionGavelIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m14 4 6 6" />
      <path d="m9 9 6 6" />
      <path d="m7 11 8-8" />
      <path d="m3 21 6-6" />
      <path d="M12 18H4" />
    </BaseIcon>
  );
}

export function PredictionHelpCircleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.04 2l-1.04.83a2 2 0 0 0-.75 1.56V14" />
      <path d="M12 17h.01" />
    </BaseIcon>
  );
}

export function PredictionRadarIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12 18 6" />
      <path d="M12 12h8" />
      <path d="M12 4v8" />
    </BaseIcon>
  );
}

export function PredictionTrophyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4" />
      <path d="M7 5H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4" />
    </BaseIcon>
  );
}
