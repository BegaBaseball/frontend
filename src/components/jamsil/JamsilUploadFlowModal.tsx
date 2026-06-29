import { useState } from 'react';
import { JAMSIL_CATEGORIES, type JamsilBlock } from '../../data/jamsilSeatData';

interface UploadData {
  row: string;
  seat: string;
  rating: number;
  hoverRating: number;
  tags: string[];
  comment: string;
  hasPhoto: boolean;
}

interface Props {
  section: JamsilBlock;
  mode: 'light' | 'dark';
  onClose: () => void;
  onSubmit: (data: UploadData) => void;
}

const TAG_OPTIONS = ['시야 좋음', '편안함', '응원 뜨거움', '음식 OK', '가성비', '접근성 좋음', '도루 정면', '홈런볼'];
const ROW_OPTIONS  = ['1열', '2열', '3-5열', '6-10열', '11-15열', '16-20열', '21열+'];
const SEAT_OPTIONS = ['1-10번', '11-20번', '21-30번', '31-40번', '41번+'];

const TOTAL_STEPS = 4;

function ChipBtn({ active, accent, onClick, children }: { active: boolean; accent: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer"
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
      <div className="text-11 font-black text-slate-400 tracking-widest uppercase mb-2">{label}</div>
      {children}
    </div>
  );
}

