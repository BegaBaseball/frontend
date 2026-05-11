import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { BookOpen } from 'lucide-react';
import {
  DAEJEON_CATEGORIES,
  findDaejeonParentBlockGroup,
  findDaejeonSectionCoverageByBlock,
  getDaejeonCoverageStatusLabel,
  getDaejeonFanRoleLabel,
  getDaejeonSideLabel,
  getDaejeonSourceLabel,
  getDaejeonTraceStatusLabel,
  getDaejeonViewInfo,
  getDaejeonZoneGroupLabel,
  isDaejeonSelectableSeatBlock,
  type DaejeonBlock,
} from '../../data/daejeonSeatData';
import SeatViewGallery from '../SeatViewGallery';

type Snap = 'peek' | 'half' | 'full';
const OFFICIAL_BLOCK_PREVIEW_COUNT = 6;

interface BottomSheetProps {
  section: DaejeonBlock | null;
  mode: 'light' | 'dark';
  preferFull?: boolean;
  onClose: () => void;
  onUpload: () => void;
}

function OfficialBlockChips({ blocks, accent }: { blocks: string[]; accent: string }) {
  const [showAll, setShowAll] = useState(false);
  const visibleBlocks = showAll ? blocks : blocks.slice(0, OFFICIAL_BLOCK_PREVIEW_COUNT);
  const hiddenCount = Math.max(0, blocks.length - OFFICIAL_BLOCK_PREVIEW_COUNT);

  useEffect(() => {
    setShowAll(false);
  }, [blocks.join('|')]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleBlocks.map((block) => (
        <span
          key={block}
          className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
        >
          {block}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold"
          style={{ background: `${accent}0f`, borderColor: `${accent}55`, color: accent }}
        >
          {showAll ? '접기' : `더보기 +${hiddenCount}`}
        </button>
      )}
    </div>
  );
}

export default function DaejeonBottomSheet({ section, mode, preferFull = false, onClose, onUpload }: BottomSheetProps) {
  const [snap, setSnap] = useState<Snap>('peek');
  const startY = useRef(0);

  useEffect(() => {
    setSnap(section ? (preferFull ? 'full' : 'half') : 'peek');
  }, [preferFull, section?.id]);

  const heights: Record<Snap, string> = { peek: '80px', half: '58vh', full: '92vh' };

  const onTouchStart = (event: TouchEvent) => {
    startY.current = event.touches[0].clientY;
  };
  const onTouchMove = (event: TouchEvent) => {
    const dy = event.touches[0].clientY - startY.current;
    if (Math.abs(dy) < 50) return;
    if (dy > 0) setSnap((value) => value === 'full' ? 'half' : 'peek');
    else setSnap((value) => value === 'peek' ? 'half' : 'full');
    startY.current = event.touches[0].clientY;
  };

  if (!section) {
    return (
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2.5 border-t border-slate-200 bg-white px-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-900"
        style={{ height: 80 }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">구역을 탭하세요</div>
          <div className="text-[11px] text-slate-500">블록 정보와 실제 시야 사진을 확인하세요</div>
        </div>
      </div>
    );
  }

  const cat = DAEJEON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = getDaejeonViewInfo(section);
  const zoneLabel = getDaejeonZoneGroupLabel(section.zoneGroup);
  const coverage = findDaejeonSectionCoverageByBlock(section.id);
  const parentGroup = findDaejeonParentBlockGroup(section.parentId);
  const isPendingReview = !isDaejeonSelectableSeatBlock(section);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-slate-900"
      style={{
        height: heights[snap],
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
        transition: 'height 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClick={() => setSnap((value) => value === 'half' ? 'full' : value === 'full' ? 'peek' : 'half')}
        className="flex shrink-0 cursor-pointer flex-col items-center pb-1.5 pt-2.5"
      >
        <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>

      <div className="flex shrink-0 items-center gap-3 px-4 pb-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
        >
          {section.blockCode}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-800 dark:text-white">{section.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {cat.label} · {section.level} · {getDaejeonSideLabel(section.side)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-400 dark:bg-slate-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pb-24"
        style={{ opacity: snap === 'peek' ? 0 : 1, transition: 'opacity 0.2s' }}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
            {cat.label} · {section.level} · {zoneLabel}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getDaejeonSourceLabel(section.sourceConfidence)}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">정확 블록</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{section.blockCode}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">부모 구역</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{parentGroup?.block ?? section.parentBlock}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">팬 구분</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{getDaejeonFanRoleLabel(section.fanRole)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">위치</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{getDaejeonSideLabel(section.side)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">시야 거리</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">층</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{section.level}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800">
            <div className="text-[9px] font-bold tracking-widest text-slate-400">구역 그룹</div>
            <div className="mt-0.5 text-sm font-black text-slate-800 dark:text-white">{zoneLabel}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록</div>
          <OfficialBlockChips blocks={section.officialBlocks} accent={accent} />
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
            {section.sourceNote}
          </p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400 dark:text-slate-500">
            {section.officialSectionName} · {getDaejeonTraceStatusLabel(section.traceStatus)}
          </p>
          {section.reviewNote && (
            <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-orange-800 dark:bg-orange-950/35 dark:text-orange-200">
              {section.reviewNote}
            </p>
          )}
          {coverage && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-amber-900 dark:bg-amber-950/35 dark:text-amber-100">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">검수 정보</div>
              <div className="mt-1">{coverage.officialSectionName} · {getDaejeonCoverageStatusLabel(coverage.status)}</div>
              <div className="mt-0.5 text-amber-800/80 dark:text-amber-100/80">{coverage.reviewNote}</div>
            </div>
          )}
          {section.accessibilityNote && (
            <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
              {section.accessibilityNote}
            </p>
          )}
        </div>

        {(info.notes || (info.tags && info.tags.length > 0)) && (
          <div className="mb-4">
            {info.notes && (
              <p className="text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{info.notes}</p>
            )}
            {info.tags && info.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {info.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
          <SeatViewGallery
            stadium="DAEJEON"
            section={section.name}
            sectionAliases={section.seatViewSections}
            compact
          />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        style={{ opacity: snap === 'peek' ? 0 : 1, transition: 'opacity 0.2s', pointerEvents: snap === 'peek' ? 'none' : 'auto' }}
      >
        <button
          type="button"
          onClick={onUpload}
          disabled={isPendingReview}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: isPendingReview ? '#94a3b8' : accent }}
        >
          <BookOpen className="h-4 w-4" />
          {isPendingReview ? '좌표 검수 후 공유 가능' : '다이어리에서 시야 사진 공유하기'}
        </button>
      </div>
    </div>
  );
}
