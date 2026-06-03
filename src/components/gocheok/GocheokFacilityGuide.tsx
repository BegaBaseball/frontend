import { useCallback, useEffect, useState } from 'react';
import {
  GOCHEOK_FACILITY_GUIDE,
  GOCHEOK_FACILITY_TAB_LABELS,
  GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT,
  type GocheokFacilityTab,
  type GocheokFacilityGuideImage,
} from '../../data/gocheokSeatData';
import { getGocheokActiveOperationNotices } from '../../data/gocheokOperatorVisitGuide';

const FACILITY_IMAGE_URLS = import.meta.glob('../../assets/stadiums/kiwoom/gocheok-sisul-facility-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

interface GocheokFacilityGuideProps {
  mode: 'light' | 'dark';
  activeTab?: GocheokFacilityTab;
  defaultTab?: GocheokFacilityTab;
  onTabChange?: (tab: GocheokFacilityTab) => void;
}

interface FacilityImageWithSrc extends GocheokFacilityGuideImage {
  src: string;
}

function resolveFacilityImageUrl(image: GocheokFacilityGuideImage) {
  return FACILITY_IMAGE_URLS[`../../assets/stadiums/kiwoom/${image.requiredAssetFileName}`] ?? null;
}

function FacilityInfoList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#820024]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function OperatorDataPendingPanel() {
  return (
    <div
      data-testid="gocheok-operator-data-required"
      className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] font-bold leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div
        data-testid="gocheok-operator-data-status"
        className="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300"
      >
        {GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT.status}
      </div>
      <p>{GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT.pendingLabel}</p>
    </div>
  );
}

