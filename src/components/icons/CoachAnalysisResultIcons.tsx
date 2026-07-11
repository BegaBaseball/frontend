import type { ReactNode, SVGProps } from 'react';

type CoachAnalysisResultIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function CoachAnalysisResultSvgIcon({
  size = 24,
  children,
  ...props
}: CoachAnalysisResultIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CoachAnalysisResultLoaderIcon(props: CoachAnalysisResultIconProps) {
  return (
    <CoachAnalysisResultSvgIcon {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </CoachAnalysisResultSvgIcon>
  );
}

export function CoachAnalysisResultZapIcon(props: CoachAnalysisResultIconProps) {
  return (
    <CoachAnalysisResultSvgIcon {...props}>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
    </CoachAnalysisResultSvgIcon>
  );
}
