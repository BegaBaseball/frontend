import {
  JAMSIL_CATEGORIES,
  JAMSIL_VIEW_INFO,
  getJamsilSideLabel,
  getJamsilSourceLabel,
  type JamsilBlock,
} from '../../data/jamsilSeatData';
import SeatViewGallery from '../SeatViewGallery';

interface Props {
  section: JamsilBlock | null;
  mode: 'light' | 'dark';
  onClose: () => void;
  onUpload: () => void;
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 inline-flex rounded-full bg-slate-100 p-3.5 text-slate-400 dark:bg-slate-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <p className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">구역을 선택하세요</p>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        좌석 배치도에서 원하는 구역을 클릭하면<br />블록 정보와 실제 시야 사진이 표시됩니다.
      </p>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-400">{label}</div>
      <div className="text-base font-black text-slate-800 dark:text-white">{value}</div>
    </div>
  );
}

function SourceBadge({ section, accent }: { section: JamsilBlock; accent: string }) {
  const verified = section.sourceConfidence === 'OFFICIAL';
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{
        background: verified ? `${accent}22` : '#fef3c7',
        color: verified ? accent : '#92400e',
      }}
    >
      {getJamsilSourceLabel(section.sourceConfidence)}
    </span>
  );
}

function getFanRoleLabel(section: JamsilBlock) {
  if (section.fanRole === 'HOME') return '홈 응원';
  if (section.fanRole === 'AWAY') return '원정 응원';
  return '중립 표기';
}

export default function JamsilSidePanelV2({ section, mode, onClose, onUpload }: Props) {
  if (!section) {
    return (
      <div className="sticky top-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" style={{ maxHeight: 'calc(100vh - 32px)', minHeight: 220 }}>
        <EmptyState />
      </div>
    );
  }

  const cat = JAMSIL_CATEGORIES[section.category];
  const info = JAMSIL_VIEW_INFO[section.id] ?? JAMSIL_VIEW_INFO.default;
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const sideLabel = getJamsilSideLabel(section.side);

  return (
    <div
      className="sticky top-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
      style={{ maxHeight: 'calc(100vh - 32px)' }}
    >
      <div className="relative px-5 pb-4 pt-5">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-2 flex flex-wrap items-center gap-2 pr-10">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: `${accent}22`, color: accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            {cat.label} · {section.level}
          </span>
          <SourceBadge section={section} accent={accent} />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {section.name}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          블록 {section.block}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pb-4">
        <InfoTile label="위치" value={sideLabel} />
        <InfoTile label="공식 확인" value={getJamsilSourceLabel(section.sourceConfidence)} />
        <InfoTile label="시야 거리" value={info.distance ?? '-'} />
        <InfoTile label="팬 구분" value={getFanRoleLabel(section)} />
      </div>

      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">공식 블록 묶음</div>
        <div className="flex flex-wrap gap-1.5">
          {section.officialBlocks.map((block) => (
            <span
              key={block}
              className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{ background: `${accent}14`, borderColor: `${accent}44`, color: accent }}
            >
              {block}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
          {section.sourceNote}
        </p>
        {section.accessibilityNote && (
          <p className="mt-2 rounded-xl bg-cyan-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">
            {section.accessibilityNote}
          </p>
        )}
      </div>

      {(info.notes || (info.tags && info.tags.length > 0)) && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          {info.notes && <p className="text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{info.notes}</p>}
          {info.tags && info.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {info.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: `${accent}1a`, borderColor: `${accent}44`, color: accent }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">실제 시야 사진</div>
            <p className="mt-1 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
              다이어리에 공유된 사진만 표시합니다.
            </p>
          </div>
        </div>
        <SeatViewGallery
          stadium="JAMSIL"
          section={section.name}
          sectionAliases={section.seatViewSections}
          compact
        />
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onUpload}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          이 구역 시야 사진 올리기
        </button>
      </div>
    </div>
  );
}