export default function JamsilUploadFlowModal({ section, mode, onClose, onSubmit }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<UploadData>({
    row: '', seat: '', rating: 0, hoverRating: 0,
    tags: [], comment: '', hasPhoto: false,
  });

  const cat    = JAMSIL_CATEGORIES[section.category];
  const accent = mode === 'dark' ? cat.dark : cat.light;

  const toggleTag = (t: string) =>
    setData(d => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter(x => x !== t) : [...d.tags, t] }));

  const canProceed =
    step === 1 ? true :            // photo is optional demo
    step === 2 ? !!(data.row && data.seat) :
    step === 3 ? data.rating > 0 :
    true;

  const stepTitle = ['시야 사진을 추가하세요', '어느 자리였나요?', '평가해주세요', '추가 정보 (선택)'][step - 1];

  const ratingLabels = ['', '아쉬워요', '그저 그래요', '괜찮아요', '좋아요', '최고예요!'];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 480, maxHeight: '90vh' }}
      >
        {/* Header + progress */}
        <div className="px-6 pt-5 pb-0 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-11 font-black text-slate-400 tracking-widest mb-1">STEP {step}/{TOTAL_STEPS}</div>
              <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">{stepTitle}</h3>
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-bold" style={{ color: accent }}>블록 {section.block}</span> · {cat.label}
              </p>
            </div>
            <button onClick={onClose} aria-label="닫기"
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border-0 flex items-center justify-center text-slate-400 cursor-pointer shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {Array(TOTAL_STEPS).fill(0).map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full transition-all" style={{ background: i < step ? accent : '#e2e8f0' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Photo */}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <div
                className="w-full rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  aspectRatio: '4/3',
                  background: data.hasPhoto ? `linear-gradient(135deg, ${accent}66, ${accent}22, #e2e8f0)` : '#f8fafc',
                  border: `1.5px dashed ${accent}55`,
                }}
              >
                {data.hasPhoto ? (
                  <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }}>
                    <ellipse cx="100" cy="200" rx="180" ry="110" fill={accent} opacity="0.4" />
                    <rect x="0" y="100" width="200" height="50" fill="#7FC79A" opacity="0.6" />
                    <rect x="50" y="80" width="100" height="40" fill="#E8C792" opacity="0.5" />
                    <text x="100" y="60" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" opacity="0.9">미리보기</text>
                  </svg>
                ) : (
                  <div className="text-center text-slate-400">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <p className="text-xs">아래 버튼으로 사진을 선택하세요</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '카메라', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                  { label: '갤러리', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> },
                ].map(({ label, icon }) => (
                  <button key={label} onClick={() => setData(d => ({ ...d, hasPhoto: true }))}
                    className="py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer bg-slate-50 dark:bg-slate-800 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    style={{ borderColor: '#e2e8f0', color: accent }}>
                    {icon}{label}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-11 text-slate-500 leading-relaxed">
                💡 <strong className="text-slate-700 dark:text-white">좋은 시야 사진은?</strong><br/>
                · 그라운드 전체가 보이도록 가로 촬영<br/>
                · 좌석 등받이/옆자리 정도가 함께 나오면 거리감 전달
              </div>
            </div>
          )}

          {/* Step 2: Seat info */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <Field label="열">
                <div className="flex flex-wrap gap-1.5">
                  {ROW_OPTIONS.map(r => (
                    <ChipBtn key={r} active={data.row === r} accent={accent} onClick={() => setData(d => ({ ...d, row: r }))}>{r}</ChipBtn>
                  ))}
                </div>
              </Field>
              <Field label="번호 (선택 범위)">
                <div className="flex flex-wrap gap-1.5">
                  {SEAT_OPTIONS.map(s => (
                    <ChipBtn key={s} active={data.seat === s} accent={accent} onClick={() => setData(d => ({ ...d, seat: s }))}>{s}</ChipBtn>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 3: Rating + tags */}
          {step === 3 && (
            <div>
              <div className="text-center py-4">
                <div className="inline-flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(n => {
                    const filled = (data.hoverRating || data.rating) >= n;
                    return (
                      <button key={n}
                        onMouseEnter={() => setData(d => ({ ...d, hoverRating: n }))}
                        onMouseLeave={() => setData(d => ({ ...d, hoverRating: 0 }))}
                        onClick={() => setData(d => ({ ...d, rating: n }))}
                        className="text-4xl p-0 border-0 bg-transparent cursor-pointer transition-transform"
                        style={{ color: filled ? '#F59E0B' : '#e2e8f0', transform: filled ? 'scale(1.05)' : 'scale(1)' }}
                      >★</button>
                    );
                  })}
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-white">
                  {ratingLabels[data.rating] || '별점을 남겨주세요'}
                </p>
              </div>
              <Field label="이런 점이 좋았어요 (다중 선택)">
                <div className="flex flex-wrap gap-1.5">
                  {TAG_OPTIONS.map(t => (
                    <ChipBtn key={t} active={data.tags.includes(t)} accent={accent} onClick={() => toggleTag(t)}>{t}</ChipBtn>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 4: Comment + preview */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <Field label="한줄평 (선택)">
                <textarea
                  value={data.comment}
                  onChange={e => setData(d => ({ ...d, comment: e.target.value }))}
                  placeholder="이 자리의 장단점이나 팁을 공유해주세요"
                  maxLength={140}
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-white resize-none focus:outline-none focus:ring-2"
                  style={{ fontFamily: 'inherit' }}
                />
                <div className="text-right text-10 text-slate-400 mt-1">{data.comment.length}/140</div>
              </Field>
              <div className="p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: accent + '11', border: `1px solid ${accent}44` }}>
                <div className="font-bold mb-1.5" style={{ color: accent }}>제출 미리보기</div>
                <div className="text-slate-600 dark:text-white">
                  📍 블록 {section.block} · {data.row || '-'} · {data.seat || '-'}<br/>
                  ⭐ {data.rating}/5<br/>
                  🏷️ {data.tags.length > 0 ? data.tags.join(', ') : '태그 없음'}<br/>
                  📷 사진 {data.hasPhoto ? 1 : 0}장
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-sm font-bold text-slate-700 dark:text-white cursor-pointer">
              ← 이전
            </button>
          )}
          <button
            onClick={step === TOTAL_STEPS ? () => onSubmit(data) : () => setStep(s => s + 1)}
            disabled={!canProceed}
            className="flex-1 py-3 rounded-xl text-sm font-bold border-0 cursor-pointer transition-all"
            style={{
              background: canProceed ? accent : '#e2e8f0',
              color: canProceed ? '#fff' : '#94a3b8',
              cursor: canProceed ? 'pointer' : 'not-allowed',
            }}
          >
            {step === TOTAL_STEPS ? '리뷰 등록' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
