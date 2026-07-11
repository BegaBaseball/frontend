import { useEffect, useMemo, useState } from 'react';
import {
  ImageSquareIcon as ImagePlus,
  SpinnerGapIcon as Loader2,
  StarIcon as Star,
  XIcon as X,
} from '@phosphor-icons/react';

import {
  SEAT_VIEW_UPLOAD_TAGS,
  submitDirectSeatViewUpload,
  type SeatViewSubmission,
  type SeatViewUploadTag,
} from '../../api/seatViews';

interface SeatViewDirectUploadModalProps {
  stadium: string;
  section?: string | null;
  block?: string | null;
  accentColor?: string;
  onClose: () => void;
  onSubmitted?: (submission: SeatViewSubmission) => void;
}

const MAX_TAGS = 5;
const MAX_COMMENT_LENGTH = 140;

export default function SeatViewDirectUploadModal({
  stadium,
  section,
  block,
  accentColor = '#2563eb',
  onClose,
  onSubmitted,
}: SeatViewDirectUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [seatRow, setSeatRow] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<SeatViewUploadTag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const locationLabel = useMemo(() => [section, block].filter(Boolean).join(' · '), [block, section]);
  const canSubmit = !submitting;

  const handleTagToggle = (tag: SeatViewUploadTag) => {
    setErrorMessage(null);
    setTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      if (current.length >= MAX_TAGS) {
        setErrorMessage(`태그는 최대 ${MAX_TAGS}개까지 선택할 수 있습니다.`);
        return current;
      }
      return [...current, tag];
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMessage('사진 파일을 선택해주세요.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setErrorMessage('별점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const submission = await submitDirectSeatViewUpload({
        file,
        stadium,
        section,
        block,
        seatRow,
        seatNumber,
        rating,
        comment,
        tags,
      });
      onSubmitted?.(submission);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '시야뷰 업로드에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="seat-view-direct-upload-modal"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white">시야 사진 올리기</h2>
            <p className="mt-0.5 truncate text-12 font-bold text-slate-500 dark:text-slate-300">
              {[stadium, locationLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-136px)] overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-2 block text-12 font-black text-slate-700 dark:text-slate-200">사진</span>
            <input
              data-testid="seat-view-direct-upload-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={submitting}
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setErrorMessage(null);
              }}
            />
            <div className="flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {previewUrl ? (
                <img src={previewUrl} alt="선택한 시야 사진" className="h-56 w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-black">사진 선택</span>
                </div>
              )}
            </div>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-12 font-black text-slate-700 dark:text-slate-200">열</span>
              <input
                data-testid="seat-view-direct-upload-row"
                value={seatRow}
                onChange={(event) => setSeatRow(event.target.value)}
                maxLength={100}
                disabled={submitting}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="예: 10열"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-12 font-black text-slate-700 dark:text-slate-200">좌석</span>
              <input
                data-testid="seat-view-direct-upload-seat"
                value={seatNumber}
                onChange={(event) => setSeatNumber(event.target.value)}
                maxLength={100}
                disabled={submitting}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="예: 12번"
              />
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-12 font-black text-slate-700 dark:text-slate-200">별점</div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= rating;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value}점`}
                    aria-pressed={active}
                    disabled={submitting}
                    onClick={() => {
                      setRating(value);
                      setErrorMessage(null);
                    }}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-900"
                    style={{ color: active ? accentColor : '#94a3b8' }}
                  >
                    <Star className={active ? 'h-5 w-5 fill-current' : 'h-5 w-5'} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-12 font-black text-slate-700 dark:text-slate-200">태그</div>
            <div className="flex flex-wrap gap-2">
              {SEAT_VIEW_UPLOAD_TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    disabled={submitting}
                    onClick={() => handleTagToggle(tag)}
                    className="cursor-pointer rounded-full border px-3 py-1.5 text-12 font-black transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      borderColor: active ? accentColor : '#cbd5e1',
                      background: active ? `${accentColor}18` : 'transparent',
                      color: active ? accentColor : '#475569',
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 block">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-12 font-black text-slate-700 dark:text-slate-200">한줄평</span>
              <span className="text-11 font-bold text-slate-400">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <textarea
              data-testid="seat-view-direct-upload-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT_LENGTH))}
              maxLength={MAX_COMMENT_LENGTH}
              disabled={submitting}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-800 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="예: 전광판과 내야가 잘 보여요"
            />
          </label>

          {errorMessage && (
            <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-12 font-bold leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 cursor-pointer rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            data-testid="seat-view-direct-upload-submit"
            className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border-0 px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: accentColor }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            제출
          </button>
        </div>
      </div>
    </div>
  );
}
