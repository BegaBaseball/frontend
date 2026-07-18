import {
  ArrowRightIcon as PhosphorArrowRightIcon,
  ImageBrokenIcon as PhosphorImageBrokenIcon,
  MoonIcon as PhosphorMoonIcon,
  SunIcon as PhosphorSunIcon,
} from '@phosphor-icons/react';

import { createAppIcon } from './AppIcon';

export const FirstLoadArrowRightIcon = createAppIcon(PhosphorArrowRightIcon, 'FirstLoadArrowRightIcon');
export const FirstLoadSunIcon = createAppIcon(PhosphorSunIcon, 'FirstLoadSunIcon');
export const FirstLoadMoonIcon = createAppIcon(PhosphorMoonIcon, 'FirstLoadMoonIcon');
export const FirstLoadImageOffIcon = createAppIcon(PhosphorImageBrokenIcon, 'FirstLoadImageOffIcon');