function OperationNoticePanel() {
  const activeNotices = getGocheokActiveOperationNotices();

  return (
    <div
      data-testid="gocheok-operation-notice-panel"
      className="mt-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">운영 안내</div>
      {activeNotices.length > 0 ? (
        <div className="mt-3 space-y-2">
          {activeNotices.map((notice) => (
            <div key={notice.id} className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {notice.validFrom} ~ {notice.validTo}
              </div>
              <div className="mt-1 text-[12px] font-bold leading-relaxed text-slate-900 dark:text-white">{notice.message}</div>
              <div className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                자료 갱신일 {notice.lastUpdatedAt}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-[12px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          오늘 유효한 운영자 제공 동선 공지가 없습니다. {GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT.status}
        </div>
      )}
    </div>
  );
}

function MissingFacilityImage({ image, mode }: { image: GocheokFacilityGuideImage; mode: 'light' | 'dark' }) {
  return (
    <div
      data-testid="gocheok-facility-asset-required"
      className="flex min-h-[180px] flex-col justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-5 text-center dark:border-amber-700 dark:bg-amber-950/25"
    >
      <div className="mx-auto mb-2 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
        MANUAL_BASEBALL_DATA_REQUIRED
      </div>
      <div className="text-sm font-black text-slate-900 dark:text-white">{image.label}</div>
      <p className="mx-auto mt-1 max-w-sm text-[12px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
        공식 시설현황 이미지를 repo asset으로 추가하면 이 위치에 표시됩니다.
      </p>
      <div className="mt-3 rounded-lg bg-white/75 px-3 py-2 text-left text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
        <div>필요 파일: {image.requiredAssetFileName}</div>
        <div>저장 위치: {image.imagePath}</div>
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
        {mode === 'dark' ? '다크 모드' : '라이트 모드'}에서도 외부 이미지는 hotlink하지 않습니다.
      </p>
    </div>
  );
}

function FacilityImageCard({
  image,
  mode,
  onExpand,
}: {
  image: GocheokFacilityGuideImage;
  mode: 'light' | 'dark';
  onExpand: (image: FacilityImageWithSrc) => void;
}) {
  const src = resolveFacilityImageUrl(image);

  if (!src) {
    return <MissingFacilityImage image={image} mode={mode} />;
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        aria-label={`${image.label} 확대 보기`}
        onClick={() => onExpand({ ...image, src })}
        className="group relative block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        <img
          src={src}
          alt={image.alt}
          className="h-auto w-full select-none object-contain"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
        <span className="absolute right-2 top-2 rounded-lg bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm transition group-hover:bg-[#820024]">
          확대 보기
        </span>
      </button>
      <figcaption className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>{image.label}</span>
        <span className="font-black text-[#820024]">클릭해서 확대</span>
      </figcaption>
    </figure>
  );
}

function FacilityImageDialog({
  image,
  zoom,
  onZoomChange,
  onClose,
}: {
  image: FacilityImageWithSrc;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const updateZoom = (nextZoom: number) => {
    onZoomChange(Math.min(3, Math.max(1, nextZoom)));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${image.label} 확대 보기`}
      data-testid="gocheok-facility-image-dialog"
      className="fixed inset-0 z-[120] bg-black/90 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 rounded-xl bg-slate-950/90 p-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 px-1">
          <div className="truncate text-sm font-black">{image.label}</div>
          <div className="text-[11px] font-semibold text-white/55">서울시설공단 공식 시설현황</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="시설현황 이미지 축소"
            onClick={() => updateZoom(zoom - 0.25)}
            disabled={zoom <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/15"
          >
            -
          </button>
          <button
            type="button"
            aria-label="시설현황 이미지 원래 크기"
            onClick={() => updateZoom(1)}
            className="h-9 min-w-14 rounded-lg border border-white/10 bg-white/10 px-2 text-[12px] font-black text-white transition hover:bg-white/15"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="시설현황 이미지 확대"
            onClick={() => updateZoom(zoom + 0.25)}
            disabled={zoom >= 3}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-lg font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35 hover:bg-white/15"
          >
            +
          </button>
          <button
            type="button"
            aria-label="확대 보기 닫기"
            onClick={onClose}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="h-full overflow-auto rounded-xl px-1 pb-4 pt-24 sm:pt-20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-full items-start justify-center">
          <img
            src={image.src}
            alt={image.alt}
            className="h-auto max-w-none select-none rounded-lg bg-white shadow-2xl"
            style={{ width: `${Math.round(100 * zoom)}%` }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

export default function GocheokFacilityGuide({
  mode,
  activeTab: controlledActiveTab,
  defaultTab = 'overview',
  onTabChange,
}: GocheokFacilityGuideProps) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<GocheokFacilityTab>(defaultTab);
  const [expandedImage, setExpandedImage] = useState<FacilityImageWithSrc | null>(null);
  const [expandedImageZoom, setExpandedImageZoom] = useState(1);
  const guide = GOCHEOK_FACILITY_GUIDE;
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;
  const handleTabChange = useCallback((tab: GocheokFacilityTab) => {
    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(tab);
    }
    onTabChange?.(tab);
  }, [controlledActiveTab, onTabChange]);
  const tabs: { id: GocheokFacilityTab; label: string }[] = [
    { id: 'overview', label: GOCHEOK_FACILITY_TAB_LABELS.overview },
    { id: 'entrances', label: GOCHEOK_FACILITY_TAB_LABELS.entrances },
    { id: 'floors', label: GOCHEOK_FACILITY_TAB_LABELS.floors },
    { id: 'operations', label: GOCHEOK_FACILITY_TAB_LABELS.operations },
  ];
  const summaryStats = [
    { label: '관람석', value: `${guide.totalSeats.toLocaleString()}석` },
    { label: '주차면수', value: `${guide.parkingSpaces.toLocaleString()}면` },
  ];

  return (
    <div className="rounded-xl bg-slate-50 px-3 pb-3 pt-3 dark:bg-slate-950">
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {guide.sourceLabel}
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {guide.title}
            </h3>
            <p className="mt-1 max-w-2xl text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
              {guide.summary}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
            {summaryStats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-rose-50 px-3 py-2.5 text-left dark:bg-rose-950/30">
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-200">
                  {stat.label}
                </div>
                <div className="mt-0.5 text-lg font-black text-rose-950 dark:text-rose-100">
                  {stat.label} {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`gocheok-facility-tab-${tab.id}`}
                aria-pressed={active}
                onClick={() => handleTabChange(tab.id)}
                className="shrink-0 rounded-lg border-0 px-3 py-2 text-[11px] font-black transition-colors"
                style={{
                  background: active ? '#820024' : 'transparent',
                  color: active ? '#ffffff' : (mode === 'dark' ? '#cbd5e1' : '#475569'),
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <OperatorDataPendingPanel />
      </div>

      {activeTab === 'overview' && (
        <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
          <div className="grid gap-2">
            {guide.overviewImages.map((image) => (
              <FacilityImageCard key={image.id} image={image} mode={mode} onExpand={(nextImage) => {
                setExpandedImage(nextImage);
                setExpandedImageZoom(1);
              }} />
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">시설 개요</div>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">용도</div>
                <div className="mt-1 text-[12px] font-bold leading-relaxed text-slate-900 dark:text-white">{guide.usage}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">규모</div>
                <div className="mt-1 text-[12px] font-bold leading-relaxed text-slate-900 dark:text-white">{guide.scale}</div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">기타부대시설</div>
                <div className="mt-2">
                  <FacilityInfoList items={guide.ancillaryFacilities} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'entrances' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {guide.entranceImages.map((image) => (
            <FacilityImageCard key={image.id} image={image} mode={mode} onExpand={(nextImage) => {
              setExpandedImage(nextImage);
              setExpandedImageZoom(1);
            }} />
          ))}
        </div>
      )}

      {activeTab === 'floors' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {guide.floorImages.map((image) => (
            <FacilityImageCard key={image.id} image={image} mode={mode} onExpand={(nextImage) => {
              setExpandedImage(nextImage);
              setExpandedImageZoom(1);
            }} />
          ))}
        </div>
      )}

      {activeTab === 'operations' && <OperationNoticePanel />}

      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        {guide.implementationNote} {guide.openLicenseLabel} 기준으로 출처를 표시합니다.
        <a
          href={guide.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-1 underline decoration-amber-300 underline-offset-2"
        >
          공식 출처
        </a>
      </div>

      {expandedImage && (
        <FacilityImageDialog
          image={expandedImage}
          zoom={expandedImageZoom}
          onZoomChange={setExpandedImageZoom}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </div>
  );
}
