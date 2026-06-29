export interface Pitcher {
  name: string;
  era?: string | null;
  win?: number | null;
  loss?: number | null;
  imgUrl?: string | null;
}

export interface GameSummary {
  type: string | null;
  playerId?: number | null;
  playerName?: string | null;
  detail?: string | null;
}

export interface GameLiveEvent {
  eventSeq: number | null;
  inning?: number | null;
  inningHalf?: string | null;
  outs?: number | null;
  batterName?: string | null;
  pitcherName?: string | null;
  description?: string | null;
  eventType?: string | null;
  resultCode?: string | null;
  rbi?: number | null;
  basesBefore?: string | null;
  basesAfter?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  wpa?: number | null;
  winExpectancyBefore?: number | null;
  winExpectancyAfter?: number | null;
  updatedAt?: string | null;
}

export interface GameLiveSnapshot {
  gameId: string;
  gameStatus?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  currentInning?: number | null;
  currentInningHalf?: string | null;
  lastEventSeq?: number | null;
  lastUpdatedAt?: string | null;
  events: GameLiveEvent[];
  inningScores?: Array<GameInningScore | RawGameInningScore>;
  boxScore?: unknown;
}

export interface GameLiveSummary {
  gameId: string;
  gameStatus?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  lastEventSeq?: number | null;
  lastUpdatedAt?: string | null;
}

export interface GameRelayEvent {
  relayId: number | null;
  inning?: number | null;
  inningHalf?: string | null;
  pitcherName?: string | null;
  batterName?: string | null;
  playDescription?: string | null;
  eventType?: string | null;
  result?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GameRelaySnapshot {
  gameId: string;
  lastRelayId?: number | null;
  lastUpdatedAt?: string | null;
  events: GameRelayEvent[];
}

export interface RawGameInningScore {
  inning?: number | string | null;
  inningNo?: number | string | null;
  inning_no?: number | string | null;
  inningNum?: number | string | null;
  inning_num?: number | string | null;
  inningNumber?: number | string | null;
  inning_number?: number | string | null;
  order?: number | string | null;
  orderNo?: number | string | null;
  order_no?: number | string | null;
  teamSide?: string | null;
  team_side?: string | null;
  side?: string | null;
  teamSideCode?: string | null;
  team_side_code?: string | null;
  sideCode?: string | null;
  side_code?: string | null;
  teamCode?: string | null;
  team_code?: string | null;
  team?: string | null;
  teamName?: string | null;
  team_name?: string | null;
  teamNm?: string | null;
  team_nm?: string | null;
  teamSideName?: string | null;
  team_side_name?: string | null;
  sideName?: string | null;
  side_name?: string | null;
  home?: number | string | null;
  away?: number | string | null;
  runs?: number | string | null;
  run?: number | string | null;
  score?: number | string | null;
  r?: number | string | null;
  isExtra?: boolean | number | string | null;
  is_extra?: boolean | number | string | null;
  extra?: boolean | number | string | null;
}

export interface GameInningScore {
  inning: number;
  teamSide: string;
  teamCode?: string | null;
  runs?: number | string | null;
  isExtra?: boolean | null;
  team?: string | null;
  home?: number | string | null;
  away?: number | string | null;
  run?: number | string | null;
  [key: string]: unknown;
}

export interface GameDetail {
  gameId: string;
  gameDate?: string;
  stadium?: string | null;
  stadiumName?: string | null;
  startTime?: string | null;
  attendance?: number | null;
  weather?: string | null;
  gameTimeMinutes?: number | null;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePitcher?: string | null;
  awayPitcher?: string | null;
  gameStatus?: string | null;
  inningScores?: Array<GameInningScore | RawGameInningScore>;
  inning_scores?: RawGameInningScore[];
  inning_score?: RawGameInningScore[];
  boxScore?: unknown;
  lineScore?: unknown;
  line_score?: unknown;
  innings?: RawGameInningScore[];
  summary?: GameSummary[];
  liveEvents?: GameLiveEvent[];
  liveRelayEvents?: GameRelayEvent[];
  liveLastEventSeq?: number | null;
  liveLastRelayId?: number | null;
  liveLastUpdatedAt?: string | null;
  liveRelayLastUpdatedAt?: string | null;
  liveRelayError?: string | null;
  liveRelayErrorCode?: string | null;
  liveStatusError?: string | null;
  liveStatusErrorCode?: string | null;
}

export interface Game {
  gameId: string;
  gameDate?: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  startTime?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winner?: string | null;
  gameStatus?: string | null;
  // 고도화를 위한 추가 필드
  homePitcher?: Pitcher | null;
  awayPitcher?: Pitcher | null;
  aiSummary?: string | null;
  winProbability?: {
    home: number;
    away: number;
  };
  seasonId?: number;
  leagueType?: string; // 'REGULAR', 'POST', 'PRE'
  postSeasonSeries?: string;
  seriesGameNo?: number;
  liveLastEventSeq?: number | null;
  liveLastUpdatedAt?: string | null;
}

export interface DateGames {
  date: string;
  games: Game[];
}

export interface MatchBounds {
  hasData: boolean;
  earliestGameDate: string | null;
  latestGameDate: string | null;
}

export interface MatchDayNavigation {
  date: string;
  games: Game[];
  prevDate: string | null;
  nextDate: string | null;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface VoteStatus {
  home: number;
  away: number;
}

export interface UserPredictionStat {
  accuracy: number; // 적중률 (%)
  streak: number;   // 연승 횟수
  totalPredictions: number;
  correctPredictions: number;
}

export type VoteTeam = 'home' | 'away';
export type PredictionTab = 'match' | 'ranking';
