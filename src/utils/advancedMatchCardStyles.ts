import React from 'react';
import { getLuminance, normalizeHexColor } from './teamColors';

export const TEAM_DARK_TEXT_LUMINANCE_THRESHOLD = 0.45;

export const getInningTeamNameStyle = (
  teamColor: string,
  isDarkMode: boolean,
  isOutlinedTeam = false
): React.CSSProperties => {
  const resolvedColor = normalizeHexColor(teamColor);
  const isDarkText = getLuminance(resolvedColor) < TEAM_DARK_TEXT_LUMINANCE_THRESHOLD;

  if (!isDarkMode || !isDarkText || !isOutlinedTeam) {
    return { color: resolvedColor };
  }

  return {
    color: resolvedColor,
    fontWeight: 700,
    WebkitTextFillColor: resolvedColor,
    WebkitTextStroke: '0.4px rgba(255,255,255,0.95)',
  };
};

export const getTopScoreTextStyle = (
  teamColor: string,
  isDarkMode: boolean,
  isOutlinedTeam = false
): React.CSSProperties => {
  const resolvedColor = normalizeHexColor(teamColor);
  const isDarkText = getLuminance(resolvedColor) < TEAM_DARK_TEXT_LUMINANCE_THRESHOLD;

  if (!isDarkMode || !isOutlinedTeam || !isDarkText) {
    return { color: resolvedColor, fontWeight: 800 };
  }

  return {
    color: resolvedColor,
    fontWeight: 900,
    WebkitTextFillColor: resolvedColor,
    WebkitTextStroke: '0.75px rgba(255,255,255,0.95)',
  };
};
