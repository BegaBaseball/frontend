import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { LayoutGroup, motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { TrendingUp, ChevronLeft, ChevronRight, AlertTriangle, Clock3 } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import {
  Game,
  VoteTeam,
  GameDetail,
  GameSummary,
  RawGameInningScore,
} from '../../types/prediction';
import { GAME_TIME } from '../../constants/prediction';
import { getTeamColorByAnyKey, getFullTeamName } from '../../constants/teams';
import type { GameStatusCode } from '../../utils/prediction';

interface AdvancedMatchCardProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  userVote: 'home' | 'away' | null;
  votePercentages: { homePercentage: number; awayPercentage: number; totalVotes: number };
  isVoteOpen: boolean;
  statusLabel: string;
  statusCode: GameStatusCode;
  onVote: (team: VoteTeam) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  hasPrevDate: boolean;
  hasNextDate: boolean;
  coachBriefing?: ReactNode;
}

const INNING_TEAM_CODE_ALIASES: Record<string, string> = {
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

const normalizeTeamCode = (value?: string | null): string => {
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

const normalizeTeamText = (value?: string | null): string => (
  (value || '')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9가-힣]/g, '')
);

const buildTeamNameCandidates = (value: string): string[] => {
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

const matchesTeamCode = (
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

const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`;

const DetailWrapper = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const MetaBadge = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const TeamLogoBox = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const ScoreBox = styled.div<{ $visible: boolean }>`
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transform: ${(props) => (props.$visible ? 'scale(1)' : 'scale(0.8)')};
  animation: ${(props) =>
    props.$visible
      ? css`${popIn} 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s backwards`
      : 'none'};
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
  will-change: transform, opacity;
`;

const TimelineItem = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const TimelineCard = styled(motion.div)`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const EventBadge = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const GaugeContainer = styled.div`
  margin: 20px 0;
  padding: 0 10px;
`;

const GaugeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
`;

const TeamInfo = styled.div<{ $color: string; $align: 'left' | 'right' }>`
  text-align: ${(props) => props.$align};

  .name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #9ca3af;
    margin-bottom: 2px;
  }

  .count {
    font-size: 1.2rem;
    font-weight: 800;
    color: ${(props) => props.$color};
  }

  .percent {
    font-size: 0.9rem;
    opacity: 0.7;
    margin-left: 4px;
  }
`;

const ProgressBarWrapper = styled.div`
  height: 16px;
  background: #2a2d35;
  border-radius: 20px;
  display: flex;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
`;

const GaugeBar = styled(motion.div)<{ color: string }>`
  height: 100%;
  background: ${(props) => props.color};
  position: relative;
`;

const CenterSlash = styled(motion.div)`
  position: absolute;
  top: 0;
  transform: translateX(-50%) skewX(-20deg);
  width: 4px;
  height: 100%;
  background: white;
  z-index: 2;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

type InningScorePayload = RawGameInningScore & {
  _inning?: string | number | null;
};

type InningSide = 'home' | 'away';

type InningRow = { home: number | null; away: number | null; extra: boolean | null };

const toRawText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${value}`.trim();
};

const toNumericScoreValue = (value?: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const normalized = `${value}`.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInningNumber = (value: unknown): number | null => {
  const rawText = toRawText(value);
  if (!rawText) return null;
  const match = rawText.match(/(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBooleanValue = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = `${value}`.trim().toLowerCase();
  if (!text) return null;
  if (['1', 'true', 'y', 'yes', 't', 'on'].includes(text)) return true;
  if (['0', 'false', 'n', 'no', 'f', 'off'].includes(text)) return false;
  return null;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
);

const isNumericInningKey = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isDirectInningScoreRecord = (node: Record<string, unknown>): boolean => (
  node.team !== undefined
  || node.teamCode !== undefined
  || node.inning !== undefined
  || node.inningNo !== undefined
  || node.inning_no !== undefined
  || node.inningNum !== undefined
  || node.inning_num !== undefined
  || node.inningNumber !== undefined
  || node.inning_number !== undefined
  || node.run !== undefined
  || node.runs !== undefined
  || node.teamSide !== undefined
  || node.side !== undefined
  || node.score !== undefined
  || node.home !== undefined
  || node.away !== undefined
  || node.homeScore !== undefined
  || node.awayScore !== undefined
  || node.home_score !== undefined
  || node.away_score !== undefined
  || node.team_side !== undefined
  || node.side_code !== undefined
  || node.sideCode !== undefined
);

const inferInningSideFromRawKey = (rawKey: string): InningSide | null => {
  const rawText = toRawText(rawKey);
  const normalized = rawText.toUpperCase().replace(/[^A-Z가-힣]/g, '');
  if (!normalized) {
    return null;
  }

  if (
    normalized.includes('HOME')
    || normalized === 'H'
    || normalized.includes('HOME_TEAM')
    || /^홈/.test(rawText)
    || normalized.includes('HOMETEAM')
    || /^H/.test(normalized)
  ) {
    return 'home';
  }

  if (
    normalized.includes('AWAY')
    || normalized.includes('AWAYTEAM')
    || normalized === 'A'
    || normalized.includes('VISITOR')
    || normalized.includes('TOP')
    || normalized.includes('원정')
    || normalized.includes('어웨이')
    || /^초/.test(rawText)
  ) {
    return 'away';
  }

  if (normalized.includes('BOTTOM') || normalized.includes('BOT') || /^말/.test(rawText)) {
    return 'home';
  }

  return null;
};

  const collectInningScoreEntries = (value: unknown): InningScorePayload[] => {
  const entries: InningScorePayload[] = [];

  const walk = (
    node: unknown,
    fallbackInning?: number | string | null,
    fallbackSide?: InningSide | null
  ) => {
    if (!Array.isArray(node) && !isObjectRecord(node)) {
      const run = toNumericScoreValue(node);
      if (run !== null && fallbackInning != null && fallbackSide) {
        entries.push({
          _inning: fallbackInning,
          side: fallbackSide,
          run,
        } as InningScorePayload);
      }
      return;
    }

    if (node === null || node === undefined) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, fallbackInning, fallbackSide));
      return;
    }

    if (!isObjectRecord(node)) {
      return;
    }

    if (isDirectInningScoreRecord(node)) {
      const nextScore: Record<string, unknown> = { ...node };
      if (fallbackInning != null) {
        nextScore._inning = fallbackInning;
      }
      if (fallbackSide) {
        nextScore.side = fallbackSide;
      }
      entries.push(nextScore as InningScorePayload);
      return;
    }

    const keys = Object.entries(node);
    if (keys.length > 0 && keys.every(([entryKey, entryValue]) => (
      isNumericInningKey(entryKey) !== null
      && (isObjectRecord(entryValue) || Array.isArray(entryValue))
    ))) {
      keys.forEach(([entryKey, entryValue]) => {
        const inningKey = isNumericInningKey(entryKey);
        walk(
          entryValue,
          inningKey == null ? undefined : inningKey,
          fallbackSide
        );
      });
      return;
    }

    keys.forEach((item) => {
      const [entryKey, entryItem] = item;
      const entryInning = isNumericInningKey(entryKey);
      walk(entryItem, entryInning == null ? fallbackInning : entryInning, inferInningSideFromRawKey(entryKey) || fallbackSide);
    });
  };

  walk(value);
  return entries;
};

const buildTeamNameAliasCandidates = (team: string): string[] => {
  const normalized = normalizeTeamText(team);
  if (!normalized) {
    return [];
  }

  const full = normalizeTeamText(getFullTeamName(team));
  const aliases = new Set<string>();
  aliases.add(normalized);
  if (full) {
    aliases.add(full);
    if (full.length >= 2) {
      aliases.add(full.slice(0, 2));
    }
    if (full.length >= 3) {
      aliases.add(full.slice(0, 3));
    }
  }

  return Array.from(aliases);
};

const isTeamTextMatch = (value: string, candidates: string[]): boolean => {
  const normalized = normalizeTeamText(value);
  if (!normalized) {
    return false;
  }

  return candidates.some((candidate) => {
    if (!candidate) {
      return false;
    }

    return normalized === candidate || normalized.includes(candidate) || candidate.includes(normalized);
  });
};

const normalizeInningTeamSide = (
  score: InningScorePayload,
  homeTeam: string,
  awayTeam: string
): InningSide | null => {
  const rawSide = toRawText(score.teamSide || score.side || score.team_side || score.side_code || score.sideCode);
  const rawSideNormalized = rawSide.toUpperCase().replace(/\s+/g, '');
  const hasTopMark = /초/.test(rawSide);
  const hasBottomMark = /말/.test(rawSide);
  const rawSideAlpha = rawSideNormalized.replace(/[^A-Z]/g, '');

  if (
    rawSideNormalized === 'TOP'
    || rawSideNormalized === 'TOP_INNING'
    || rawSideAlpha.includes('TOP')
    || rawSideAlpha.startsWith('T')
    || /^초/.test(rawSide)
    || hasTopMark
  ) {
    return 'away';
  }

  if (
    rawSideNormalized.includes('BOT')
    || rawSideNormalized.includes('BOTTOM')
    || rawSideAlpha.includes('BOTTOM')
    || rawSideAlpha.startsWith('B')
    || /^말/.test(rawSide)
    || hasBottomMark
  ) {
    return 'home';
  }

  if (
    rawSideNormalized === 'HOME'
    || rawSideNormalized === 'HOME_TEAM'
    || rawSideNormalized === 'H'
  ) {
    return 'home';
  }

  if (
    rawSideNormalized === 'AWAY'
    || rawSideNormalized === 'AWAY_TEAM'
    || rawSideNormalized === 'A'
  ) {
    return 'away';
  }

  const teamCode = toRawText(score.teamCode || score.team_code || score.teamSideCode || score.team_side_code);

  const awayTeamCode = normalizeTeamCode(awayTeam);
  const homeTeamCode = normalizeTeamCode(homeTeam);
  const awayTeamNameCandidates = buildTeamNameAliasCandidates(awayTeam);
  const homeTeamNameCandidates = buildTeamNameAliasCandidates(homeTeam);

  if (matchesTeamCode(teamCode, [awayTeamCode], awayTeamNameCandidates)) {
    return 'away';
  }

  if (matchesTeamCode(teamCode, [homeTeamCode], homeTeamNameCandidates)) {
    return 'home';
  }

  const teamText = toRawText(
    score.teamName
    ?? score.team_name
    ?? score.teamNm
    ?? score.team_nm
  );
  if (isTeamTextMatch(teamText, awayTeamNameCandidates)) {
    return 'away';
  }
  if (isTeamTextMatch(teamText, homeTeamNameCandidates)) {
    return 'home';
  }

  const sideName = toRawText(score.teamSideName ?? score.team_side_name ?? score.sideName ?? score.side_name);
  const normalizedSideName = sideName.toUpperCase().replace(/[^A-Z가-힣]/g, '');
  if (normalizedSideName.includes('원정') || normalizedSideName.includes('어웨이') || normalizedSideName.includes('AWAY')) {
    return 'away';
  }
  if (normalizedSideName.includes('홈') || normalizedSideName.includes('HOME')) {
    return 'home';
  }

  return null;
};

const getInningNumberFromPayload = (score: InningScorePayload): number | null => (
  parseInningNumber(score._inning)
  ?? parseInningNumber(score.inning
    ?? score.inningNo
    ?? score.inning_no
    ?? score.inningNum
    ?? score.inning_num
    ?? score.inningNumber
    ?? score.inning_number
    ?? score.order
    ?? score.orderNo
    ?? score.order_no
  )
);

const getInningRunsFromPayload = (score: InningScorePayload): number | null => (
  toNumericScoreValue(score.runs ?? score.run ?? score.score ?? score.r)
);

const getInningSideRunsFromPayload = (score: InningScorePayload): {
  home: number | null;
  away: number | null;
} => ({
  home: toNumericScoreValue(score.home ?? (score as Record<string, unknown>).homeScore ?? (score as Record<string, unknown>).home_score),
  away: toNumericScoreValue(score.away ?? (score as Record<string, unknown>).awayScore ?? (score as Record<string, unknown>).away_score),
});

const getExtraInningFlagFromPayload = (score: InningScorePayload, inning: number | null): boolean => {
  if (inning !== null && inning > 9) {
    return true;
  }
  const normalized = toBooleanValue(score.isExtra ?? score.is_extra ?? score.extra);
  return normalized === null ? false : normalized;
};

const extractInningScores = (gameDetail?: GameDetail | null): InningScorePayload[] => {
  const rawDetail = gameDetail as Record<string, unknown> | undefined;
  const rawCandidates = [
    gameDetail?.inningScores,
    gameDetail?.inning_scores,
    gameDetail?.inning_score,
    gameDetail?.lineScore,
    gameDetail?.line_score,
    gameDetail?.innings,
    rawDetail?.scores,
    rawDetail?.scoreByInning,
    rawDetail?.scoreByInningDetail,
    rawDetail?.scoreByInnings,
    rawDetail?.inningScore,
  ];

  const entries: InningScorePayload[] = [];

  rawCandidates.forEach((candidate) => {
    if (!candidate) {
      return;
    }

    entries.push(...collectInningScoreEntries(candidate));
  });

  return entries;
};

const buildInningRows = (game: Game, gameDetail?: GameDetail | null): Record<number, InningRow> => {
  const rows: Record<number, InningRow> = {};
  const unresolved: Record<number, InningScorePayload[]> = {};
  const inningScores = extractInningScores(gameDetail);

  inningScores.forEach((score) => {
    const inning = getInningNumberFromPayload(score);
    if (inning === null) return;

    const run = getInningRunsFromPayload(score);
    const { home: homeRun, away: awayRun } = getInningSideRunsFromPayload(score);
    const side = normalizeInningTeamSide(score, game.homeTeam, game.awayTeam);
    const isExtra = getExtraInningFlagFromPayload(score, inning);

    if (!rows[inning]) {
      rows[inning] = { home: null, away: null, extra: isExtra };
    } else {
      rows[inning].extra = rows[inning].extra || isExtra;
    }

    if (side === 'home') {
      const resolved = run ?? homeRun;
      if (resolved !== null) {
        rows[inning].home = resolved;
      } else if (homeRun !== null) {
        rows[inning].home = homeRun;
      }
      return;
    }

    if (side === 'away') {
      const resolved = run ?? awayRun;
      if (resolved !== null) {
        rows[inning].away = resolved;
      } else if (awayRun !== null) {
        rows[inning].away = awayRun;
      }
      return;
    }

    if (homeRun != null || awayRun != null) {
      if (!rows[inning]) {
        rows[inning] = { home: null, away: null, extra: isExtra };
      }
      if (homeRun != null) {
        rows[inning].home = homeRun;
      }
      if (awayRun != null) {
        rows[inning].away = awayRun;
      }
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(unresolved, inning)) {
      unresolved[inning] = [];
    }
    unresolved[inning].push(score);
  });

  Object.entries(unresolved).forEach(([inningRaw, entries]) => {
    const inning = Number(inningRaw);
    if (!Number.isFinite(inning) || !rows[inning]) {
      return;
    }

    entries.forEach((entry) => {
      const run = getInningRunsFromPayload(entry);
      const { home: homeRun, away: awayRun } = getInningSideRunsFromPayload(entry);

      if (rows[inning].away == null && awayRun != null) {
        rows[inning].away = awayRun;
        return;
      }
      if (rows[inning].home == null && homeRun != null) {
        rows[inning].home = homeRun;
        return;
      }

      if (run == null) {
        return;
      }

      if (rows[inning].away == null) {
        rows[inning].away = run;
        return;
      }
      if (rows[inning].home == null) {
        rows[inning].home = run;
      }
    });
  });

  return rows;
};

const formatTime = (value?: string | null) => {
  if (!value) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const toNumericScore = (value?: number | string | null): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(`${value}`.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export default function AdvancedMatchCard({
  game,
  gameDetail,
  gameDetailLoading = false,
  userVote,
  votePercentages,
  isVoteOpen,
  statusLabel,
  statusCode,
  onVote,
  onPrevDate,
  onNextDate,
  hasPrevDate,
  hasNextDate,
  coachBriefing,
}: AdvancedMatchCardProps) {
  const { homePercentage, awayPercentage, totalVotes } = votePercentages;
  const hasVoteResults = totalVotes > 0;

  // 애니메이션을 위한 상태 관리
  const [inningPage, setInningPage] = useState(0);
  const [countedScores, setCountedScores] = useState({ away: 0, home: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setInningPage(0);
    setIsVisible(false);
    setCountedScores({ away: 0, home: 0 });
  }, [game.gameId]);

  useEffect(() => {
    const node = scoreBoxRef.current;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 0;
    const isInView = rect.top < viewportHeight * 0.9 && rect.bottom > 0;

    if (isInView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          observerRef.current = null;
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -30% 0px' }
    );

    observerRef.current = observer;
    observer.observe(node);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [game.gameId]);

  const stadiumLabel = gameDetail?.stadiumName || gameDetail?.stadium || game.stadium;
  const startTimeLabel = gameDetail?.startTime || null;
  const homePitcherName = gameDetail?.homePitcher || game.homePitcher?.name || '발표 전';
  const awayPitcherName = gameDetail?.awayPitcher || game.awayPitcher?.name || '발표 전';
  const attendanceLabel = gameDetail?.attendance != null
    ? `${gameDetail.attendance.toLocaleString()}명`
    : null;
  const weatherLabel = gameDetail?.weather?.trim() || null;
  const gameTimeLabel = gameDetail?.gameTimeMinutes != null
    ? `${Math.floor(gameDetail.gameTimeMinutes / 60)}시간 ${gameDetail.gameTimeMinutes % 60}분`
    : null;

  const inningRows = buildInningRows(game, gameDetail);

  const inningKeys = Object.keys(inningRows)
    .map(Number)
    .sort((a, b) => a - b);
  const regularInnings = inningKeys.filter((inning) => inning <= 9);
  const extraInnings = inningKeys.filter((inning) => inning > 9);
  const regularInningCols = regularInnings.length
    ? regularInnings
    : Array.from({ length: 9 }, (_, index) => index + 1);
  const extraInningCols = extraInnings;
  const hasExtraInnings = extraInnings.length > 0;
  const hasDetailedInningScores = Object.keys(inningRows).length > 0;
  const inningTotals = Object.values(inningRows).reduce(
    (acc, score) => ({
      away: acc.away + (score.away ?? 0),
      home: acc.home + (score.home ?? 0),
    }),
    { away: 0, home: 0 }
  );

  const awayColor = getTeamColorByAnyKey(game.awayTeam);
  const homeColor = getTeamColorByAnyKey(game.homeTeam);
  const awayTeamName = getFullTeamName(game.awayTeam);
  const homeTeamName = getFullTeamName(game.homeTeam);
  const matchDateValue = gameDetail?.gameDate || game.gameDate;
  const matchDateLabel = matchDateValue ? matchDateValue.replace(/-/g, '.') : '';
  const formattedStartTime = formatTime(startTimeLabel) || GAME_TIME;
  const matchMetaLabel = [matchDateLabel, stadiumLabel, formattedStartTime]
    .filter(Boolean)
    .join(' | ');
  const resolvedAwayScore = toNumericScore(gameDetail?.awayScore ?? game.awayScore);
  const resolvedHomeScore = toNumericScore(gameDetail?.homeScore ?? game.homeScore);
  const awayScoreValue = resolvedAwayScore ?? (hasDetailedInningScores ? inningTotals.away : undefined);
  const homeScoreValue = resolvedHomeScore ?? (hasDetailedInningScores ? inningTotals.home : undefined);
  const hasGameScore = awayScoreValue != null && homeScoreValue != null;
  const awayScoreForDisplay = hasGameScore ? awayScoreValue : '-';
  const homeScoreForDisplay = hasGameScore ? homeScoreValue : '-';
  const awayAnimatedScore = awayScoreValue ?? 0;
  const homeAnimatedScore = homeScoreValue ?? 0;
  const lastInning = inningKeys.length > 0 ? Math.max(...inningKeys) : 9;
  const hasDetailedScores = hasGameScore || Object.keys(inningRows).length > 0;
  const isResultDecided = hasGameScore && (statusCode === 'COMPLETED' || statusCode === 'DRAW');
  const isInProgressScoring = hasGameScore && statusCode === 'LIVE';
  const isTie = hasGameScore && awayScoreValue === homeScoreValue;
  const winnerLabel = hasGameScore
    ? isTie
      ? (isResultDecided ? '무승부' : '동점')
      : awayScoreValue > homeScoreValue
        ? `${awayTeamName} 승`
        : `${homeTeamName} 승`
    : '';
  const isPostponedStatus = statusCode === 'POSTPONED';
  const isCancelledStatus = statusCode === 'CANCELLED';
  const isPostponedOrCancelled = isPostponedStatus || isCancelledStatus;
  const isScheduledLayout = statusCode === 'SCHEDULED';
  const shouldHideResultSections = (isScheduledLayout && !hasDetailedScores) || isPostponedOrCancelled;
  const scheduledStateLabel = isPostponedStatus
    ? '경기 연기'
    : isCancelledStatus
      ? '경기 취소'
      : '경기 시작 예정';
  const showStatusBadge = isPostponedOrCancelled || (isScheduledLayout && !hasDetailedScores);
  const matchStatusLabel = isPostponedOrCancelled
    ? scheduledStateLabel
    : (statusCode === 'COMPLETED' || statusCode === 'DRAW') && lastInning
      ? `경기 종료 (${lastInning}회)`
      : statusLabel;
  const cheeringCaption = isScheduledLayout ? '사전 응원/예측 참여수' : '실시간 팬 응원 참여수';
  const isScoreboardLoading = gameDetailLoading && !hasDetailedScores;

  const cheeringTotal = totalVotes;
  const awayVotes = cheeringTotal === 0
    ? 0
    : Math.round((awayPercentage / 100) * cheeringTotal);
  const homeVotes = cheeringTotal === 0
    ? 0
    : Math.max(0, cheeringTotal - awayVotes);
  const awayPercent = cheeringTotal === 0 ? 50 : (awayVotes / cheeringTotal) * 100;
  const homePercent = cheeringTotal === 0 ? 50 : (homeVotes / cheeringTotal) * 100;



  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const startAway = 0;
    const startHome = 0;
    let frameId = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextAway = Math.round(startAway + (awayAnimatedScore - startAway) * progress);
      const nextHome = Math.round(startHome + (homeAnimatedScore - startHome) * progress);
      setCountedScores({ away: nextAway, home: nextHome });
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [awayAnimatedScore, homeAnimatedScore, game.gameId, isVisible]);

  const handleInningDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (!hasExtraInnings) return;
    if (info.offset.x < -50 && inningPage === 0) {
      setInningPage(1);
    }
    if (info.offset.x > 50 && inningPage === 1) {
      setInningPage(0);
    }
  };

  const summaryGroups = useMemo(() => (gameDetail?.summary || []).reduce(
    (acc: Record<string, GameSummary[]>, item) => {
      const key = item.type || '기타';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, GameSummary[]>
  ), [gameDetail?.summary]);

  const summaryGroupDefs = useMemo(() => [
    { key: 'batting', title: '타격', types: ['결승타', '홈런', '2루타', '3루타', '병살타'] },
    { key: 'running', title: '주루', types: ['도루', '도루자', '주루사', '견제사'] },
    { key: 'pitching', title: '투구/실책', types: ['폭투', '포일', '보크', '실책'] },
    { key: 'etc', title: '기타', types: ['심판', '기타'] },
  ], []);

  const summaryTypeSet = useMemo(
    () => new Set(summaryGroupDefs.flatMap((group) => group.types)),
    [summaryGroupDefs]
  );
  const extraSummaryTypes = useMemo(
    () => Object.keys(summaryGroups).filter((type) => !summaryTypeSet.has(type)),
    [summaryGroups, summaryTypeSet]
  );

  const groupedSummary = useMemo(
    () => summaryGroupDefs
      .map((group) => {
        const types = group.key === 'etc'
          ? [...group.types, ...extraSummaryTypes]
          : group.types;

        const entries = types.flatMap((type) => {
          const items = summaryGroups[type] || [];
          const trimmed = type === '심판' ? items.slice(0, 1) : items;
          return trimmed.map((item) => ({ ...item, type }));
        });

        return { title: group.title, entries };
      })
      .filter((group) => group.entries.length > 0),
    [extraSummaryTypes, summaryGroupDefs, summaryGroups]
  );

  const extractInning = (detail?: string | null) => {
    if (!detail) return Number.POSITIVE_INFINITY;
    const match = detail.match(/(\d+)\s*회/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  const timelineEntries = useMemo(
    () => groupedSummary
      .flatMap((group) => group.entries.map((item) => ({ ...item, groupTitle: group.title })))
      .map((item, index) => ({
        ...item,
        _index: index,
        _inning: extractInning(item.detail),
      }))
      .sort((a, b) => (a._inning - b._inning) || (a._index - b._index)),
    [groupedSummary]
  );

  const matchEnvironmentSection = !gameDetailLoading && (attendanceLabel || weatherLabel || gameTimeLabel) ? (
    <section>
      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
        <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
        경기 환경
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 dark:border-border bg-white dark:bg-secondary/40 px-4 py-3 text-[13px]">
        <div>
          <p className="text-[12px] text-gray-400 dark:text-gray-300">관중</p>
          <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{attendanceLabel || '정보 없음'}</p>
        </div>
        <div>
          <p className="text-[12px] text-gray-400 dark:text-gray-300">날씨</p>
          <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{weatherLabel || '정보 없음'}</p>
        </div>
        <div>
          <p className="text-[12px] text-gray-400 dark:text-gray-300">경기시간</p>
          <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{gameTimeLabel || '정보 없음'}</p>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <Card className="overflow-hidden border border-slate-200/70 shadow-lg bg-white/90 dark:border-border dark:bg-card dark:shadow-xl transition-colors duration-300 mb-6 rounded-2xl">
      <div className="p-4 md:p-6">
        {isVoteOpen && (
          <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
            <Button
              onClick={() => onVote('away')}
              aria-pressed={userVote === 'away'}
              aria-label={`${getFullTeamName(game.awayTeam)} 승리 예측`}
              className="flex-1 py-4 md:py-6 min-h-[48px] text-white text-base md:text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{
                backgroundColor: getTeamColorByAnyKey(game.awayTeam),
                fontWeight: 700,
                opacity: userVote === 'away' ? 1 : userVote === 'home' ? 0.4 : 1,
                transform: userVote === 'away' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <span className="truncate px-2">{getFullTeamName(game.awayTeam)}</span>
              {userVote === 'away' && (
                <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                </span>
              )}
            </Button>
            <Button
              onClick={() => onVote('home')}
              aria-pressed={userVote === 'home'}
              aria-label={`${getFullTeamName(game.homeTeam)} 승리 예측`}
              data-testid="vote-home-btn"
              className="flex-1 py-4 md:py-6 min-h-[48px] text-white text-base md:text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{
                backgroundColor: getTeamColorByAnyKey(game.homeTeam),
                fontWeight: 700,
                opacity: userVote === 'home' ? 1 : userVote === 'away' ? 0.4 : 1,
                transform: userVote === 'home' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <span className="truncate px-2">{getFullTeamName(game.homeTeam)}</span>
              {userVote === 'home' && (
                <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                </span>
              )}
            </Button>
          </div>
        )}
        {!isVoteOpen && isPostponedOrCancelled && (
          <div className="mt-4 md:mt-6 space-y-2">
            <div className="flex gap-2 md:gap-3">
              <Button
                disabled
                data-testid="vote-disabled-away-btn"
                className="flex-1 py-4 md:py-6 min-h-[48px] rounded-xl border border-slate-200 bg-slate-100 text-slate-500 dark:border-border dark:bg-secondary dark:text-gray-300"
              >
                {awayTeamName}
              </Button>
              <Button
                disabled
                data-testid="vote-disabled-home-btn"
                className="flex-1 py-4 md:py-6 min-h-[48px] rounded-xl border border-slate-200 bg-slate-100 text-slate-500 dark:border-border dark:bg-secondary dark:text-gray-300"
              >
                {homeTeamName}
              </Button>
            </div>
            <p className="text-xs text-center text-amber-700 dark:text-amber-300">
              현재 상태에서는 투표할 수 없습니다.
            </p>
          </div>
        )}

        <DetailWrapper className="mt-4 md:mt-6 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div
            className="relative overflow-hidden rounded-t-2xl px-4 pt-12 pb-10 text-white"
            style={{
              background: `linear-gradient(110deg, ${awayColor} 50%, ${homeColor} 50%)`,
            }}
          >
            {/* Navigation Buttons (Desktop) */}
            <div className="hidden md:block">
              <button
                onClick={onPrevDate}
                disabled={!hasPrevDate}
                aria-label="이전 날짜 보기"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={onNextDate}
                disabled={!hasNextDate}
                aria-label="다음 날짜 보기"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            <div className="relative flex justify-center">
              {showStatusBadge && (
                <MetaBadge
                  data-testid="prediction-status-badge"
                  className={`absolute top-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur ${
                    isCancelledStatus
                      ? 'bg-rose-500/30 text-rose-100 border border-rose-200/40'
                      : isPostponedStatus
                        ? 'bg-amber-500/30 text-amber-50 border border-amber-100/40'
                        : 'bg-emerald-500/30 text-emerald-50 border border-emerald-100/40'
                  }`}
                >
                  {isPostponedOrCancelled ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5" />
                  )}
                  {scheduledStateLabel}
                </MetaBadge>
              )}
              <MetaBadge className={`absolute rounded-full bg-black/30 px-3 py-1 text-sm font-semibold backdrop-blur ${showStatusBadge ? 'top-8' : 'top-0'}`}>
                {matchMetaLabel || '경기 정보'}
              </MetaBadge>
            </div>
            <div className={`relative flex items-end justify-between gap-3 ${showStatusBadge ? 'mt-14' : 'mt-10'}`}>
              <div className="flex w-[30%] flex-col items-center text-center">
                <TeamLogoBox className="flex h-14 w-14 items-center justify-center text-xl font-black drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]">
                  <TeamLogo team={game.awayTeam} size={44} className="h-11 w-11" />
                </TeamLogoBox>
                <div className="mt-2 text-sm font-semibold">{awayTeamName}</div>
                <div className="text-[10px] text-white/80">AWAY</div>
              </div>
              <ScoreBox
                ref={scoreBoxRef}
                $visible={isVisible}
                className="relative -mb-2 w-[40%] rounded-xl border border-white/50 bg-white/80 backdrop-blur-md px-3 py-3 text-center text-gray-900 shadow-2xl dark:border-white/20 dark:bg-black/30 dark:text-white"
              >
                {isScheduledLayout ? (
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="h-px w-8 bg-gray-300 dark:bg-gray-600" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <Clock3 className="h-3 w-3" />
                      경기 시작 예정
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 text-3xl font-extrabold">
                      <span style={{ color: awayColor }}>{hasGameScore ? countedScores.away : '-'}</span>
                      <span className="text-gray-300 dark:text-gray-300">:</span>
                      <span style={{ color: homeColor }}>{hasGameScore ? countedScores.home : '-'}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-300">{matchStatusLabel}</div>
                    {winnerLabel ? (
                      <div className={`mt-1 text-[11px] font-bold ${winnerLabel === '무승부' ? 'text-amber-600 dark:text-amber-300' : 'text-slate-600 dark:text-slate-200'}`}>
                        {winnerLabel}
                      </div>
                    ) : null}
                  </>
                )}
              </ScoreBox>
              <div className="flex w-[30%] flex-col items-center text-center">
                <TeamLogoBox className="flex h-14 w-14 items-center justify-center text-xl font-black drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]">
                  <TeamLogo team={game.homeTeam} size={44} className="h-11 w-11" />
                </TeamLogoBox>
                <div className="mt-2 text-sm font-semibold">{homeTeamName}</div>
                <div className="text-[10px] text-white/80">HOME</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-6">
            {isScoreboardLoading && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-300">경기 정보를 불러오는 중입니다...</div>
            )}

            {!isScoreboardLoading && shouldHideResultSections && (
              <section>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-4 text-sm text-gray-600 dark:border-border dark:bg-secondary/40 dark:text-gray-200">
                  {isPostponedOrCancelled ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                      <p>
                        {isCancelledStatus
                          ? '해당 경기는 취소되어 투표 및 경기 상세 정보가 제공되지 않습니다.'
                          : '해당 경기는 연기되어 투표 및 경기 상세 정보가 제공되지 않습니다.'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                      <p>스코어보드와 경기 주요 기록은 경기 시작 후 제공됩니다.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {!isScoreboardLoading && !shouldHideResultSections && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
                  스코어보드
                  {hasExtraInnings && (
                    <span className="ml-auto text-xs text-gray-400">
                      {inningPage === 0 ? '연장이닝 보기 →' : '← 정규이닝 보기'}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40">
                  {hasExtraInnings ? (
                    <div className="overflow-hidden">
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleInningDragEnd}
                        animate={{ x: inningPage === 0 ? '0%' : '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="flex"
                      >
                        {[regularInningCols, extraInningCols].map((cols, index) => (
                          <div key={index} className="min-w-full px-3 py-3">
                            <table className="w-full table-fixed border-collapse text-center text-[13px]">
                              <thead className="bg-gray-100 dark:bg-border/60 text-[12px] text-gray-600 dark:text-gray-200 border-b border-gray-200 dark:border-border">
                                <tr>
                                  <th className="px-2 py-2 text-left font-semibold">팀</th>
                                  {cols.map((inning) => (
                                    <th key={inning} className="px-2 py-2 border-l border-gray-200 dark:border-border/70">{inning}</th>
                                  ))}
                                  <th className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600">R</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-700 dark:text-gray-200">
                                <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                                  <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={{ color: awayColor }}>
                                    {awayTeamName}
                                  </td>
                                  {cols.map((inning) => (
                                  <td key={`away-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                    {inningRows[inning]?.away ?? '-'}
                                  </td>
                                ))}
                                  <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">
                                    {awayScoreForDisplay}
                                  </td>
                                </tr>
                                <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                                  <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={{ color: homeColor }}>
                                    {homeTeamName}
                                  </td>
                                  {cols.map((inning) => (
                                  <td key={`home-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                    {inningRows[inning]?.home ?? '-'}
                                  </td>
                                ))}
                                  <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">
                                    {homeScoreForDisplay}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </motion.div>
                      <div className="mt-3 flex justify-center gap-2">
                        {[0, 1].map((page) => (
                          <span
                            key={page}
                            className={`h-2 w-2 rounded-full ${inningPage === page ? 'bg-gray-800 dark:bg-gray-100' : 'bg-gray-200 dark:bg-border'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-3">
                      <table className="w-full table-fixed border-collapse text-center text-[13px]">
                        <thead className="bg-gray-100 dark:bg-border/60 text-[12px] text-gray-600 dark:text-gray-200 border-b border-gray-200 dark:border-border">
                          <tr>
                            <th className="px-2 py-2 text-left font-semibold">팀</th>
                            {regularInningCols.map((inning) => (
                              <th key={inning} className="px-2 py-2 border-l border-gray-200 dark:border-border/70">{inning}</th>
                            ))}
                            <th className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600">R</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200">
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-white dark:bg-card hover:bg-emerald-50/50 dark:hover:bg-secondary/50 transition-colors">
                            <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={{ color: awayColor }}>
                              {awayTeamName}
                            </td>
                            {regularInningCols.map((inning) => (
                              <td key={`away-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                {inningRows[inning]?.away ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">{awayScoreForDisplay}</td>
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-border/70 bg-gray-50/70 dark:bg-secondary/50 hover:bg-emerald-50/50 dark:hover:bg-secondary/60 transition-colors">
                            <td className="px-2 py-2 text-left font-semibold bg-gray-50/70 dark:bg-secondary/30" style={{ color: homeColor }}>
                              {homeTeamName}
                            </td>
                            {regularInningCols.map((inning) => (
                              <td key={`home-${inning}`} className="px-2 py-2 border-l border-gray-100 dark:border-border/60">
                                {inningRows[inning]?.home ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 border-l border-gray-200 dark:border-border font-semibold text-red-600 bg-red-50/40 dark:bg-red-900/20">{homeScoreForDisplay}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {!gameDetailLoading && !isPostponedOrCancelled && (
              <section>
                <GaugeContainer>
                  <GaugeHeader>
                    <TeamInfo $color={awayColor} $align="left">
                      <div className="name">{awayTeamName} 응원</div>
                      <div className="count">
                        {awayVotes.toLocaleString()}
                        <span className="percent">({awayPercent.toFixed(1)}%)</span>
                      </div>
                    </TeamInfo>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ fontSize: '1.2rem', paddingBottom: '5px' }}
                      aria-hidden
                    >
                      🔥
                    </motion.div>
                    <TeamInfo $color={homeColor} $align="right">
                      <div className="name">{homeTeamName} 응원</div>
                      <div className="count">
                        <span className="percent" style={{ marginRight: '4px' }}>({homePercent.toFixed(1)}%)</span>
                        {homeVotes.toLocaleString()}
                      </div>
                    </TeamInfo>
                  </GaugeHeader>
                  <ProgressBarWrapper>
                    <GaugeBar
                      color={awayColor}
                      initial={{ width: '50%' }}
                      animate={{ width: `${awayPercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                    <CenterSlash
                      initial={{ left: '50%' }}
                      animate={{ left: `${awayPercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                    <GaugeBar
                      color={homeColor}
                      initial={{ width: '50%' }}
                      animate={{ width: `${homePercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                  </ProgressBarWrapper>
                  <div data-testid="cheering-gauge-caption" className="mt-2 text-center text-[12px] text-gray-500 dark:text-gray-300">
                    {cheeringCaption}: {cheeringTotal.toLocaleString()}명
                  </div>
                </GaugeContainer>
              </section>
            )}

            {!gameDetailLoading && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
                  선발 투수
                </div>
                <div className="flex items-center rounded-xl border border-gray-100 dark:border-border bg-gray-50 dark:bg-secondary/40 px-4 py-4 shadow-sm">
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold" style={{ color: awayColor }}>
                      {awayTeamName}
                    </p>
                    <p className="mt-1 text-[15px] font-bold text-gray-900 dark:text-gray-100">{awayPitcherName}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-border" />
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold" style={{ color: homeColor }}>
                      {homeTeamName}
                    </p>
                    <p className="mt-1 text-[15px] font-bold text-gray-900 dark:text-gray-100">{homePitcherName}</p>
                  </div>
                </div>
              </section>
            )}

            {!gameDetailLoading && !isPostponedOrCancelled && coachBriefing}

            {!gameDetailLoading && !shouldHideResultSections && timelineEntries.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
                  경기 주요 기록
                </div>
                <LayoutGroup>
                  <div className="relative">
                    <span className="absolute left-3 top-1 bottom-1 w-px bg-gray-200 dark:bg-border z-0" />
                    <div className="space-y-4">
                      {timelineEntries.map((item, index) => {
                        const isHighlight = item.type === '결승타';
                        const badgeColor = isHighlight ? awayColor : homeColor;
                        return (
                          <TimelineItem key={`${item.type}-${index}`} className="relative">
                            <TimelineCard
                              layout
                              className="ml-6 rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40 px-3 py-2 shadow-sm"
                            >
                              <span
                                className="absolute left-3 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full border z-10"
                                style={{
                                  backgroundColor: isHighlight ? badgeColor : '#ffffff',
                                  borderColor: badgeColor,
                                  boxShadow: isHighlight ? `0 0 0 6px ${badgeColor}22` : 'none',
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <EventBadge style={{ backgroundColor: badgeColor }}>
                                  {item.type}
                                </EventBadge>
                                <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
                                  {item.playerName || '기록'}
                                </p>
                              </div>
                              {item.detail && (
                                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-300">
                                  {item.detail}
                                </p>
                              )}
                            </TimelineCard>
                          </TimelineItem>
                        );
                      })}
                    </div>
                  </div>
                </LayoutGroup>
              </section>
            )}

            {!gameDetailLoading && !shouldHideResultSections && Object.keys(inningRows).length === 0 && timelineEntries.length === 0 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-300">표시할 경기 상세 정보가 없습니다.</div>
            )}

            {!gameDetailLoading && !shouldHideResultSections && summaryGroups['심판']?.length > 0 && (
              <div className="border-t border-gray-100 dark:border-border pt-4 text-center text-[11px] text-gray-500 dark:text-gray-300">
                심판: {summaryGroups['심판'][0]?.playerName || summaryGroups['심판'][0]?.detail || '정보 없음'}
              </div>
            )}
            {matchEnvironmentSection}
          </div>
        </DetailWrapper>
      </div>
    </Card>
  );
}
