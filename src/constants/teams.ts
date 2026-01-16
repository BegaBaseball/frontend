// constants/teams.ts
export interface TeamInfo {
  name: string;
  fullName: string;
}

export const TEAM_DATA: Record<string, TeamInfo> = {
  '없음': { name: '없음', fullName: '없음' },
  'LG': { name: 'LG', fullName: 'LG 트윈스' },
  'OB': { name: '두산', fullName: '두산 베어스' },
  'SK': { name: 'SSG', fullName: 'SSG 랜더스' },
  'KT': { name: 'KT', fullName: 'KT 위즈' },
  'WO': { name: '키움', fullName: '키움 히어로즈' },
  'NC': { name: 'NC', fullName: 'NC 다이노스' },
  'SS': { name: '삼성', fullName: '삼성 라이온즈' },
  'LT': { name: '롯데', fullName: '롯데 자이언츠' },
  'HT': { name: '기아', fullName: '기아 타이거즈' },
  'HH': { name: '한화', fullName: '한화 이글스' },
  'ALLSTAR1': { name: '공지', fullName: '공지사항' },
};

export const TEAM_LIST = [
  '없음',
  'LG 트윈스',
  '두산 베어스',
  'SSG 랜더스',
  'KT 위즈',
  '키움 히어로즈',
  'NC 다이노스',
  '삼성 라이온즈',
  '롯데 자이언츠',
  '기아 타이거즈',
  '한화 이글스'
];

export const getFullTeamName = (teamId: string): string => {
  return TEAM_DATA[teamId]?.fullName || teamId;
};

/**
 * 팀 이름 → 팀 ID 매핑 (구단 테스트용)
 */
export const TEAM_NAME_TO_ID: { [key: string]: string } = {
  'LG': 'LG',
  '두산': 'OB',
  'SSG': 'SK',
  'KT': 'KT',
  '키움': 'WO',
  'NC': 'NC',
  '삼성': 'SS',
  '롯데': 'LT',
  '기아': 'HT',
  '한화': 'HH',
};

/**
 * 팀 설명
 */
export const TEAM_DESCRIPTIONS: { [key: string]: string } = {
  'LG': 'LG 트윈스는 잠실을 홈으로 하는 전통의 강호입니다. 꾸준한 전력과 뛰어난 투수진으로 팬들에게 사랑받고 있어요.',
  '두산': '두산 베어스는 잠실의 또 다른 주인공! 화려한 타선과 승부욕 강한 경기로 많은 우승을 차지한 명문구단입니다.',
  'SSG': 'SSG 랜더스는 인천을 연고로 하는 젊고 역동적인 팀입니다. 2022년 우승을 차지하며 강팀으로 떠올랐어요.',
  'KT': 'KT 위즈는 수원을 홈으로 하는 창단 10년차 팀으로, 젊은 선수들과 함께 성장하는 재미가 있습니다.',
  '키움': '키움 히어로즈는 고척을 연고로 하며, 역동적이고 창의적인 야구로 팬들에게 즐거움을 선사합니다.',
  'NC': 'NC 다이노스는 창원을 홈으로 하는 야구팀으로, 젊은 에너지와 도전정신이 넘치는 팀입니다.',
  '삼성': '삼성 라이온즈는 대구를 연고로 하는 KBO 최다 우승팀! 전통과 자부심이 살아있는 명문구단입니다.',
  '롯데': '롯데 자이언츠는 부산을 대표하는 팀으로, 열정적인 팬들의 응원이 가득한 사직구장의 주인공입니다.',
  '기아': 'KIA 타이거즈는 광주를 홈으로 하는 우승 경험이 풍부한 전통의 강호입니다. 강력한 타선이 특징이에요.',
  '한화': '한화 이글스는 대전을 연고로 하며, 끈기 있는 경기력과 팬들의 뜨거운 사랑으로 힘내는 팀입니다.',
};

/**
 * 팀 설명 가져오기
 */
export const getTeamDescription = (team: string): string => {
  return TEAM_DESCRIPTIONS[team] || '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
};