import type { ReactNode, SVGProps } from 'react';

type TeamRecommendationTestIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function TeamRecommendationTestSvgIcon({
  size = 24,
  children,
  ...props
}: TeamRecommendationTestIconProps & { children: ReactNode }) {
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

export function TeamRecommendationCloseIcon(props: TeamRecommendationTestIconProps) {
  return (
    <TeamRecommendationTestSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </TeamRecommendationTestSvgIcon>
  );
}

export function TeamRecommendationChevronLeftIcon(props: TeamRecommendationTestIconProps) {
  return (
    <TeamRecommendationTestSvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </TeamRecommendationTestSvgIcon>
  );
}

export function TeamRecommendationChevronRightIcon(props: TeamRecommendationTestIconProps) {
  return (
    <TeamRecommendationTestSvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </TeamRecommendationTestSvgIcon>
  );
}
