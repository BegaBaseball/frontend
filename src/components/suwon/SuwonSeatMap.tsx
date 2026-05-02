import { useMemo, useState } from 'react';
import SeatViewGallery from '../SeatViewGallery';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_CATEGORY_GROUPS,
  SUWON_TRACE_REVIEW_SUMMARY,
  SuwonBlock,
} from '../../data/suwonSeatData';
import SuwonSeatMapSvg from './SuwonSeatMapSvg';

export default function SuwonSeatMap() {
  const [selected, setSelected] = useState<SuwonBlock | null>(null);
  const [hovered, setHovered] = useState<SuwonBlock | null>(null);
  const [filterId, setFilterId] = useState('all');

  const activeGroup = SUWON_CATEGORY_GROUPS.find((group) => group.id === filterId) ?? SUWON_CATEGORY_GROUPS[0];
  const visibleCats = activeGroup.cats ? [...activeGroup.cats] : null;
  const detail = selected ?? hovered;

  const traceSummaryText = useMemo(() => {
    if (SUWON_TRACE_REVIEW_SUMMARY.draftApproximate === 0) return '전체 공식 이미지 트레이싱 완료';
    return `재추적 진행 중: ${SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced}/${SUWON_TRACE_REVIEW_SUMMARY.totalBlocks}`;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {SUWON_CATEGORY_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setFilterId(group.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              filterId === group.id
                ? 'border-primary bg-primary text-white'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary/50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
            }`}
          >
            {group.label}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          {traceSummaryText}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SuwonSeatMapSvg
          selectedId={selected?.id ?? null}
          hoveredId={hovered?.id ?? null}
          filterCats={visibleCats}
          onSelect={(block) => setSelected((current) => (current?.id === block.id ? null : block))}
          onHover={setHovered}
        />

        <aside className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {detail ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {SUWON_CATEGORIES[detail.category]?.label ?? detail.category}
                </p>
                <h4 className="mt-1 text-xl font-black text-neutral-900 dark:text-white">
                  {detail.name}
                </h4>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {detail.officialBlocks.join(', ')}
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-3 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {detail.traceStatus === 'OFFICIAL_IMAGE_TRACED'
                  ? '공식 이미지 기준 polygon 재추적 완료'
                  : '공식 이미지 기준 정밀 재추적 대기'}
              </div>

              <SeatViewGallery stadium="SUWON" section={detail.seatViewSections[0] ?? detail.block} compact />
            </div>
          ) : (
            <div className="flex min-h-[220px] items-center justify-center text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              좌석도에서 구역을 선택하면 상세 정보와 시야 사진을 확인할 수 있습니다.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
