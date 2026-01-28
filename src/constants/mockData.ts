import { DateGames } from '../types/prediction';

/**
 * 과거 경기 데이터 (일주일치) - 날짜별로 그룹화
 * TODO: 실제 API로 대체 필요
 */
export const PAST_GAMES_DATA: DateGames[] = [
  {
    date: '2024-10-27',
    games: [
      {
        gameId: 'game_20241027_1',
        homeTeam: 'LG',
        awayTeam: 'OB',
        stadium: '잠실구장',
        homeScore: 5,
        awayScore: 3,
        winner: 'home',
        gameDate: '2024-10-27'
      },
      {
        gameId: 'game_20241027_2',
        homeTeam: 'KT',
        awayTeam: 'SK',
        stadium: '수원구장',
        homeScore: 2,
        awayScore: 4,
        winner: 'away',
        gameDate: '2024-10-27'
      }
    ]
  },
  {
    date: '2024-10-28',
    games: [
      {
        gameId: 'game_20241028_1',
        homeTeam: 'NC',
        awayTeam: 'HT',
        stadium: '창원구장',
        homeScore: 6,
        awayScore: 6,
        winner: 'draw'
      },
      {
        gameId: 'game_20241028_2',
        homeTeam: 'SS',
        awayTeam: 'HH',
        stadium: '대구구장',
        homeScore: 8,
        awayScore: 3,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-29',
    games: [
      {
        gameId: 'game_20241029_1',
        homeTeam: 'LT',
        awayTeam: 'WO',
        stadium: '사직구장',
        homeScore: 1,
        awayScore: 5,
        winner: 'away'
      },
      {
        gameId: 'game_20241029_2',
        homeTeam: 'LG',
        awayTeam: 'KT',
        stadium: '잠실구장',
        homeScore: 7,
        awayScore: 4,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-30',
    games: [
      {
        gameId: 'game_20241030_1',
        homeTeam: 'OB',
        awayTeam: 'SK',
        stadium: '잠실구장',
        homeScore: 3,
        awayScore: 3,
        winner: 'draw'
      },
      {
        gameId: 'game_20241030_2',
        homeTeam: 'HT',
        awayTeam: 'NC',
        stadium: '광주구장',
        homeScore: 9,
        awayScore: 2,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-10-31',
    games: [
      {
        gameId: 'game_20241031_1',
        homeTeam: 'HH',
        awayTeam: 'SS',
        stadium: '대전구장',
        homeScore: 2,
        awayScore: 6,
        winner: 'away'
      },
      {
        gameId: 'game_20241031_2',
        homeTeam: 'WO',
        awayTeam: 'LT',
        stadium: '고척구장',
        homeScore: 5,
        awayScore: 5,
        winner: 'draw'
      }
    ]
  },
  {
    date: '2024-11-01',
    games: [
      {
        gameId: 'game_20241101_1',
        homeTeam: 'KT',
        awayTeam: 'LG',
        stadium: '수원구장',
        homeScore: 4,
        awayScore: 7,
        winner: 'away'
      },
      {
        gameId: 'game_20241101_2',
        homeTeam: 'SK',
        awayTeam: 'OB',
        stadium: '인천구장',
        homeScore: 8,
        awayScore: 1,
        winner: 'home'
      }
    ]
  },
  {
    date: '2024-11-02',
    games: [
      {
        gameId: 'game_20241102_1',
        homeTeam: 'NC',
        awayTeam: 'HH',
        stadium: '창원구장',
        homeScore: 3,
        awayScore: 4,
        winner: 'away'
      },
      {
        gameId: 'game_20241102_2',
        homeTeam: 'SS',
        awayTeam: 'HT',
        stadium: '대구구장',
        homeScore: 6,
        awayScore: 3,
        winner: 'home'
      }
    ]
  }
];

/**
 * 미래 경기 데이터 생성
 */
export const generateFutureGames = (date: string): DateGames => ({
  date,
  games: [
    {
      gameId: `game_${date.replace(/-/g, '')}_1`,
      homeTeam: 'LG',
      awayTeam: 'OB',
      stadium: '잠실구장'
    },
    {
      gameId: `game_${date.replace(/-/g, '')}_2`,
      homeTeam: 'KT',
      awayTeam: 'SK',
      stadium: '수원구장'
    },
    {
      gameId: `game_${date.replace(/-/g, '')}_3`,
      homeTeam: 'NC',
      awayTeam: 'HT',
      stadium: '창원구장'
    },
    {
      gameId: `game_${date.replace(/-/g, '')}_4`,
      homeTeam: 'SS',
      awayTeam: 'HH',
      stadium: '대구구장'
    },
    {
      gameId: `game_${date.replace(/-/g, '')}_5`,
      homeTeam: 'LT',
      awayTeam: 'WO',
      stadium: '사직구장',
      gameDate: date
    }
  ]
});

/**
 * 전체 날짜 데이터 생성 (과거 + 오늘 + 미래)
 */
export const generateAllDatesData = (): DateGames[] => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return [
    ...PAST_GAMES_DATA,
    { date: today, games: [] }, // 오늘 (경기 없음)
    generateFutureGames(tomorrow) // 내일
  ];
};