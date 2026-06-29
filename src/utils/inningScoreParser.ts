import type { Game, GameDetail, RawGameInningScore } from '../types/prediction';
import { getFullTeamName } from '../constants/teams';
import { normalizeTeamCode, normalizeTeamText, matchesTeamCode } from './inningTeamResolution';

export type InningScorePayload = RawGameInningScore & {
  _inning?: string | number | null;
};

export type InningSide = 'home' | 'away';

export type InningRow = { home: number | null; away: number | null; extra: boolean | null };

export const toRawText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return `${value}`.trim();
};

export const toNumericScoreValue = (value?: unknown): number | null => {
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
      node.forEach((item, index) => {
        const indexedPrimitiveInning = fallbackInning == null
          && fallbackSide
          && !Array.isArray(item)
          && !isObjectRecord(item)
          ? index + 1
          : fallbackInning;
        walk(item, indexedPrimitiveInning, fallbackSide);
      });
      return;
    }

    if (!isObjectRecord(node)) {
      return;
    }

    const keys = Object.entries(node);
    const sideCollectionEntries = keys
      .map(([entryKey, entryValue]) => ({
        side: inferInningSideFromRawKey(entryKey),
        value: entryValue,
      }))
      .filter((entry) => (
        entry.side
        && (Array.isArray(entry.value) || isObjectRecord(entry.value))
      ));
    if (keys.length > 0 && sideCollectionEntries.length === keys.length) {
      sideCollectionEntries.forEach((entry) => {
        walk(entry.value, fallbackInning, entry.side);
      });
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
    gameDetail?.boxScore,
    gameDetail?.lineScore,
    gameDetail?.line_score,
    gameDetail?.innings,
    rawDetail?.box_score,
    rawDetail?.boxscore,
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

const isMeaningfulInningScore = (score: InningScorePayload): boolean => {
  const inning = getInningNumberFromPayload(score);
  if (inning === null) {
    return false;
  }

  const run = getInningRunsFromPayload(score);
  const { home, away } = getInningSideRunsFromPayload(score);
  return run !== null || home !== null || away !== null;
};

const extractMeaningfulInningScores = (gameDetail?: GameDetail | null): InningScorePayload[] => (
  extractInningScores(gameDetail).filter(isMeaningfulInningScore)
);

export const hasMeaningfulInningScoreData = (gameDetail?: GameDetail | null): boolean => (
  extractMeaningfulInningScores(gameDetail).length > 0
);

export const hasRenderableInningScoreData = (gameDetail?: GameDetail | null): boolean => {
  if (!gameDetail) {
    return false;
  }

  return Object.keys(buildInningRows({
    gameId: gameDetail.gameId,
    homeTeam: gameDetail.homeTeam,
    awayTeam: gameDetail.awayTeam,
    stadium: gameDetail.stadium ?? gameDetail.stadiumName ?? '',
    homeScore: gameDetail.homeScore ?? undefined,
    awayScore: gameDetail.awayScore ?? undefined,
  }, gameDetail)).length > 0;
};

const isAllZeroTemplateRows = (rows: Record<number, InningRow>): boolean => {
  const values = Object.values(rows);
  if (values.length === 0) {
    return false;
  }

  return values.every((row) => (row.home ?? 0) === 0 && (row.away ?? 0) === 0);
};

const trimRowsToFinalScore = (
  rows: Record<number, InningRow>,
  homeScore: number | null,
  awayScore: number | null
): Record<number, InningRow> => {
  if (homeScore == null || awayScore == null || homeScore === awayScore) {
    return rows;
  }

  const inningKeys = Object.keys(rows)
    .map(Number)
    .filter((inning) => Number.isFinite(inning))
    .sort((a, b) => a - b);

  let cumulativeHome = 0;
  let cumulativeAway = 0;
  let capInning: number | null = null;

  inningKeys.forEach((inning) => {
    const row = rows[inning];
    cumulativeHome += row.home ?? 0;
    cumulativeAway += row.away ?? 0;
    if (inning >= 9 && capInning == null && cumulativeHome === homeScore && cumulativeAway === awayScore) {
      capInning = inning;
    }
  });

  if (capInning == null) {
    return rows;
  }

  const resolvedCapInning = capInning;

  return Object.fromEntries(
    Object.entries(rows).filter(([inning]) => Number(inning) <= resolvedCapInning)
  );
};

const trimRowsToDecisiveInningWithoutFinalScore = (
  rows: Record<number, InningRow>
): Record<number, InningRow> => {
  const inningKeys = Object.keys(rows)
    .map(Number)
    .filter((inning) => Number.isFinite(inning))
    .sort((a, b) => a - b);

  if (inningKeys.length <= 9) {
    return rows;
  }

  let cumulativeHome = 0;
  let cumulativeAway = 0;

  for (const inning of inningKeys) {
    const row = rows[inning];
    cumulativeHome += row.home ?? 0;
    cumulativeAway += row.away ?? 0;

    if (inning < 9 || cumulativeHome === cumulativeAway) {
      continue;
    }

    const laterInnings = inningKeys.filter((candidate) => candidate > inning);
    if (
      laterInnings.length > 0
      && laterInnings.every((candidate) => {
        const candidateRow = rows[candidate];
        return (candidateRow.home ?? 0) === 0 && (candidateRow.away ?? 0) === 0;
      })
    ) {
      return Object.fromEntries(
        Object.entries(rows).filter(([candidate]) => Number(candidate) <= inning)
      );
    }
  }

  return rows;
};

export const buildInningRows = (game: Game, gameDetail?: GameDetail | null): Record<number, InningRow> => {
  const rows: Record<number, InningRow> = {};
  const unresolved: Record<number, InningScorePayload[]> = {};
  const inningScores = extractMeaningfulInningScores(gameDetail);

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

  const resolvedHomeScore = toNumericScore(gameDetail?.homeScore ?? game.homeScore);
  const resolvedAwayScore = toNumericScore(gameDetail?.awayScore ?? game.awayScore);

  if (resolvedHomeScore == null && resolvedAwayScore == null && isAllZeroTemplateRows(rows)) {
    return {};
  }

  const trimmedRows = trimRowsToFinalScore(rows, resolvedHomeScore, resolvedAwayScore);
  if (resolvedHomeScore != null && resolvedAwayScore != null) {
    return trimmedRows;
  }

  return trimRowsToDecisiveInningWithoutFinalScore(trimmedRows);
};

export const formatTime = (value?: string | null) => {
  if (!value) return null;
  return value.length >= 5 ? value.slice(0, 5) : value;
};

export const toNumericScore = (value?: number | string | null): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(`${value}`.trim());
  return Number.isFinite(parsed) ? parsed : null;
};
