import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import SeatViewGallery from '../SeatViewGallery';
import SeatMapHoverPreview from '../SeatMapHoverPreview';
import {
  CATEGORY_COLORS,
  getSectionTheme,
  resolveStadiumLayout,
  resolveStadiumSeatMapPresetMeta,
  type SeatSection,
  type SectionType,
  type StadiumFanRole,
  type StadiumLayout,
  type StadiumSectionLabelMode,
  type StadiumSeatMapPresetId,
  type StadiumSectionCategory,
  type ThemeConfig,
} from './stadiumSeatMapModel';

export {
  resolveStadiumSeatMapPresetMeta,
  type SeatSection,
  type SectionType,
  type StadiumFanRole,
  type StadiumLayout,
  type StadiumSectionLabelMode,
  type StadiumSeatMapPresetId,
  type StadiumSectionCategory,
  type ThemeConfig,
};

export interface StadiumSeatMapProps {
  stadiumId?: string | null;
  stadiumName?: string | null;
}

const focusableDialogSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function renderBase(base: { x: number; y: number }, size: number, key: string) {
  const offset = size / 2;

  return (
    <rect
      key={key}
      x={base.x - offset}
      y={base.y - offset}
      width={size}
      height={size}
      fill="#f8fafc"
      stroke="#b7791f"
      strokeWidth="2.5"
      transform={`rotate(45 ${base.x} ${base.y})`}
      pointerEvents="none"
    />
  );
}

