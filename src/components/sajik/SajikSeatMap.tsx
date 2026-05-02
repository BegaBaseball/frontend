import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_CATEGORY_GROUPS,
  SAJIK_SEATMAP_IMAGE,
  SAJIK_VIEW_INFO,
  getSajikFanRoleLabel,
  getSajikSeatViewAliases,
  getSajikSideLabel,
  getSajikSourceLabel,
  type SajikBlock,
} from '../../data/sajikSeatData';
import { useTheme } from '../../hooks/useTheme';
import { useAuthAccessActions, useAuthSession } from '../../store/authStore';
import { useDiaryStore } from '../../store/diaryStore';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import SajikBottomSheet from './SajikBottomSheet';
import SajikSeatMapSvg from './SajikSeatMapSvg';

function formatDraftDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function FilterBar({ selectedId, onChange, mode }: { selectedId: string; onChange: (value: string) => void; mode: 'light' | 'dark' }) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {SAJIK_CATEGORY_GROUPS.map((group) => {
        const active = group.id === selectedId;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? '#041E42' : 'transparent',
              borderColor: active ? '#041E42' : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : (mode === 'dark' ? '#94a3b8' : '#334155'),
            }}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

function DetailPanel({
  section,
  mode,
  onClose,
  onUpload,
}: {
  section: SajikBlock | null;
  mode: 'light' | 'dark';
  onClose: () => void;
  onUpload: () => void;
}) {
  if (!section) {
    return (
      <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">구역을 선택하세요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            공식 좌석도에서 블록을 선택하면 실제 시야 사진을 확인하고 다이어리에서 시야 사진을 공유할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const cat = SAJIK_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const info = SAJIK_VIEW_INFO[section.id] ?? SAJIK_VIEW_INFO.default;

  return (
    <div className="sticky top-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="relative px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-500 dark:bg-slate-800"
        >
          ×
        </button>
        <div className="mb-2 flex flex-wrap gap-2 pr-10">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}22`, color: accent }}>
            {cat.label} · {section.level}
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
            {getSajikSourceLabel(section.sourceConfidence)}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.name}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">블록 {section.block}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">위치</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getSajikSideLabel(section.side)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">팬 구분</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{getSajikFanRoleLabel(section.fanRole)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">시야 거리</div>
          <div className="text-base font-black text-slate-800 dark:text-white">{info.distance ?? '-'}</div>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록 묶음</div>
        <div className="flex flex-wrap gap-1.5">
          {section.officialBlocks.map((block) => (
            <span key={block} className="rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}>
              {block}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{section.sourceNote}</p>
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
        <SeatViewGallery stadium="SAJIK" section={section.name} sectionAliases={getSajikSeatViewAliases(section)} compact />
      </div>
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onUpload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          다이어리에서 시야 사진 공유하기
        </button>
      </div>
    </div>
  );
}

export default function SajikSeatMap() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const mode: 'light' | 'dark' = resolvedTheme === 'dark' ? 'dark' : 'light';
  const [selected, setSelected] = useState<SajikBlock | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [zoom] = useState(1);
  const [filterId, setFilterId] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const filterGroup = SAJIK_CATEGORY_GROUPS.find((group) => group.id === filterId);
  const filterCats = filterGroup?.cats ?? null;
  const hasOfficialBlocks = SAJIK_SEATMAP_IMAGE.assetStatus === 'OFFICIAL' && SAJIK_BLOCKS.length > 0;
  const hoveredSection = hover ? (SAJIK_BLOCKS.find((block) => block.id === hover) ?? null) : null;
  const hoveredCategory = hoveredSection ? SAJIK_CATEGORIES[hoveredSection.category] : null;
  const hoveredAccent = hoveredCategory ? (mode === 'dark' ? hoveredCategory.dark : hoveredCategory.light) : '#041E42';
  const usedCategories = useMemo(() => [...new Set(SAJIK_BLOCKS.map((block) => block.category))], []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 960);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleShareSeatView = useCallback((section: SajikBlock | null) => {
    if (!section) return;

    setPendingDraft({
      date: formatDraftDate(new Date()),
      stadium: 'SAJIK',
      team: '롯데',
      section: section.name,
      block: section.block,
      seatRow: '',
      seatNumber: '',
    });

    if (!isLoggedIn) {
      requireLogin('/mypage');
      return;
    }

    navigate('/mypage');
  }, [isLoggedIn, navigate, requireLogin, setPendingDraft]);

  const mapSvg = (
    <SajikSeatMapSvg
      mode={mode}
      selected={selected}
      setSelected={setSelected}
      hover={hover}
      setHover={setHover}
      filterCats={filterCats}
      zoom={zoom}
    />
  );

  const attribution = (
    <div className="mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      좌석 배치 기준: {SAJIK_SEATMAP_IMAGE.sourceLabel}
      {SAJIK_SEATMAP_IMAGE.sourceUrl && (
        <a
          href={SAJIK_SEATMAP_IMAGE.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
        >
          출처
        </a>
      )}
      {SAJIK_SEATMAP_IMAGE.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
    </div>
  );

  const legend = (
    <div className="mt-2.5 flex flex-wrap gap-1.5 px-1">
      {usedCategories.map((category) => {
        const cat = SAJIK_CATEGORIES[category];
        if (!cat) return null;
        const color = mode === 'dark' ? cat.dark : cat.light;
        return (
          <span key={category} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            {cat.label}
          </span>
        );
      })}
    </div>
  );

  return (
    <>
      <div className={isMobile && hasOfficialBlocks ? 'pb-80' : undefined}>
        {hasOfficialBlocks && (
          <div className="mb-2.5 overflow-x-auto">
            <FilterBar selectedId={filterId} onChange={setFilterId} mode={mode} />
          </div>
        )}
        <div
          data-testid="stadium-seat-map"
          className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-3.5"
        >
          <div className="mb-2 px-1 text-sm font-black text-slate-800 dark:text-white">
            부산 사직야구장
            <span className="ml-2 text-[11px] font-semibold" style={{ color: '#041E42' }}>
              사직 롯데 공식 좌석도
            </span>
          </div>
          <div className="relative">
            {mapSvg}
            <SeatMapHoverPreview
              visible={Boolean(hoveredSection && hoveredCategory)}
              title={hoveredSection?.name}
              subtitle={hoveredSection ? `블록 ${hoveredSection.block}` : undefined}
              badgeLabel={hoveredCategory?.label}
              accentColor={hoveredAccent}
              description={hoveredSection ? `${getSajikSideLabel(hoveredSection.side)} · ${getSajikFanRoleLabel(hoveredSection.fanRole)}` : undefined}
            />
          </div>
          {attribution}
          {hasOfficialBlocks && legend}
        </div>
        {!isMobile && hasOfficialBlocks && (
          <div className="mt-4">
            <DetailPanel
              section={selected}
              mode={mode}
              onClose={() => setSelected(null)}
              onUpload={() => handleShareSeatView(selected)}
            />
          </div>
        )}
        {isMobile && hasOfficialBlocks && (
          <SajikBottomSheet
            section={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onUpload={() => handleShareSeatView(selected)}
          />
        )}
      </div>
    </>
  );
}
