import { useMemo, useRef, useState } from 'react';
import seatMapImageUrl from '../../assets/stadiums/kt/suwon-kt-seatmap-official-2026.jpg';
import {
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_SEATMAP_IMAGE,
  SUWON_SEATMAP_VIEWPORT,
  SuwonBlock,
} from '../../data/suwonSeatData';

interface SuwonSeatMapSvgProps {
  selectedId: string | null;
  hoveredId: string | null;
  filterCats: string[] | null;
  onSelect: (block: SuwonBlock) => void;
  onHover: (block: SuwonBlock | null) => void;
}

function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('suwonDebug') === '1';
}

export default function SuwonSeatMapSvg({
  selectedId,
  hoveredId,
  filterCats,
  onSelect,
  onHover,
}: SuwonSeatMapSvgProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; blockId: string | null } | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const showDebug = isDebugEnabled();
  const { imageWidth, imageHeight } = SUWON_SEATMAP_IMAGE;
  const { cropY, cropHeight } = SUWON_SEATMAP_VIEWPORT;

  const hitBlocks = useMemo(
    () => [...SUWON_BLOCKS].sort((a, b) => a.hitPriority - b.hitPriority),
    [],
  );

  if (imageFailed) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
        MANUAL_BASEBALL_DATA_REQUIRED: 수원 kt 위즈 파크 공식 좌석도 asset을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-inner dark:border-neutral-800"
      style={{ aspectRatio: `${imageWidth} / ${cropHeight}` }}
    >
      <svg
        ref={svgRef}
        data-testid="suwon-seatmap-svg"
        viewBox={`0 ${cropY} ${imageWidth} ${cropHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="수원 kt 위즈 파크 공식 좌석도"
        onMouseMove={(event) => {
          if (!showDebug || !svgRef.current) return;
          const ctm = svgRef.current.getScreenCTM();
          if (!ctm) return;
          const point = svgRef.current.createSVGPoint();
          point.x = event.clientX;
          point.y = event.clientY;
          const mapped = point.matrixTransform(ctm.inverse());
          const element = document.elementFromPoint(event.clientX, event.clientY);
          setCursor({
            x: Math.round(mapped.x),
            y: Math.round(mapped.y),
            blockId: element?.closest('[data-block-id]')?.getAttribute('data-block-id') ?? null,
          });
        }}
        onMouseLeave={() => {
          onHover(null);
          setCursor(null);
        }}
      >
        <image
          href={seatMapImageUrl}
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          preserveAspectRatio="none"
          onError={() => setImageFailed(true)}
        />

        <g data-layer="visual" pointerEvents="none">
          {SUWON_BLOCKS.map((block) => {
            const category = SUWON_CATEGORIES[block.category];
            const active = block.id === selectedId || block.id === hoveredId;
            const filtered = Boolean(filterCats && !filterCats.includes(block.category));
            return (
              <path
                key={block.id}
                data-testid={`suwon-seat-visual-${block.id}`}
                data-block-id={block.id}
                data-layer="visual"
                d={block.imageGeometry.d}
                fill={category?.light ?? '#38bdf8'}
                fillOpacity={filtered ? 0.04 : active ? 0.38 : showDebug ? 0.18 : 0.08}
                stroke={active ? '#facc15' : category?.dark ?? '#0284c7'}
                strokeWidth={active ? 8 : showDebug ? 4 : 2}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>

        <g data-layer="hit">
          {hitBlocks.map((block) => {
            const filtered = Boolean(filterCats && !filterCats.includes(block.category));
            return (
              <path
                key={block.id}
                data-testid={`suwon-seat-hit-${block.id}`}
                data-block-id={block.id}
                data-layer="hit"
                d={block.hitGeometry.d}
                fill="transparent"
                stroke={showDebug ? '#22d3ee' : 'transparent'}
                strokeDasharray={showDebug ? '18 14' : undefined}
                strokeWidth={showDebug ? 5 : 0}
                vectorEffect="non-scaling-stroke"
                pointerEvents={filtered ? 'none' : 'fill'}
                aria-pressed={selectedId === block.id}
                role="button"
                tabIndex={filtered ? -1 : 0}
                onMouseEnter={() => onHover(block)}
                onFocus={() => onHover(block)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(block)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(block);
                  }
                }}
              />
            );
          })}
        </g>

        {showDebug && (
          <g data-layer="debug" pointerEvents="none">
            {SUWON_BLOCKS.map((block) => (
              <text
                key={block.id}
                x={block.imageGeometry.labelX}
                y={block.imageGeometry.labelY}
                transform={`rotate(${block.imageGeometry.labelRotate ?? 0} ${block.imageGeometry.labelX} ${block.imageGeometry.labelY})`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? '#facc15' : '#fb923c'}
                fontSize={block.imageGeometry.labelFontSize ?? 54}
                fontWeight={800}
                paintOrder="stroke"
                stroke="#111827"
                strokeWidth={5}
              >
                {block.imageGeometry.shortLabel}
              </text>
            ))}
            {cursor && (
              <text
                x={cursor.x + 18}
                y={cursor.y - 18}
                fill="#22d3ee"
                fontSize={64}
                fontWeight={800}
                paintOrder="stroke"
                stroke="#020617"
                strokeWidth={8}
              >
                {cursor.x},{cursor.y} {cursor.blockId ?? 'none'}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