export default function StadiumSeatMap({ stadiumId, stadiumName }: StadiumSeatMapProps) {
  const seatMapLayout = useMemo(() => resolveStadiumLayout(stadiumId, stadiumName), [stadiumId, stadiumName]);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [viewingSectionId, setViewingSectionId] = useState<string | null>(null);
  const seatViewButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogPanelRef = useRef<HTMLElement | null>(null);
  const dialogCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const hoveredSection = seatMapLayout.sections.find((section) => section.id === hoveredSectionId) ?? null;
  const selectedSection = seatMapLayout.sections.find((section) => section.id === selectedSectionId) ?? null;
  const viewingSection = seatMapLayout.sections.find((section) => section.id === viewingSectionId) ?? null;
  const hoveredSectionTheme = hoveredSection ? getSectionTheme(hoveredSection) : null;
  const selectedSectionTheme = selectedSection ? getSectionTheme(selectedSection) : null;
  const displayStadiumName = stadiumName || seatMapLayout.name;
  const seatViewStadiumKey = seatMapLayout.id;
  const legendCategories = useMemo(() => {
    const categories = seatMapLayout.sections
      .map((section) => section.category)
      .filter((category): category is StadiumSectionCategory => Boolean(category));

    return Array.from(new Set(categories));
  }, [seatMapLayout.sections]);

  const closeSeatViewDialog = () => {
    setViewingSectionId(null);
    window.setTimeout(() => {
      seatViewButtonRef.current?.focus();
    }, 0);
  };

  useEffect(() => {
    setHoveredSectionId(null);
    setSelectedSectionId(null);
    setViewingSectionId(null);
  }, [seatMapLayout.id, seatMapLayout.presetId]);

  useEffect(() => {
    if (!viewingSection) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.setTimeout(() => {
      dialogCloseButtonRef.current?.focus();
    }, 0);

    const handleDialogKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSeatViewDialog();
        return;
      }

      if (event.key !== 'Tab' || !dialogPanelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogPanelRef.current.querySelectorAll<HTMLElement>(focusableDialogSelector),
      ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleDialogKeyDown);
    };
  }, [viewingSection]);

  const handleSectionSelect = (section: SeatSection) => {
    setSelectedSectionId((prev) => (prev === section.id ? null : section.id));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<SVGPathElement>, section: SeatSection) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSectionSelect(section);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="stadium-seat-map-panel">
      <div
        data-testid="stadium-seat-map"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-950"
      >
        <div className="relative aspect-[4/3] min-h-[320px] overflow-hidden sm:aspect-[16/10]">
          <div className="absolute left-3 top-3 z-10 max-w-[74%] rounded-md border border-white/70 bg-white/85 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/80">
            <p className="text-[11px] font-bold text-primary">좌석 안내</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
              {displayStadiumName}
            </p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {seatMapLayout.label}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {seatMapLayout.notice}
            </p>
          </div>

          <svg
            viewBox={seatMapLayout.viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full p-2 transition-all duration-500 ease-in-out sm:p-4"
            role="group"
            aria-label={`${seatMapLayout.name} 좌석 안내도`}
            onMouseLeave={() => setHoveredSectionId(null)}
          >
            <defs>
              <linearGradient id="seat-map-shell" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#eef2f6" />
                <stop offset="100%" stopColor="#dfe7ee" />
              </linearGradient>
              <linearGradient id="seat-map-field" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#9be7c4" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#35b77e" stopOpacity="0.32" />
              </linearGradient>
              <linearGradient id="seat-map-infield" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#f4cf83" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#d59630" stopOpacity="0.82" />
              </linearGradient>
              <filter id="seat-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.12" />
              </filter>
            </defs>

          {seatMapLayout.shellPaths.map((path, index) => (
            <path
              key={`shell-${index}`}
              d={path}
              fill={index === 0 ? 'url(#seat-map-shell)' : 'none'}
              stroke={index === 0 ? '#d6dee6' : '#cbd5e1'}
              strokeWidth={index === 0 ? '8' : '2'}
              opacity={index === 0 ? 0.92 : 0.84}
              pointerEvents="none"
            />
          ))}

          <path
            d={seatMapLayout.field.grassPath}
            fill="url(#seat-map-field)"
            stroke="#15976b"
            strokeWidth="2"
            strokeDasharray="6 8"
            pointerEvents="none"
          />
          {seatMapLayout.field.foulLinePaths.map((path, index) => (
            <path key={`foul-${index}`} d={path} stroke="#f8fafc" strokeWidth="5" strokeOpacity="0.9" pointerEvents="none" />
          ))}

          {seatMapLayout.sections.map((section) => {
            const isHovered = hoveredSectionId === section.id;
            const isSelected = selectedSectionId === section.id;
            const colors = getSectionTheme(section);

            return (
              <path
                key={section.id}
                d={section.d}
                fill={isSelected ? colors.bg : isHovered ? colors.hover : colors.soft}
                stroke={colors.border}
                strokeWidth={isSelected ? '3' : isHovered ? '2.25' : '1.5'}
                filter={isSelected || isHovered ? 'url(#seat-map-shadow)' : undefined}
                opacity={isHovered || isSelected ? 1 : 0.94}
                className="transition-all duration-200 ease-out"
                aria-hidden="true"
              />
            );
          })}

          <path
            d={seatMapLayout.field.infieldPath}
            fill="url(#seat-map-infield)"
            stroke="#b7791f"
            strokeWidth="2.5"
            pointerEvents="none"
          />
          <path
            d={seatMapLayout.field.infieldPath}
            fill="none"
            stroke="#fef3c7"
            strokeWidth="4"
            strokeOpacity="0.55"
            pointerEvents="none"
          />
          <ellipse
            cx={seatMapLayout.field.mound.x}
            cy={seatMapLayout.field.mound.y}
            rx="14"
            ry="11"
            fill="#d59630"
            stroke="#9a6508"
            strokeWidth="2"
            pointerEvents="none"
          />
          {renderBase(seatMapLayout.field.thirdBase, seatMapLayout.field.baseSize ?? 14, 'third-base')}
          {renderBase(seatMapLayout.field.firstBase, seatMapLayout.field.baseSize ?? 14, 'first-base')}
          {renderBase(seatMapLayout.field.secondBase, seatMapLayout.field.baseSize ?? 14, 'second-base')}
          <path d={seatMapLayout.field.homePlatePath} fill="#f8fafc" stroke="#b7791f" strokeWidth="2.5" pointerEvents="none" />

          {seatMapLayout.sections.map((section) => {
            const isInteractive = hoveredSectionId === section.id || selectedSectionId === section.id;
            const colors = getSectionTheme(section);
            const labelMode = section.labelMode ?? 'always';
            const shouldRenderLabel =
              labelMode === 'always'
              || labelMode === 'desktop'
              || (labelMode === 'activeOnly' && isInteractive);
            const labelClassName = [
              'pointer-events-none select-none font-black transition-all duration-200',
              labelMode === 'desktop' && !isInteractive ? 'hidden sm:block' : '',
            ].filter(Boolean).join(' ');
            const transformString = section.labelRotate
              ? `rotate(${section.labelRotate} ${section.labelX} ${section.labelY})`
              : undefined;

            return (
              <g key={`${section.id}-label`}>
                {shouldRenderLabel && (
                  <text
                    x={section.labelX}
                    y={section.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={transformString}
                    className={labelClassName}
                    style={{
                      fill: colors.text,
                      fontSize: section.labelFontSize ?? 15,
                      fontWeight: isInteractive ? 900 : 800,
                      paintOrder: 'stroke',
                      stroke: 'rgba(255,255,255,0.82)',
                      strokeWidth: 2.4,
                      strokeLinejoin: 'round',
                    }}
                  >
                    {section.shortLabel}
                  </text>
                )}
                <path
                  d={section.hitPath ?? section.d}
                  className="cursor-pointer outline-none transition-all duration-300 focus-visible:drop-shadow-[0_0_0.55rem_rgba(47,143,115,0.9)]"
                  fill="transparent"
                  stroke="transparent"
                  role="button"
                  tabIndex={0}
                  aria-label={`${section.name} ${colors.label}`}
                  aria-pressed={selectedSectionId === section.id}
                  onMouseEnter={() => setHoveredSectionId(section.id)}
                  onFocus={() => setHoveredSectionId(section.id)}
                  onBlur={() => setHoveredSectionId(null)}
                  onClick={() => handleSectionSelect(section)}
                  onKeyDown={(event) => handleKeyDown(event, section)}
                />
              </g>
            );
          })}

          <text
            x={seatMapLayout.field.homePlate.x}
            y={seatMapLayout.field.homePlate.y + 34}
            textAnchor="middle"
            className="pointer-events-none fill-slate-700 text-[15px] font-black dark:fill-slate-100"
          >
            HOME
          </text>
          <text
            x={seatMapLayout.field.thirdBase.x - 28}
            y={seatMapLayout.field.thirdBase.y + 18}
            textAnchor="middle"
            className="pointer-events-none fill-slate-500 text-[13px] font-bold dark:fill-slate-300"
          >
            3루
          </text>
          <text
            x={seatMapLayout.field.firstBase.x + 28}
            y={seatMapLayout.field.firstBase.y + 18}
            textAnchor="middle"
            className="pointer-events-none fill-slate-500 text-[13px] font-bold dark:fill-slate-300"
          >
            1루
          </text>
          <text
            x={seatMapLayout.field.secondBase.x}
            y={seatMapLayout.field.secondBase.y - 24}
            textAnchor="middle"
            className="pointer-events-none fill-slate-500 text-[13px] font-bold dark:fill-slate-300"
          >
            2루
          </text>
          </svg>
        </div>

        <div className="px-2 pb-2 sm:px-4 sm:pb-4">
          <SeatMapHoverPreview
            visible={Boolean(hoveredSection && hoveredSectionTheme)}
            title={hoveredSection?.name}
            badgeLabel={hoveredSectionTheme?.label}
            accentColor={hoveredSectionTheme?.hover}
            description={hoveredSection?.viewHint}
            className="mt-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {legendCategories.map((category) => {
          const config = CATEGORY_COLORS[category];

          return (
            <div
              key={category}
              className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: config.bg }} />
              <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{config.label}</span>
            </div>
          );
        })}
      </div>

      {selectedSection && selectedSectionTheme && (
        <div
          className="grid gap-3 rounded-lg border border-primary/25 bg-white p-4 shadow-sm dark:border-primary/40 dark:bg-neutral-900 sm:grid-cols-[1fr_auto] sm:items-center"
          data-testid="stadium-seat-tooltip"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-black text-primary">{selectedSection.name}</h4>
              <span
                className="rounded-md px-2 py-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: selectedSectionTheme.bg }}
              >
                {selectedSectionTheme.label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {selectedSection.description}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {selectedSection.viewHint}
            </p>
          </div>
          <button
            type="button"
            ref={seatViewButtonRef}
            disabled={!seatViewStadiumKey}
            onClick={() => setViewingSectionId(selectedSection.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-neutral-950"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-2h6l2 2h3v11H4V8Z" />
              <circle cx="12" cy="13.5" r="3.5" />
            </svg>
            이 구역 시야 보기
          </button>
        </div>
      )}

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10 sm:p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary sm:text-base">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10" aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0-3 11.2V17h6v-2.8A6 6 0 0 0 12 3Z" />
              <path d="M9.5 21h5" />
              <path d="M10 17h4" />
            </svg>
          </span>
          좌석 안내 팁
        </h4>
        <ul className="space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>{seatMapLayout.notice}.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span>좌석 선택 시 해당 구역의 시야 사진 또는 준비중 상태를 확인할 수 있습니다.</span>
          </li>
        </ul>
      </div>

      {viewingSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stadium-seat-view-title"
          data-testid="stadium-seat-view-dialog"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            onClick={closeSeatViewDialog}
            aria-label="좌석 시야 갤러리 닫기"
          />
          <section
            ref={dialogPanelRef}
            className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-5"
          >
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{displayStadiumName}</p>
                <h4 id="stadium-seat-view-title" className="truncate text-xl font-black text-primary">
                  {viewingSection.name} 시야
                </h4>
              </div>
              <button
                type="button"
                ref={dialogCloseButtonRef}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-neutral-800 dark:text-slate-300 dark:hover:bg-neutral-900 dark:hover:text-white"
                onClick={closeSeatViewDialog}
                aria-label="닫기"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <SeatViewGallery
              stadium={seatViewStadiumKey}
              section={viewingSection.viewKey ?? viewingSection.id}
              sectionAliases={viewingSection.seatViewSections}
              fallbackToStadium
            />
          </section>
        </div>
      )}
    </div>
  );
}
