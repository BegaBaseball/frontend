import { normalizeHexColor } from './teamColors';

export const PREDICTION_DARK_MODE_TEXT_OVERRIDES: Record<string, string> = {
  '#131230': '#FFFFFF',
  '#041E42': '#FFFFFF',
  '#000000': '#FFFFFF',
};

export const PREDICTION_TEAM_NAME_FONT_WEIGHT = 900;
export const PREDICTION_TEAM_NAME_LETTER_SPACING = '-0.03em';
export const PREDICTION_META_TEXT_COLOR_LIGHT = '#A1A1A1';
export const PREDICTION_META_TEXT_COLOR_DARK = '#A3A3A3';
export const PREDICTION_META_TEXT_FONT_WEIGHT = 400;

export const isPredictionInningTextColorOverrideTeam = (teamColor: string): boolean => {
  const resolvedColor = normalizeHexColor(teamColor);
  return resolvedColor in PREDICTION_DARK_MODE_TEXT_OVERRIDES;
};

export const getPredictionInningTextColor = (teamColor: string, isDarkMode: boolean): string => {
  const resolvedColor = normalizeHexColor(teamColor);

  if (!isDarkMode) {
    return resolvedColor;
  }

  return PREDICTION_DARK_MODE_TEXT_OVERRIDES[resolvedColor] ?? resolvedColor;
};
