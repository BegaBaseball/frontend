import type { ReactNode, SVGProps } from 'react';

type UserProfileIconProps = SVGProps<SVGSVGElement> & {
    size?: number;
};

function UserProfileSvgIcon({
    size = 24,
    children,
    ...props
}: UserProfileIconProps & { children: ReactNode }) {
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

export function UserProfileArrowLeftIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileAlertCircleIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileBanIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileBellIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileBellOffIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            <path d="M18.6 13A21.5 21.5 0 0 1 18 8" />
            <path d="M6.3 6.3A6 6 0 0 0 6 8c0 7-3 7-3 9h14" />
            <path d="m2 2 20 20" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileDiamondIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="m12 3 8 9-8 9-8-9 8-9Z" />
            <path d="M4 12h16" />
            <path d="m9 3-2 9 5 9 5-9-2-9" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileMessageCircleIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-4-.9L3 21l1.5-4.6a8.6 8.6 0 1 1 16.5-4.9Z" />
        </UserProfileSvgIcon>
    );
}

export function UserProfilePenSquareIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.4-9.4Z" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileQuoteIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M8 12H5a4 4 0 0 1 4-4v8" />
            <path d="M19 12h-3a4 4 0 0 1 4-4v8" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileSpinnerIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileTrophyIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
            <path d="M5 6H3a3 3 0 0 0 3 3" />
            <path d="M19 6h2a3 3 0 0 1-3 3" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileUserIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileUserMinusIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 11h-6" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileUserPlusIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6" />
            <path d="M22 11h-6" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileUsersIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
            <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileXIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </UserProfileSvgIcon>
    );
}

export function UserProfileXCircleIcon(props: UserProfileIconProps) {
    return (
        <UserProfileSvgIcon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
        </UserProfileSvgIcon>
    );
}
