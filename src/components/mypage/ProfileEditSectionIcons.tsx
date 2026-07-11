import type { ReactNode, SVGProps } from 'react';

type ProfileEditSectionIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function ProfileEditSectionSvgIcon({
  size = 24,
  children,
  ...props
}: ProfileEditSectionIconProps & { children: ReactNode }) {
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

export function ProfileEditSectionBanIcon(props: ProfileEditSectionIconProps) {
  return (
    <ProfileEditSectionSvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.7 5.7 12.6 12.6" />
    </ProfileEditSectionSvgIcon>
  );
}

export function ProfileEditSectionCameraIcon(props: ProfileEditSectionIconProps) {
  return (
    <ProfileEditSectionSvgIcon {...props}>
      <path d="M14.5 5 13 3H8L6.5 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-5.5Z" />
      <circle cx="12" cy="13" r="4" />
    </ProfileEditSectionSvgIcon>
  );
}

export function ProfileEditSectionLockIcon(props: ProfileEditSectionIconProps) {
  return (
    <ProfileEditSectionSvgIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </ProfileEditSectionSvgIcon>
  );
}

export function ProfileEditSectionSettingsIcon(props: ProfileEditSectionIconProps) {
  return (
    <ProfileEditSectionSvgIcon {...props}>
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="m19.4 15-.4.9 1.7 2-2.8 2.8-2-1.7-.9.4-.5 2.6h-5l-.5-2.6-.9-.4-2 1.7-2.8-2.8 1.7-2-.4-.9-2.6-.5v-5l2.6-.5.4-.9-1.7-2 2.8-2.8 2 1.7.9-.4.5-2.6h5l.5 2.6.9.4 2-1.7 2.8 2.8-1.7 2 .4.9 2.6.5v5l-2.6.5Z" />
    </ProfileEditSectionSvgIcon>
  );
}

export function ProfileEditSectionUserRoundIcon(props: ProfileEditSectionIconProps) {
  return (
    <ProfileEditSectionSvgIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </ProfileEditSectionSvgIcon>
  );
}
