import type { TeamKey } from './landingAssets';

export interface TickerItem {
  firstTeam: TeamKey;
  firstLabel: string;
  score: string;
  secondTeam: TeamKey;
  secondLabel: string;
  status: string;
  tone: 'finished' | 'live' | 'scheduled' | 'extra';
}

export const TEAM_ORDER: TeamKey[] = ['lg', 'doosan', 'kia', 'samsung', 'ssg', 'lotte', 'kt', 'nc', 'hanwha', 'kiwoom'];

export const TEAM_LABELS: Record<TeamKey, string> = {
  lg: 'LG',
  doosan: '두산',
  kia: 'KIA',
  samsung: '삼성',
  ssg: 'SSG',
  lotte: '롯데',
  kt: 'KT',
  nc: 'NC',
  hanwha: '한화',
  kiwoom: '키움',
};

export const TICKER_ITEMS: TickerItem[] = [
  { firstTeam: 'kia', firstLabel: 'KIA', score: '5 : 3', secondTeam: 'samsung', secondLabel: '삼성', status: '경기종료', tone: 'finished' },
  { firstTeam: 'lg', firstLabel: 'LG', score: '4 : 2', secondTeam: 'doosan', secondLabel: '두산', status: 'LIVE 7회', tone: 'live' },
  { firstTeam: 'ssg', firstLabel: 'SSG', score: '18:30', secondTeam: 'lotte', secondLabel: '롯데', status: '예정', tone: 'scheduled' },
  { firstTeam: 'kt', firstLabel: 'KT', score: '2 : 2', secondTeam: 'nc', secondLabel: 'NC', status: '연장 10회', tone: 'extra' },
  { firstTeam: 'hanwha', firstLabel: '한화', score: '18:30', secondTeam: 'kiwoom', secondLabel: '키움', status: '예정', tone: 'scheduled' },
];
