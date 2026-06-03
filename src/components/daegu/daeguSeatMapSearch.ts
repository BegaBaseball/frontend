import {
  DAEGU_CATEGORIES,
  getDaeguFanRoleLabel,
  getDaeguSideLabel,
  type DaeguBlock,
} from '../../data/daeguSeatData';
import { DAEGU_CANONICAL_MARKER_ALIASES } from '../../data/daeguCanonicalSeatMap';

type RankedDaeguBlock<TBlock extends DaeguBlock> = {
  block: TBlock;
  rank: number;
};

const DAEGU_GLOBAL_ALIASES = [
  '대구',
  '삼성',
  '라팍',
  '라이온즈파크',
  '삼성라이온즈파크',
  '대구삼성라이온즈파크',
  '대구 삼성 라이온즈파크',
  '대구 삼성 라이온즈 파크',
];

export function normalizeDaeguSearchText(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase().replace(/[\s\-_/()·.]/g, '');
}

function normalizeDaeguCompactText(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '');
}

function includesNormalized(values: string[], query: string): boolean {
  const normalizedQuery = normalizeDaeguSearchText(query);
  return values.some((value) => normalizeDaeguSearchText(value).includes(normalizedQuery));
}

function equalsCompact(values: string[], query: string): boolean {
  const compactQuery = normalizeDaeguCompactText(query);
  return values.some((value) => normalizeDaeguCompactText(value) === compactQuery);
}

function blockMarkerAliasTerms(block: DaeguBlock): string[] {
  const blockKeys = new Set([
    normalizeDaeguSearchText(block.block),
    normalizeDaeguSearchText((block as Partial<{ canonicalBlockKey: string }>).canonicalBlockKey),
  ]);

  return DAEGU_CANONICAL_MARKER_ALIASES
    .filter((alias) => blockKeys.has(normalizeDaeguSearchText(alias.blockKey)))
    .flatMap((alias) => [
      ...alias.blockLabels,
      ...alias.sectionIds,
      ...alias.sectionKinds,
      alias.aliasReason,
      ...(alias.sectionKinds.includes('ACCESSIBILITY_MARKER') ? ['휠체어', '휠체어석', '장애인석', '접근성'] : []),
    ]);
}

export function buildDaeguSeatMapSearchTerms(block: DaeguBlock): string[] {
  const category = DAEGU_CATEGORIES[block.category];

  return [
    block.id,
    block.name,
    block.block,
    `${block.block}블록`,
    `${block.block} 블록`,
    ...block.officialBlocks,
    ...(category ? [category.label] : []),
    getDaeguSideLabel(block.side),
    getDaeguFanRoleLabel(block.fanRole),
    ...block.seatViewSections,
    ...blockMarkerAliasTerms(block),
    ...DAEGU_GLOBAL_ALIASES,
  ].filter(Boolean);
}

export function rankDaeguSeatMapSearchResult(block: DaeguBlock, searchTerm: string): number {
  const query = searchTerm.trim();
  if (!query) return 0;

  if (equalsCompact([block.block], query)) return 10;
  if (normalizeDaeguSearchText(block.block) === normalizeDaeguSearchText(query)) return 20;
  if (includesNormalized(block.officialBlocks, query)) return 30;
  if (includesNormalized([block.name], query)) return 40;

  const category = DAEGU_CATEGORIES[block.category];
  const categoryAndRoleTerms = [
    category?.label,
    getDaeguSideLabel(block.side),
    getDaeguFanRoleLabel(block.fanRole),
  ].filter(Boolean);
  if (includesNormalized(categoryAndRoleTerms, query)) return 50;

  if (includesNormalized(block.seatViewSections, query)) return 60;
  if (includesNormalized(blockMarkerAliasTerms(block), query)) return 65;
  if (includesNormalized(DAEGU_GLOBAL_ALIASES, query)) return 70;

  return Number.POSITIVE_INFINITY;
}

export function filterAndRankDaeguSeatMapBlocks<TBlock extends DaeguBlock>(
  blocks: TBlock[],
  searchTerm: string,
): TBlock[] {
  const query = searchTerm.trim();
  if (!query) return blocks;

  return blocks
    .map<RankedDaeguBlock<TBlock>>((block) => ({
      block,
      rank: rankDaeguSeatMapSearchResult(block, query),
    }))
    .filter((result) => Number.isFinite(result.rank))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.block.block.localeCompare(right.block.block, 'ko');
    })
    .map((result) => result.block);
}
