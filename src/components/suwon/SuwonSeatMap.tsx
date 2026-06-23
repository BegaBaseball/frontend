import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, Plus, Trash2, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_CATEGORY_GROUPS,
  SUWON_SEATMAP_IMAGE,
  SUWON_TRACE_REVIEW_SUMMARY,
  SUWON_VIEW_INFO,
  getSuwonFanRoleLabel,
  getSuwonSideLabel,
  getSuwonSourceLabel,
  type SuwonBlock,
} from '../../data/suwonSeatData';
import { getSuwonOperatorVisitGuidance } from '../../data/suwonOperatorVisitGuide';
import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  formatManualBaseballDataDisplayValue,
} from '../../utils/manualBaseballDataContract';
import SuwonSeatMapSvg, { type SeatMapPan } from './SuwonSeatMapSvg';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import SuwonUploadFlowModal from './SuwonUploadFlowModal';
import { SeatMapAttribution } from '../stadiumSeatMap/SeatMapAttribution';
import { SeatMapBottomSheet } from '../stadiumSeatMap/SeatMapBottomSheet';
import { SeatMapDetailPanel } from '../stadiumSeatMap/SeatMapDetailPanel';
import { SeatMapFilterBar } from '../stadiumSeatMap/SeatMapFilterBar';
import { SeatMapLegend } from '../stadiumSeatMap/SeatMapLegend';
import { SeatMapSectionFinder } from '../stadiumSeatMap/SeatMapSectionFinder';
import { SeatMapTemplateShell } from '../stadiumSeatMap/SeatMapTemplateShell';
import { useSeatMapSelectionState } from '../stadiumSeatMap/useSeatMapSelectionState';
import { useSeatMapTemplateShellState } from '../stadiumSeatMap/useSeatMapTemplateShellState';
import type { SeatMapSectionAdapter } from '../stadiumSeatMap/seatMapCommonTypes';

const MIN_ZOOM = 1;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
const FINDER_FOCUS_ZOOM = 1.35;
const COMPARE_FOCUS_ZOOM = 1.35;
const COMPARISON_LIMIT = 3;
const RECENT_SELECTION_LIMIT = 4;
const GUIDE_RESULT_LIMIT = 12;
const MANUAL_OPERATOR_GUIDANCE_STATUS = MANUAL_BASEBALL_DATA_REQUIRED_CODE;

type SuwonGuideIntent =
  | '전체'
  | '홈 응원'
  | '원정/3루'
  | '중앙'
  | '스카이'
  | '가족/외야'
  | '휠체어석';
type SuwonMobileToolTab = 'guide' | 'finder';

const SUWON_MOBILE_TOOL_TAB_TEST_IDS: Record<SuwonMobileToolTab, string> = {
  guide: 'suwon-mobile-tool-tab-guide',
  finder: 'suwon-mobile-tool-tab-finder',
};

interface SuwonGuideMatch {
  block: SuwonBlock;
  reasons: string[];
  tags: string[];
  score: number;
}

const SUWON_GUIDE_INTENTS: Array<{ id: SuwonGuideIntent; label: string; testId: string }> = [
  { id: '전체', label: '전체', testId: 'all' },
  { id: '홈 응원', label: '홈 응원', testId: 'home' },
  { id: '원정/3루', label: '원정/3루', testId: 'away-third' },
  { id: '중앙', label: '중앙', testId: 'center' },
  { id: '스카이', label: '스카이', testId: 'sky' },
  { id: '가족/외야', label: '가족/외야', testId: 'family-outfield' },
  { id: '휠체어석', label: '휠체어석', testId: 'accessible' },
];

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

const suwonSectionAdapter: SeatMapSectionAdapter<SuwonBlock> = {
  getId: (section) => section.id,
  getName: (section) => section.name,
  getBlock: (section) => section.block,
  getCategoryId: (section) => section.category,
  getLevel: (section) => section.level,
  getOfficialBlocks: (section) => section.officialBlocks,
  getSideLabel: (section) => getSuwonSideLabel(section.side),
  getFanRoleLabel: (section) => getSuwonFanRoleLabel(section.fanRole),
  getSourceLabel: (section) => getSuwonSourceLabel(section.sourceConfidence),
  getSourceNote: (section) => section.sourceNote,
  getSeatViewSections: (section) => section.seatViewSections,
  getAccessibilityNote: (section) => section.accessibilityNote,
  getDistance: (section) => {
    const info = SUWON_VIEW_INFO[section.id as keyof typeof SUWON_VIEW_INFO] as { distance?: string } | undefined;
    return info?.distance;
  },
  getNotes: (section) => (
    section.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      ? '공식 이미지 기준 polygon 재추적 완료'
      : '공식 이미지 기준 정밀 재추적 대기'
  ),
};

