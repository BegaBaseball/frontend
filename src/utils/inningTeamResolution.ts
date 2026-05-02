export const INNING_TEAM_CODE_ALIASES: Record<string, string> = {
  DO: 'DB',
  OB: 'DB',
  HT: 'KIA',
  KI: 'KH',
  WO: 'KH',
  NX: 'KH',
  KW: 'KH',
  SK: 'SSG',
  SL: 'SSG',
  BE: 'HH',
  MBC: 'KH',
  LOT: 'LT',
};

export const normalizeTeamCode = (value?: string | null): string => {
  if (!value) return '';
  const cleaned = value
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9가-힣]/g, '');
  if (!cleaned) {
    return '';
  }
  return INNING_TEAM_CODE_ALIASES[cleaned] || cleaned;
};

export const normalizeTeamText = (value?: string | null): string => (
  (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9가-힣]/g, '')
);

export const buildTeamNameCandidates = (value: string): string[] => {
  const fullName = normalizeTeamText(value);
  if (!fullName) {
    return [];
  }

  const candidates = new Set<string>([fullName]);
  if (fullName.length >= 2) {
    candidates.add(fullName.slice(0, 2));
  }
  if (fullName.length >= 3) {
    candidates.add(fullName.slice(0, 3));
  }

  return Array.from(candidates);
};

export const matchesTeamCode = (
  teamCode: string,
  teamCodes: string[],
  teamNameCandidates: string[]
): boolean => {
  const normalizedCode = normalizeTeamCode(teamCode);
  if (!normalizedCode) {
    return false;
  }

  if (teamCodes.includes(normalizedCode)) {
    return true;
  }

  return normalizedCode.length >= 2 && teamNameCandidates.some((candidate) => (
    candidate.includes(normalizedCode) || normalizedCode.includes(candidate)
  ));
};
