import {
  ArrowClockwiseIcon as PhosphorArrowClockwiseIcon,
  ArrowRightIcon as PhosphorArrowRightIcon,
  CaretDownIcon as PhosphorCaretDownIcon,
  ClockIcon as PhosphorClockIcon,
  MapPinIcon as PhosphorMapPinIcon,
  WarningIcon as PhosphorWarningIcon,
} from '@phosphor-icons/react';

import { createAppIcon } from '../icons/AppIcon';

export const ArrowRightIcon = createAppIcon(PhosphorArrowRightIcon, 'ArrowRightIcon');
export const ChevronDownIcon = createAppIcon(PhosphorCaretDownIcon, 'ChevronDownIcon');
export const ClockIcon = createAppIcon(PhosphorClockIcon, 'ClockIcon');
export const MapPinIcon = createAppIcon(PhosphorMapPinIcon, 'MapPinIcon');
export const RefreshIcon = createAppIcon(PhosphorArrowClockwiseIcon, 'RefreshIcon');
export const WarningTriangleIcon = createAppIcon(PhosphorWarningIcon, 'WarningTriangleIcon');