function getSuwonGuideTags(block: SuwonBlock): string[] {
  return Array.from(new Set([
    SUWON_CATEGORIES[block.category]?.label,
    getSuwonSideLabel(block.side),
    getSuwonFanRoleLabel(block.fanRole),
    block.level,
  ].filter((tag): tag is string => Boolean(tag))));
}

function getSuwonGuideIntentReasons(intent: SuwonGuideIntent, block: SuwonBlock): string[] {
  const reasons: string[] = [];

  if (intent === '전체') reasons.push('전체');
  if (intent === '홈 응원' && (block.fanRole === 'HOME' || block.category === 'HOME_CHEERING')) {
    reasons.push(block.category === 'HOME_CHEERING' ? '1루 응원석' : '홈 응원');
  }
  if (intent === '원정/3루' && (block.fanRole === 'AWAY' || block.side === 'THIRD_BASE' || block.category === 'AWAY_CHEERING')) {
    reasons.push(block.category === 'AWAY_CHEERING' ? '3루 응원석' : '원정/3루');
  }
  if (intent === '중앙' && (block.side === 'CENTER' || block.category === 'CENTRAL' || block.category === 'GENIE')) {
    reasons.push(block.category === 'GENIE' ? '지니존/BC카드존' : '중앙');
  }
  if (intent === '스카이' && (block.category === 'SKYBOX' || block.category === 'SKYZONE')) {
    reasons.push(block.category === 'SKYBOX' ? '스카이박스' : '스카이존');
  }
  if (intent === '가족/외야' && (
    block.side === 'OUTFIELD'
    || ['OUTFIELD_GRASS', 'OUTFIELD_TABLE', 'K_LIVE', 'PUB', 'KIDS'].includes(block.category)
  )) {
    reasons.push(block.category === 'KIDS' ? '가족 구역' : '외야');
  }
  if (intent === '휠체어석' && block.category === 'ACCESSIBLE') {
    reasons.push('휠체어석');
  }

  return Array.from(new Set(reasons));
}

function getSuwonGuidePriority(intent: SuwonGuideIntent, block: SuwonBlock): number {
  if (intent === '홈 응원') return block.category === 'HOME_CHEERING' ? 120 : 60;
  if (intent === '원정/3루') return block.category === 'AWAY_CHEERING' ? 120 : block.fanRole === 'AWAY' ? 90 : 50;
  if (intent === '중앙') return block.category === 'CENTRAL' ? 120 : block.category === 'GENIE' ? 110 : 70;
  if (intent === '스카이') return block.category === 'SKYBOX' ? 120 : 90;
  if (intent === '가족/외야') {
    if (block.category === 'KIDS') return 120;
    if (block.category === 'OUTFIELD_GRASS') return 110;
    return block.side === 'OUTFIELD' ? 80 : 50;
  }
  if (intent === '휠체어석') return 120;

  const categoryPriority: Record<string, number> = {
    CENTRAL: 120,
    HOME_CHEERING: 112,
    AWAY_CHEERING: 110,
    GENIE: 104,
    SKYBOX: 96,
    SKYZONE: 90,
    KIDS: 82,
    OUTFIELD_GRASS: 80,
    ACCESSIBLE: 78,
  };
  return categoryPriority[block.category] ?? 50;
}

function getSuwonGuideMatches(intent: SuwonGuideIntent, blocks: SuwonBlock[] = SUWON_BLOCKS): SuwonGuideMatch[] {
  return blocks
    .map((block, index) => {
      const reasons = getSuwonGuideIntentReasons(intent, block);
      if (intent !== '전체' && reasons.length === 0) return null;

      return {
        block,
        reasons,
        tags: getSuwonGuideTags(block),
        score: getSuwonGuidePriority(intent, block) + Math.max(0, blocks.length - index) / 1000,
      };
    })
    .filter((match): match is SuwonGuideMatch => Boolean(match))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.block.block.localeCompare(right.block.block, 'ko');
    });
}

