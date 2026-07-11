import type { ReactNode, SVGProps } from 'react';

type NavbarIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function NavbarSvgIcon({
  size = 24,
  children,
  ...props
}: NavbarIconProps & { children: ReactNode }) {
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

export function NavbarBellIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </NavbarSvgIcon>
  );
}

export function NavbarCloseIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </NavbarSvgIcon>
  );
}

export function NavbarLineChartIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M4 19h16" />
      <path d="M4 19V5" />
      <path d="m7 15 4-4 3 3 5-7" />
    </NavbarSvgIcon>
  );
}

export function NavbarLogOutIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </NavbarSvgIcon>
  );
}

export function NavbarMapIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </NavbarSvgIcon>
  );
}

export function NavbarMegaphoneIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="m3 11 18-5v12L3 13v-2Z" />
      <path d="M11 14v5a2 2 0 0 1-4 0v-6" />
    </NavbarSvgIcon>
  );
}

export function NavbarMenuIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </NavbarSvgIcon>
  );
}

export function NavbarMoonIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
    </NavbarSvgIcon>
  );
}

export function NavbarMessageSquareIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
    </NavbarSvgIcon>
  );
}

export function NavbarShieldAlertIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <path d="M12 3 20 6v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6l8-3Z" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </NavbarSvgIcon>
  );
}

export function NavbarSunIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.9 4.9 1.4 1.4" />
      <path d="m17.7 17.7 1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.9 19.1 1.4-1.4" />
      <path d="m17.7 6.3 1.4-1.4" />
    </NavbarSvgIcon>
  );
}

export function NavbarUsersIcon(props: NavbarIconProps) {
  return (
    <NavbarSvgIcon {...props}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 11a4 4 0 0 1 0-6" />
      <path d="M22 21a7 7 0 0 0-5-6.7" />
    </NavbarSvgIcon>
  );
}
