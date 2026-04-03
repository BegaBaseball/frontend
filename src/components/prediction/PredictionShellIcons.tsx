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

export function PredictionLoaderIcon({ className, ...props }: IconProps) {
  return (
    <BaseIcon className={className} {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
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