function SuwonFirstVisitGuide({
  intent,
  matches,
  mode,
  onIntentChange,
  onSelectBlock,
}: {
  intent: SuwonGuideIntent;
  matches: SuwonGuideMatch[];
  mode: 'light' | 'dark';
  onIntentChange: (value: SuwonGuideIntent) => void;
  onSelectBlock: (block: SuwonBlock) => void;
}) {
  const visibleMatches = matches.slice(0, GUIDE_RESULT_LIMIT);
  const isDark = mode === 'dark';

  return (
    <section
      data-testid="suwon-first-visit-guide"
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">처음 수원 가이드</h3>
          <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-white">
            {matches.length}개 블록
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-white">
          KT
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SUWON_GUIDE_INTENTS.map((option) => {
          const active = intent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid={`suwon-guide-intent-${option.testId}`}
              onClick={() => onIntentChange(option.id)}
              aria-pressed={active}
              className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: active ? '#0B57A7' : 'transparent',
                borderColor: active ? '#0B57A7' : (isDark ? '#334155' : '#e2e8f0'),
                color: active ? '#fff' : (isDark ? '#cbd5e1' : '#334155'),
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {visibleMatches.length > 0 ? (
          visibleMatches.map(({ block, reasons, tags }) => {
            const cat = SUWON_CATEGORIES[block.category];
            const accent = mode === 'dark' ? cat?.dark : cat?.light;

            return (
              <button
                key={block.id}
                type="button"
                data-testid={`suwon-guide-result-${block.id}`}
                onClick={() => onSelectBlock(block)}
                className="shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700"
                style={{
                  borderColor: accent ? `${accent}66` : undefined,
                  background: isDark ? '#000000' : '#f8fafc',
                }}
              >
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  {block.block}
                  <span className="ml-1 font-semibold text-slate-500 dark:text-white">
                    {cat?.label ?? block.name}
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-white">
                  {[...reasons.slice(0, 2), ...tags.slice(0, 1)].join(' · ')}
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-white">
            표시할 블록이 없습니다
          </div>
        )}
      </div>
    </section>
  );
}

function SuwonMobileSecondaryPanel({
  activeTab,
  guidePanel,
  finderPanel,
  mode,
  onTabChange,
}: {
  activeTab: SuwonMobileToolTab;
  guidePanel: ReactNode;
  finderPanel: ReactNode;
  mode: 'light' | 'dark';
  onTabChange: (tab: SuwonMobileToolTab) => void;
}) {
  const tabs: Array<{ id: SuwonMobileToolTab; label: string; testId: string }> = [
    { id: 'guide', label: '처음 가이드', testId: SUWON_MOBILE_TOOL_TAB_TEST_IDS.guide },
    { id: 'finder', label: '블록 검색', testId: SUWON_MOBILE_TOOL_TAB_TEST_IDS.finder },
  ];
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <section data-testid="suwon-mobile-secondary-panel" className="space-y-3">
      <div
        role="tablist"
        aria-label="수원 모바일 좌석도 도구"
        className="grid grid-cols-2 rounded-xl border bg-white p-1 shadow-sm dark:bg-slate-900"
        style={{ borderColor }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={tab.testId}
              onClick={() => onTabChange(tab.id)}
              className="h-9 cursor-pointer rounded-lg text-sm font-black transition-colors"
              style={{
                background: active ? '#0B57A7' : 'transparent',
                color: active ? '#fff' : (mode === 'dark' ? '#cbd5e1' : '#334155'),
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div data-testid="suwon-mobile-secondary-panel-body">
        {activeTab === 'guide' ? guidePanel : finderPanel}
      </div>
    </section>
  );
}

function SuwonCompareAction({
  section,
  isCompared,
  canAdd,
  accent,
  onAdd,
  onRemove,
}: {
  section: SuwonBlock;
  isCompared: boolean;
  canAdd: boolean;
  accent: string;
  onAdd: (block: SuwonBlock) => void;
  onRemove: (blockId: string) => void;
}) {
  const disabled = !isCompared && !canAdd;

  return (
    <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
      <button
        type="button"
        data-testid={isCompared ? 'suwon-compare-remove' : 'suwon-compare-add'}
        onClick={() => {
          if (isCompared) {
            onRemove(section.id);
            return;
          }
          onAdd(section);
        }}
        disabled={disabled}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          borderColor: isCompared ? `${accent}66` : disabled ? '#cbd5e1' : accent,
          background: isCompared ? 'transparent' : disabled ? '#f1f5f9' : `${accent}14`,
          color: disabled ? '#64748b' : accent,
        }}
      >
        {isCompared ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isCompared ? '비교에서 제거' : disabled ? '비교는 3개까지' : '비교에 추가'}
      </button>
    </div>
  );
}

function SuwonCompareTray({
  comparisonBlocks,
  recentBlocks,
  selectedId,
  mode,
  onView,
  onAdd,
  onRemove,
  onClear,
}: {
  comparisonBlocks: SuwonBlock[];
  recentBlocks: SuwonBlock[];
  selectedId: string | null;
  mode: 'light' | 'dark';
  onView: (block: SuwonBlock) => void;
  onAdd: (block: SuwonBlock) => void;
  onRemove: (blockId: string) => void;
  onClear: () => void;
}) {
  const isFull = comparisonBlocks.length >= COMPARISON_LIMIT;
  const borderColor = mode === 'dark' ? '#334155' : '#e2e8f0';

  return (
    <section
      data-testid="suwon-compare-tray"
      className="mb-3 rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900"
      style={{ borderColor }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">후보 비교</h3>
          <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-white">
            {comparisonBlocks.length}/{COMPARISON_LIMIT}개 선택
          </p>
        </div>
        <button
          type="button"
          data-testid="suwon-compare-clear"
          onClick={onClear}
          disabled={comparisonBlocks.length === 0}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white dark:hover:bg-slate-800"
          style={{ borderColor }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          비우기
        </button>
      </div>

      {comparisonBlocks.length > 0 ? (
        <div className="grid gap-2">
          {comparisonBlocks.map((block) => {
            const cat = SUWON_CATEGORIES[block.category];
            const accent = mode === 'dark' ? cat?.dark : cat?.light;
            const distance = suwonSectionAdapter.getDistance?.(block);
            const tags = getSuwonGuideTags(block).slice(0, 3);
            const isSelected = selectedId === block.id;

            return (
              <article
                key={block.id}
                data-testid={`suwon-compare-card-${block.id}`}
                className="rounded-xl border p-3"
                style={{
                  borderColor: isSelected && accent ? accent : borderColor,
                  background: mode === 'dark' ? '#000000' : '#f8fafc',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                        style={{ background: accent ?? '#0B57A7' }}
                      >
                        {block.block}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {block.name}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-white">
                      {cat?.label ?? block.category} · {getSuwonSideLabel(block.side)} · {getSuwonFanRoleLabel(block.fanRole)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-white">
                      {block.level}{distance ? ` · ${distance}` : ''}
                    </p>
                  </div>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          borderColor: accent ? `${accent}44` : borderColor,
                          color: accent ?? '#0B57A7',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-testid="suwon-compare-view"
                    onClick={() => onView(block)}
                    className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-[11px] font-black text-slate-600 transition-colors hover:bg-white dark:text-white dark:hover:bg-slate-800"
                    style={{ borderColor }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    보기
                  </button>
                  <button
                    type="button"
                    data-testid="suwon-compare-remove"
                    onClick={() => onRemove(block.id)}
                    className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-[11px] font-black transition-colors hover:bg-white dark:hover:bg-slate-800"
                    style={{ borderColor: accent ? `${accent}66` : borderColor, color: accent ?? '#0B57A7' }}
                  >
                    <X className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-xs font-bold leading-relaxed text-slate-500 dark:border-slate-700 dark:text-white">
          블록 상세에서 비교에 추가를 눌러 후보를 담으세요.
        </div>
      )}

      {recentBlocks.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">최근 선택</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recentBlocks.map((block) => {
              const cat = SUWON_CATEGORIES[block.category];
              const accent = mode === 'dark' ? cat?.dark : cat?.light;

              return (
                <div
                  key={block.id}
                  data-testid={`suwon-recent-card-${block.id}`}
                  className="min-w-[150px] rounded-xl border px-2.5 py-2"
                  style={{ borderColor, background: mode === 'dark' ? '#000000' : '#f8fafc' }}
                >
                  <div className="truncate text-xs font-black text-slate-900 dark:text-white">{block.block} {block.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      data-testid="suwon-recent-view"
                      onClick={() => onView(block)}
                      className="h-7 cursor-pointer rounded-lg border text-[10px] font-black text-slate-600 dark:text-white"
                      style={{ borderColor }}
                    >
                      보기
                    </button>
                    <button
                      type="button"
                      data-testid="suwon-recent-add"
                      onClick={() => onAdd(block)}
                      disabled={isFull}
                      className="h-7 cursor-pointer rounded-lg border text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: accent ? `${accent}66` : borderColor, color: accent ?? '#0B57A7' }}
                    >
                      {isFull ? '3개까지' : '담기'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function SuwonOperatorVisitMeta({
  section,
  accent,
}: {
  section: SuwonBlock;
  accent: string;
}) {
  const operatorGuidance = getSuwonOperatorVisitGuidance(section);
  const operatorTiles = [
    { label: '권장 출입구', value: operatorGuidance.recommendedEntranceLabel, testId: 'suwon-operator-entrance' },
    { label: '가까운 매점/편의시설', value: operatorGuidance.nearbyFacilitiesLabel, testId: 'suwon-operator-facilities' },
    { label: '오늘의 운영 동선 공지', value: operatorGuidance.operationNoticeLabel, testId: 'suwon-operator-notice' },
    { label: '자료 갱신일', value: operatorGuidance.lastUpdatedAtLabel, testId: 'suwon-operator-updated-at' },
  ];
  const hasManualFallback = operatorTiles.some((tile) => tile.value.includes(MANUAL_OPERATOR_GUIDANCE_STATUS))
    || operatorGuidance.operatorDataStatus === MANUAL_OPERATOR_GUIDANCE_STATUS;
  const operatorDataStatusLabel = operatorGuidance.operatorDataStatus === 'OPERATOR_PROVIDED'
    ? '운영자 자료 반영'
    : '운영자 제공 자료 필요';

  return (
    <div
      data-testid="suwon-operator-visit-check"
      data-operator-data-status={operatorGuidance.operatorDataStatus}
      className="border-t border-slate-100 px-5 py-4 dark:border-slate-800"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">직관 체크</div>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-white">
            운영자 제공 자료 기준으로만 출입구, 편의시설, 운영 동선을 표시합니다.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black"
          style={{ background: `${accent}18`, color: accent }}
        >
          현장 최종 안내 확인
        </span>
      </div>
      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
        <div className="text-[9px] font-bold tracking-widest text-slate-400">자료상태</div>
        <div className="mt-0.5 break-words text-[12px] font-black text-slate-800 dark:text-white">
          {operatorDataStatusLabel}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {operatorTiles.map((tile) => (
          <div
            key={tile.label}
            data-testid={tile.testId}
            data-operator-field-source={tile.value.includes(MANUAL_OPERATOR_GUIDANCE_STATUS) ? 'manual-required' : 'operator-provided'}
            className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="text-[10px] font-black tracking-widest text-slate-400">{tile.label}</div>
            <div className="mt-1 break-words text-[12px] font-bold leading-relaxed text-slate-700 dark:text-white">
              {formatManualBaseballDataDisplayValue(tile.value)}
            </div>
          </div>
        ))}
      </div>
      {operatorGuidance.cautionNotes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {operatorGuidance.cautionNotes.map((item) => (
            <li key={item} className="flex gap-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-white">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span>{formatManualBaseballDataDisplayValue(item)}</span>
            </li>
          ))}
        </ul>
      )}
      {hasManualFallback && (
        <p
          data-testid="suwon-operator-data-status"
          className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {formatManualBaseballDataDisplayValue(operatorGuidance.operatorDataPendingLabel)}
        </p>
      )}
    </div>
  );
}

export default function SuwonSeatMap() {
  const { resolvedTheme } = useTheme();
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<SeatMapPan>({ x: 0, y: 0 });
  const [uploadFor, setUploadFor] = useState<SuwonBlock | null>(null);
  const [guideIntent, setGuideIntent] = useState<SuwonGuideIntent>('전체');
  const [mobileToolTab, setMobileToolTab] = useState<SuwonMobileToolTab>('guide');
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [recentSelectionIds, setRecentSelectionIds] = useState<string[]>([]);
  const [isSectionFinderOpen, setIsSectionFinderOpen] = useState(true);
  const [sectionFinderAutoFocus, setSectionFinderAutoFocus] = useState(false);
  const {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection,
    filterId,
    setFilterId,
    filterCats,
    toast,
    showToast,
  } = useSeatMapSelectionState({
    sections: SUWON_BLOCKS,
    filterGroups: SUWON_CATEGORY_GROUPS,
    getId: (section) => section.id,
    getCategoryId: (section) => section.category,
  });
  const {
    isMobile,
    isFullscreenOpen,
    openFullscreen,
    closeFullscreen,
  } = useSeatMapTemplateShellState();

  useEffect(() => {
    if (!selected) {
      setIsSectionFinderOpen(true);
    }
  }, [selected]);

  const visibleCats = filterCats ? [...filterCats] : null;
  const hoveredCategory = hoveredSection ? SUWON_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#0B57A7';
  const usedCategories = useMemo(() => [...new Set(SUWON_BLOCKS.map((block) => block.category))], []);
  const visibleSuwonBlocks = useMemo(() => SUWON_BLOCKS.filter((block) => (
    filterCats === null || filterCats.includes(block.category)
  )), [filterCats]);
  const guideMatches = useMemo(() => getSuwonGuideMatches(guideIntent), [guideIntent]);
  const blockById = useMemo(() => new Map(SUWON_BLOCKS.map((block) => [block.id, block])), []);
  const comparisonBlocks = useMemo(() => (
    comparisonIds
      .map((blockId) => blockById.get(blockId))
      .filter((block): block is SuwonBlock => Boolean(block))
  ), [blockById, comparisonIds]);
  const recentSelectionBlocks = useMemo(() => (
    recentSelectionIds
      .filter((blockId) => !comparisonIds.includes(blockId))
      .map((blockId) => blockById.get(blockId))
      .filter((block): block is SuwonBlock => Boolean(block))
  ), [blockById, comparisonIds, recentSelectionIds]);

  const traceSummaryText = useMemo(() => {
    if (SUWON_TRACE_REVIEW_SUMMARY.draftApproximate === 0) return '전체 공식 이미지 트레이싱 완료';
    return `재추적 진행 중: ${SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced}/${SUWON_TRACE_REVIEW_SUMMARY.totalBlocks}`;
  }, []);

  useEffect(() => {
    if (zoom <= MIN_ZOOM && (pan.x !== 0 || pan.y !== 0)) {
      setPan({ x: 0, y: 0 });
    }
  }, [pan.x, pan.y, zoom]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    const normalizedZoom = clampZoom(nextZoom);
    setZoom(normalizedZoom);
    if (normalizedZoom === MIN_ZOOM) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const recordRecentSelection = useCallback((block: SuwonBlock) => {
    setRecentSelectionIds((currentIds) => [
      block.id,
      ...currentIds.filter((blockId) => blockId !== block.id),
    ].slice(0, RECENT_SELECTION_LIMIT));
  }, []);

  const selectSuwonBlock = useCallback((block: SuwonBlock | null) => {
    setSelected(block);
    setIsSectionFinderOpen(!block);
    setSectionFinderAutoFocus(false);
    if (block) {
      recordRecentSelection(block);
    }
  }, [recordRecentSelection, setSelected]);

  const handleSelectFromFinder = useCallback((block: SuwonBlock) => {
    selectSuwonBlock(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, FINDER_FOCUS_ZOOM));
  }, [selectSuwonBlock, setHover]);

  const handleGuideIntentChange = useCallback((nextIntent: SuwonGuideIntent) => {
    setGuideIntent(nextIntent);
    setFilterId('all');
    setHover(null);
  }, [setFilterId, setHover]);

  const handleGuideBlockSelect = useCallback((block: SuwonBlock) => {
    setFilterId('all');
    handleSelectFromFinder(block);
  }, [handleSelectFromFinder, setFilterId]);

  const handleSelectFromComparison = useCallback((block: SuwonBlock) => {
    setFilterId('all');
    selectSuwonBlock(block);
    setHover(null);
    setZoom((currentZoom) => Math.max(currentZoom, COMPARE_FOCUS_ZOOM));
  }, [selectSuwonBlock, setFilterId, setHover]);

  const handleOpenSectionFinderSearch = useCallback(() => {
    setIsSectionFinderOpen(true);
    setSectionFinderAutoFocus(true);
    setMobileToolTab('finder');
    if (isMobile) {
      setSelected(null);
      setHover(null);
    }
  }, [isMobile, setHover, setSelected]);

  const handleAddComparison = useCallback((block: SuwonBlock) => {
    setComparisonIds((currentIds) => {
      if (currentIds.includes(block.id) || currentIds.length >= COMPARISON_LIMIT) {
        return currentIds;
      }
      return [...currentIds, block.id];
    });
  }, []);

  const handleRemoveComparison = useCallback((blockId: string) => {
    setComparisonIds((currentIds) => currentIds.filter((id) => id !== blockId));
  }, []);

  const handleClearComparison = useCallback(() => {
    setComparisonIds([]);
  }, []);

  const renderOperatorVisitMeta = useCallback((section: SuwonBlock, accent: string) => (
    <>
      <SuwonCompareAction
        section={section}
        isCompared={comparisonIds.includes(section.id)}
        canAdd={comparisonIds.length < COMPARISON_LIMIT}
        accent={accent}
        onAdd={handleAddComparison}
        onRemove={handleRemoveComparison}
      />
      <SuwonOperatorVisitMeta section={section} accent={accent} />
    </>
  ), [comparisonIds, handleAddComparison, handleRemoveComparison]);

  const renderMapSvg = (enableAutoCenter = true, allowFullscreen = true) => (
    <SuwonSeatMapSvg
      selectedId={selected?.id ?? null}
      hoveredId={hover}
      comparisonIds={comparisonIds}
      filterCats={visibleCats}
      onSelect={(block) => selectSuwonBlock(selected?.id === block.id ? null : block)}
      onHover={(block) => setHover(block?.id ?? null)}
      zoom={zoom}
      pan={pan}
      onPanChange={setPan}
      onZoom={handleZoomChange}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomStep={ZOOM_STEP}
      enableAutoCenter={enableAutoCenter}
      onFullscreen={allowFullscreen ? openFullscreen : undefined}
    />
  );

  const filterBar = (
    <SeatMapFilterBar
      groups={SUWON_CATEGORY_GROUPS}
      selectedId={filterId}
      onChange={setFilterId}
      mode={mode}
      accentColor="#0B57A7"
      testIdPrefix="suwon"
    />
  );

  const mapContent = (
    <div className="relative">
      {renderMapSvg(!isFullscreenOpen)}
      <SeatMapHoverPreview
        visible={Boolean(hoveredSection && hoveredCategory)}
        title={hoveredSection?.name}
        subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
        badgeLabel={hoveredCategory?.label}
        accentColor={hoveredAccent}
        description={hoveredSection ? `${getSuwonSideLabel(hoveredSection.side)} · ${getSuwonFanRoleLabel(hoveredSection.fanRole)}` : undefined}
      />
    </div>
  );

  const detailPanel = (
    <SeatMapDetailPanel
      section={selected}
      mode={mode}
      categories={SUWON_CATEGORIES}
      adapter={suwonSectionAdapter}
      stadiumKey="SUWON"
      onClose={() => selectSuwonBlock(null)}
      onUpload={() => selected && setUploadFor(selected)}
      extraMeta={renderOperatorVisitMeta}
      searchAction={{
        label: '구역 검색',
        ariaLabel: '수원 구역 검색 열기',
        onClick: handleOpenSectionFinderSearch,
        testId: 'suwon-seatmap-search-open',
      }}
    />
  );

  const attribution = (
    <SeatMapAttribution
      source={{
        sourceLabel: SUWON_SEATMAP_IMAGE.sourceLabel,
        sourceUrl: SUWON_SEATMAP_IMAGE.sourceUrl,
        assetStatus: SUWON_SEATMAP_IMAGE.assetStatus,
      }}
    />
  );
  const legend = <SeatMapLegend categoryIds={usedCategories} categories={SUWON_CATEGORIES} mode={mode} />;
  const guidePanel = (
    <SuwonFirstVisitGuide
      intent={guideIntent}
      matches={guideMatches}
      mode={mode}
      onIntentChange={handleGuideIntentChange}
      onSelectBlock={handleGuideBlockSelect}
    />
  );
  const sectionFinder = isSectionFinderOpen ? (
    <SeatMapSectionFinder
      blocks={visibleSuwonBlocks}
      adapter={suwonSectionAdapter}
      categories={SUWON_CATEGORIES}
      filterCats={filterCats}
      selected={selected}
      onSelect={handleSelectFromFinder}
      onHoverChange={setHover}
      mode={mode}
      testIdPrefix="suwon"
      accentColor="#0B57A7"
      stadiumShortLabel="수원"
      autoFocusInput={sectionFinderAutoFocus}
    />
  ) : null;
  const compareTray = (
    <SuwonCompareTray
      comparisonBlocks={comparisonBlocks}
      recentBlocks={recentSelectionBlocks}
      selectedId={selected?.id ?? null}
      mode={mode}
      onView={handleSelectFromComparison}
      onAdd={handleAddComparison}
      onRemove={handleRemoveComparison}
      onClear={handleClearComparison}
    />
  );
  const secondaryPanel = (
    <>
      {compareTray}
      {guidePanel}
      {sectionFinder}
    </>
  );
  const mobileSecondaryPanel = isMobile ? (
    <>
      {compareTray}
      <SuwonMobileSecondaryPanel
        activeTab={mobileToolTab}
        guidePanel={guidePanel}
        finderPanel={sectionFinder}
        mode={mode}
        onTabChange={setMobileToolTab}
      />
    </>
  ) : null;

  const handleUploadSubmit = useCallback(() => {
    const block = uploadFor?.block ?? '';
    setUploadFor(null);
    showToast(`✓ 리뷰가 등록되었습니다 (블록 ${block})`);
  }, [showToast, uploadFor]);

  return (
    <>
      <SeatMapTemplateShell
        mode={mode}
        title="수원KT위즈파크"
        subtitle="수원 kt 위즈 파크 공식 좌석도"
        titleAccentColor="#0B57A7"
        isMobile={isMobile}
        isAuxiliaryGuideActive={false}
        filterBar={filterBar}
        mobileFilterBar={<div className="mb-2.5 overflow-x-auto">{filterBar}</div>}
        desktopFilterBar={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {filterBar}
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {traceSummaryText}
            </span>
          </div>
        }
        mapContent={mapContent}
        attribution={attribution}
        legend={legend}
        mobileSecondaryPanel={mobileSecondaryPanel}
        mobileBottomSheet={selected && (
          <SeatMapBottomSheet
            section={selected}
            mode={mode}
            categories={SUWON_CATEGORIES}
            adapter={suwonSectionAdapter}
            stadiumKey="SUWON"
            onClose={() => selectSuwonBlock(null)}
            onUpload={() => selected && setUploadFor(selected)}
            testId="suwon-seatmap-bottom-sheet"
            extraMeta={renderOperatorVisitMeta}
            searchAction={{
              label: '구역 검색',
              ariaLabel: '수원 구역 검색 열기',
              onClick: handleOpenSectionFinderSearch,
              testId: 'suwon-seatmap-mobile-search-open',
            }}
          />
        )}
        mobileHasSidePanel={Boolean(selected)}
        desktopSecondaryPanel={secondaryPanel}
        desktopSidePanel={detailPanel}
        toast={toast}
        isFullscreenOpen={isFullscreenOpen}
        onFullscreenClose={closeFullscreen}
        fullscreenMapContent={(
          <div className="w-full">
            <div className="mx-auto flex h-full w-full max-w-[calc((100vh-120px)*0.943)] items-center justify-center">
              <div className="w-full">
                {renderMapSvg(true, false)}
              </div>
            </div>
          </div>
        )}
        fullscreenDialogTestId="suwon-seatmap-fullscreen"
        fullscreenCloseTestId="suwon-seatmap-fullscreen-close"
        fullscreenTitle="수원KT위즈파크"
        fullscreenSubtitle="kt 공식 좌석도 전체화면"
      />
      {uploadFor && (
        <SuwonUploadFlowModal
          section={uploadFor}
          mode={mode}
          onClose={() => setUploadFor(null)}
          onSubmit={handleUploadSubmit}
        />
      )}
    </>
  );
}
