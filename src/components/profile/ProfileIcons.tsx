import {
  BellIcon as PhosphorBellIcon,
  BellSlashIcon as PhosphorBellSlashIcon,
  ProhibitIcon as PhosphorProhibitIcon,
  QuotesIcon as PhosphorQuotesIcon,
  SpinnerGapIcon as PhosphorSpinnerGapIcon,
  TrophyIcon as PhosphorTrophyIcon,
  UserIcon as PhosphorUserIcon,
  UserMinusIcon as PhosphorUserMinusIcon,
  UserPlusIcon as PhosphorUserPlusIcon,
  UsersIcon as PhosphorUsersIcon,
  WarningCircleIcon as PhosphorWarningCircleIcon,
  XIcon as PhosphorXIcon,
} from '@phosphor-icons/react';

import { createAppIcon } from '../icons/AppIcon';

export const ProfileAlertCircleIcon = createAppIcon(PhosphorWarningCircleIcon, 'ProfileAlertCircleIcon');
export const ProfileBanIcon = createAppIcon(PhosphorProhibitIcon, 'ProfileBanIcon');
export const ProfileBellIcon = createAppIcon(PhosphorBellIcon, 'ProfileBellIcon');
export const ProfileBellOffIcon = createAppIcon(PhosphorBellSlashIcon, 'ProfileBellOffIcon');
export const ProfileLoaderIcon = createAppIcon(PhosphorSpinnerGapIcon, 'ProfileLoaderIcon');
export const ProfileQuoteIcon = createAppIcon(PhosphorQuotesIcon, 'ProfileQuoteIcon');
export const ProfileTrophyIcon = createAppIcon(PhosphorTrophyIcon, 'ProfileTrophyIcon');
export const ProfileUserIcon = createAppIcon(PhosphorUserIcon, 'ProfileUserIcon');
export const ProfileUserMinusIcon = createAppIcon(PhosphorUserMinusIcon, 'ProfileUserMinusIcon');
export const ProfileUserPlusIcon = createAppIcon(PhosphorUserPlusIcon, 'ProfileUserPlusIcon');
export const ProfileUsersIcon = createAppIcon(PhosphorUsersIcon, 'ProfileUsersIcon');
export const ProfileCloseIcon = createAppIcon(PhosphorXIcon, 'ProfileCloseIcon');
