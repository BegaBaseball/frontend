import { useState } from 'react';
import { SUWON_CATEGORIES, type SuwonBlock } from '../../data/suwonSeatData';

interface UploadData {
  row: string;
  seat: string;
  rating: number;
  comment: string;
  hasPhoto: boolean;
}

interface Props {
  section: SuwonBlock;
  mode: 'light' | 'dark';
  onClose: () => void;
  onSubmit: (data: UploadData) => void;
}

const ROW_OPTIONS = ['1열', '2열', '3-5열', '6-10열', '11-15열', '16-20열', '21열+'];
const SEAT_OPTIONS = ['1-10번', '11-20번', '21-30번', '31-40번', '41번+'];

function ChipButton({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
      style={{
        background: active ? accent : 'transparent',
        borderColor: active ? accent : '#e2e8f0',
        color: active ? '#fff' : undefined,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-11 font-black uppercase tracking-widest text-slate-400">{label}</div>
      {children}
    </div>
  );
}

export default function SuwonUploadFlowModal({ section, mode, onClose, onSubmit }: Props) {
  const [data, setData] = useState<UploadData>({
    row: '',
    seat: '',
    rating: 0,
    comment: '',
    hasPhoto: false,
  });

  const cat = SUWON_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;
  const canSubmit = data.rating > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        style={{ maxHeight: '90vh' }}
      >
        <div className="border-b border-slate-100 px-6 pb-4 pt-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-11 font-black uppercase tracking-widest text-slate-400">SUWON SEAT VIEW</div>
              <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">시야 사진을 추가하세요</h3>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-bold" style={{ color: accent }}>블록 {section.block}</span> · {cat.label}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-slate-100 text-slate-400 dark:bg-slate-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div
            className="flex w-full items-center justify-center overflow-hidden rounded-xl"
            style={{
              aspectRatio: '4/3',
              background: data.hasPhoto ? `linear-gradient(135deg, ${accent}66, ${accent}22, #e2e8f0)` : '#f8fafc',
              border: `1.5px dashed ${accent}55`,
            }}
          >
            {data.hasPhoto ? (
              <div className="text-center text-sm font-black text-white">미리보기</div>
            ) : (
              <div className="text-center text-slate-400">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-xs">사진은 데모 상태로 선택 처리됩니다</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setData((value) => ({ ...value, hasPhoto: true }))}
            className="w-full cursor-pointer rounded-xl border py-3 text-sm font-bold transition-colors"
            style={{ borderColor: `${accent}55`, color: accent }}
          >
            사진 선택
          </button>

          <Field label="열">
            <div className="flex flex-wrap gap-1.5">
              {ROW_OPTIONS.map((row) => (
                <ChipButton key={row} active={data.row === row} accent={accent} onClick={() => setData((value) => ({ ...value, row }))}>
                  {row}
                </ChipButton>
              ))}
            </div>
          </Field>

          <Field label="번호">
            <div className="flex flex-wrap gap-1.5">
              {SEAT_OPTIONS.map((seat) => (
                <ChipButton key={seat} active={data.seat === seat} accent={accent} onClick={() => setData((value) => ({ ...value, seat }))}>
                  {seat}
                </ChipButton>
              ))}
            </div>
          </Field>

          <Field label="평점">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  onClick={() => setData((value) => ({ ...value, rating }))}
                  className="cursor-pointer border-0 bg-transparent p-0 text-4xl"
                  style={{ color: data.rating >= rating ? '#F59E0B' : '#e2e8f0' }}
                >
                  ★
                </button>
              ))}
            </div>
          </Field>

          <Field label="한줄평">
            <textarea
              value={data.comment}
              onChange={(event) => setData((value) => ({ ...value, comment: event.target.value }))}
              placeholder="이 자리의 장단점이나 팁을 공유해주세요"
              maxLength={140}
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="mt-1 text-right text-10 text-slate-400">{data.comment.length}/140</div>
          </Field>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-white"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onSubmit(data)}
            disabled={!canSubmit}
            className="flex-1 cursor-pointer rounded-xl border-0 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed"
            style={{ background: canSubmit ? accent : '#e2e8f0', color: canSubmit ? '#fff' : '#94a3b8' }}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}
