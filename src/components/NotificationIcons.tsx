import {
  BellIcon as PhosphorBellIcon,
  CalendarIcon as PhosphorCalendarIcon,
  ChatCircleIcon as PhosphorChatCircleIcon,
  ChatTextIcon as PhosphorChatTextIcon,
  CheckIcon as PhosphorCheckIcon,
  ChecksIcon as PhosphorChecksIcon,
  ClockIcon as PhosphorClockIcon,
  FileTextIcon as PhosphorFileTextIcon,
  HeartIcon as PhosphorHeartIcon,
  RepeatIcon as PhosphorRepeatIcon,
  ShieldWarningIcon as PhosphorShieldWarningIcon,
  StarIcon as PhosphorStarIcon,
  TrashIcon as PhosphorTrashIcon,
  UserPlusIcon as PhosphorUserPlusIcon,
  WarningIcon as PhosphorWarningIcon,
  XIcon as PhosphorXIcon,
} from '@phosphor-icons/react';

import { createAppIcon } from './icons/AppIcon';

export const NotificationCloseIcon = createAppIcon(PhosphorXIcon, 'NotificationCloseIcon');
export const NotificationCheckIcon = createAppIcon(PhosphorCheckIcon, 'NotificationCheckIcon');
export const NotificationBellIcon = createAppIcon(PhosphorBellIcon, 'NotificationBellIcon');
export const NotificationMessageCircleIcon = createAppIcon(PhosphorChatCircleIcon, 'NotificationMessageCircleIcon');
export const NotificationMessageSquareIcon = createAppIcon(PhosphorChatTextIcon, 'NotificationMessageSquareIcon');
export const NotificationHeartIcon = createAppIcon(PhosphorHeartIcon, 'NotificationHeartIcon');
export const NotificationUserPlusIcon = createAppIcon(PhosphorUserPlusIcon, 'NotificationUserPlusIcon');
export const NotificationFileTextIcon = createAppIcon(PhosphorFileTextIcon, 'NotificationFileTextIcon');
export const NotificationRepeatIcon = createAppIcon(PhosphorRepeatIcon, 'NotificationRepeatIcon');
export const NotificationTrashIcon = createAppIcon(PhosphorTrashIcon, 'NotificationTrashIcon');
export const NotificationCheckCheckIcon = createAppIcon(PhosphorChecksIcon, 'NotificationCheckCheckIcon');
export const NotificationClockIcon = createAppIcon(PhosphorClockIcon, 'NotificationClockIcon');
export const NotificationCalendarIcon = createAppIcon(PhosphorCalendarIcon, 'NotificationCalendarIcon');
export const NotificationAlertTriangleIcon = createAppIcon(PhosphorWarningIcon, 'NotificationAlertTriangleIcon');
export const NotificationStarIcon = createAppIcon(PhosphorStarIcon, 'NotificationStarIcon');
export const NotificationShieldAlertIcon = createAppIcon(PhosphorShieldWarningIcon, 'NotificationShieldAlertIcon');
