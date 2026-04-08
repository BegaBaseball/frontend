import React from 'react';
import {
  PREDICTION_TEAM_NAME_FONT_WEIGHT,
  PREDICTION_TEAM_NAME_LETTER_SPACING,
  PREDICTION_META_TEXT_COLOR_DARK,
  PREDICTION_META_TEXT_COLOR_LIGHT,
  PREDICTION_META_TEXT_FONT_WEIGHT,
  getPredictionInningTextColor,
  isPredictionInningTextColorOverrideTeam,
} from './predictionTextStylePolicy';

export const getInningTeamNameStyle = (
  teamColor: string,
  _isDarkMode: boolean
): React.CSSProperties => {
  const color = getPredictionInningTextColor(teamColor, _isDarkMode);

  return {
    color,
    fontWeight: PREDICTION_TEAM_NAME_FONT_WEIGHT,
    letterSpacing: PREDICTION_TEAM_NAME_LETTER_SPACING,
    textRendering: 'optimizeLegibility',
  };
};

export const getTopScoreTextStyle = (
  teamColor: string,
  _isDarkMode: boolean
): React.CSSProperties => {
  const color = getPredictionInningTextColor(teamColor, _isDarkMode);

  return {
    color,
    fontWeight: PREDICTION_TEAM_NAME_FONT_WEIGHT,
    textRendering: 'optimizeLegibility',
  };
};

export const getSectionHeadingTextStyle = (_isDarkMode: boolean): React.CSSProperties => {
  return {
    fontWeight: 700,
    textRendering: 'optimizeLegibility',
  };
};

export const getInningMetaTextStyle = (_isDarkMode: boolean): React.CSSProperties => {
  return {
    color: _isDarkMode ? PREDICTION_META_TEXT_COLOR_DARK : PREDICTION_META_TEXT_COLOR_LIGHT,
    fontWeight: PREDICTION_META_TEXT_FONT_WEIGHT,
    textRendering: 'optimizeLegibility',
  };
};

export const getTeamLabelTextStyle = (teamColor?: string, _isDarkMode = false): React.CSSProperties => {
  const resolvedTeamColor = _isDarkMode && isPredictionInningTextColorOverrideTeam(teamColor || '')
    ? getPredictionInningTextColor(teamColor || '', true)
    : undefined;

  return {
    fontWeight: PREDICTION_TEAM_NAME_FONT_WEIGHT,
    letterSpacing: PREDICTION_TEAM_NAME_LETTER_SPACING,
    ...(resolvedTeamColor ? { color: resolvedTeamColor } : {}),
    textRendering: 'optimizeLegibility',
  };
};
