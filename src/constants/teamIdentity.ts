export interface TeamInfo {
  name: string;
  fullName: string;
  color?: string;
}

const LEGACY_CODE_TO_CANONICAL: Record<string, string> = {
  DO: 'DB',
  OB: 'DB',
  HT: 'KIA',
  KI: 'KH',
  NX: 'KH',
  WO: 'KH',
  KW: 'KH',
  SK: 'SSG',
};

export const resolveTeamCode = (teamCode: string): string => {
  if (!teamCode) return teamCode;
  const upper = teamCode.toUpperCase();
  return LEGACY_CODE_TO_CANONICAL[upper] || upper;
};

export const TEAM_DATA_BASE: Record<string, TeamInfo> = {
  '없음': { name: '없음', fullName: '없음', color: '#888888' },
  'LG': { name: 'LG', fullName: 'LG 트윈스', color: '#C30452' },
  'DB': { name: '두산', fullName: '두산 베어스', color: '#131230' },
  'SSG': { name: 'SSG', fullName: 'SSG 랜더스', color: '#CE0E2D' },
  'KT': { name: 'KT', fullName: 'KT 위즈', color: '#000000' },
  'KH': { name: '키움', fullName: '키움 히어로즈', color: '#820024' },
  'NC': { name: 'NC', fullName: 'NC 다이노스', color: '#315288' },
  'SS': { name: '삼성', fullName: '삼성 라이온즈', color: '#074CA1' },
  'LT': { name: '롯데', fullName: '롯데 자이언츠', color: '#041E42' },
  'KIA': { name: 'KIA', fullName: 'KIA 타이거즈', color: '#EA0029' },
  'HH': { name: '한화', fullName: '한화 이글스', color: '#F37321' },
  'ALLSTAR1': { name: '공지', fullName: '공지사항', color: '#000000' },
};

export const getFullTeamName = (teamId: string): string => {
  const normalized = resolveTeamCode(teamId);
  return TEAM_DATA_BASE[normalized]?.fullName || teamId;
};
