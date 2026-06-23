import { type UseMutationResult } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';

import { analyzeTicket } from '../../api/ticket';
import { EMOJI_STATS, MAX_PHOTOS, WINNING_OPTIONS } from '../../constants/diary';
import {
  type DiaryEntry,
  type DiaryFormData,
  type DiaryPhotoFile,
  type Game,
  type SaveDiaryRequest,
  type SeatViewCandidate,
  type SeatViewSourceType,
} from '../../types/diary';
import { getFullImageUrl } from '../../utils/diary';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import {
  MyPageCameraIcon,
  MyPageCloseIcon,
  MyPageLoaderIcon,
  MyPageTicketIcon,
} from './MyPageIcons';

interface DiaryEditModeProps {
  diaryForm: DiaryFormData;
  updateForm: (updates: Partial<DiaryFormData>) => void;
  handlePhotoUpload: (files: FileList | null, sourceType?: SeatViewSourceType) => Promise<void> | void;
  removePhoto: (index: number) => void;
  availableGames: Game[];
  selectedDiary: DiaryEntry | undefined;
  setIsEditMode: (value: boolean) => void;
  handleDateSelect: (date: Date) => void;
  selectedDate: Date;
  handleSaveDiary: () => void;
  saveMutation: UseMutationResult<unknown, Error, SaveDiaryRequest>;
  updateMutation: UseMutationResult<unknown, Error, { id: number; data: SaveDiaryRequest }>;
  seatViewSelectionState: {
    open: boolean;
    diaryId: number | null;
    candidates: SeatViewCandidate[];
    selectedIds: number[];
    submitting: boolean;
  };
  toggleSeatViewCandidate: (candidateId: number, checked: boolean) => void;
  handleSeatViewSelectionConfirm: () => Promise<void> | void;
  handleSeatViewSelectionSkip: () => Promise<void> | void;
}

const joinClassNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function InlineBadge({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={joinClassNames(
        'inline-flex w-fit items-center justify-center rounded-md px-2 py-0.5 text-[16px] font-semibold whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  );
}

const getPhotoPreviewUrl = (photo: string | DiaryPhotoFile): string => {
  if (typeof photo !== 'string') {
    return URL.createObjectURL(photo.file);
  }
  return getFullImageUrl(photo);
};

export default function DiaryEditModeRuntime({
  diaryForm,
  updateForm,
  handlePhotoUpload,
  removePhoto,
  availableGames,
  selectedDiary,
  setIsEditMode,
  handleDateSelect,
  selectedDate,
  handleSaveDiary,
  saveMutation,
  updateMutation,
  seatViewSelectionState,
  toggleSeatViewCandidate,
  handleSeatViewSelectionConfirm,
  handleSeatViewSelectionSkip,
}: DiaryEditModeProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleTicketScan = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsScanning(true);

    try {
      const ticketInfo = await analyzeTicket(file);

      if (ticketInfo.gameId) {
        updateForm({ gameId: ticketInfo.gameId });
      } else if (ticketInfo.homeTeam && ticketInfo.awayTeam) {
        const { homeTeam, awayTeam } = ticketInfo;
        const matchingGame = availableGames.find(
          (game: Game) =>
            (game.homeTeam.includes(homeTeam) || homeTeam.includes(game.homeTeam)) &&
            (game.awayTeam.includes(awayTeam) || awayTeam.includes(game.awayTeam))
        );

        if (matchingGame) {
          updateForm({ gameId: matchingGame.id });
        }
      }

      const seatUpdates: Partial<DiaryFormData> = {};
      if (ticketInfo.section) seatUpdates.section = ticketInfo.section;
      if (ticketInfo.row) seatUpdates.seatRow = ticketInfo.row;
      if (ticketInfo.seat) seatUpdates.seatNumber = ticketInfo.seat;

      if (Object.keys(seatUpdates).length > 0) {
        updateForm(seatUpdates);
      }

      if (ticketInfo.verificationToken) {
        updateForm({ ticketVerificationToken: ticketInfo.verificationToken || undefined });
      }

      await handlePhotoUpload(files, 'TICKET_SCAN');

      toast.success('티켓 분석 완료!', {
        description: `경기장: ${ticketInfo.stadium || '미확인'} / 날짜: ${ticketInfo.date || '미확인'} / 좌석: ${ticketInfo.section || ''} ${ticketInfo.row || ''} ${ticketInfo.seat || ''}`,
      });
    } catch (error) {
      console.error('Ticket scan error:', error);
      toast.error('티켓 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSeatViewDialogClose = () => {
    if (!seatViewSelectionState.open || seatViewSelectionState.submitting) {
      return;
    }
    handleSeatViewSelectionSkip();
  };

  const allPhotos = [...diaryForm.photos, ...diaryForm.photoFiles];

  return (
    <div className="diary-edit-mode space-y-4">
      <div className="diary-field-group diary-ticket-section mb-4">
        <label
          className={`
            diary-ticket-scan
            flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2
            border-dashed border-primary bg-emerald-50 px-4 py-3 transition-colors
            hover:bg-emerald-100 dark:bg-secondary dark:hover:bg-secondary/80
            ${isScanning ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          {isScanning ? (
            <>
              <MyPageLoaderIcon className="h-5 w-5 animate-spin text-primary" />
              <span className="font-semibold text-primary">티켓 분석 중...</span>
            </>
          ) : (
            <>
              <MyPageTicketIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">티켓 사진으로 자동 입력</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleTicketScan(event.target.files)}
            data-testid="diary-ticket-scan-input"
            className="hidden"
            disabled={isScanning}
          />
        </label>
        <p className="mt-1 text-center text-[16px] text-muted-foreground">
          티켓 사진을 올리면 AI가 자동으로 정보를 채워줍니다
        </p>
        {(diaryForm.ticketVerified || diaryForm.ticketVerificationToken) && (
          <div className="mt-2 flex justify-center">
            <InlineBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {diaryForm.ticketVerified ? '티켓 인증 완료' : '티켓 인증 준비됨'}
            </InlineBadge>
          </div>
        )}
      </div>

      <div className="diary-field-group">
        <label className="diary-field-label mb-3 block text-[16px] text-muted-foreground">직관 유형</label>
        <div className="diary-choice-row flex gap-3">
          <button
            type="button"
            onClick={() => updateForm({ type: 'attended' })}
            className={`flex-1 rounded-lg transition-all ${
              diaryForm.type === 'attended'
                ? 'scale-105 bg-primary shadow-md'
                : 'bg-muted dark:bg-secondary/50'
            }`}
            style={{ padding: '10px' }}
          >
            <div
              className={`font-bold ${
                diaryForm.type === 'attended' ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              직관 완료
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ type: 'scheduled' })}
            className={`flex-1 rounded-lg transition-all ${
              diaryForm.type === 'scheduled'
                ? 'scale-105 bg-amber-400 text-white shadow-md'
                : 'bg-muted dark:bg-secondary/50'
            }`}
            style={{ padding: '10px' }}
          >
            <div
              className={`font-bold ${
                diaryForm.type === 'scheduled' ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              직관 예정
            </div>
          </button>
        </div>
      </div>

      {diaryForm.type === 'attended' && (
        <div className="diary-field-group">
          <label className="diary-field-label mb-3 block text-[16px] text-muted-foreground">오늘의 기분</label>
          <div className="diary-emoji-rail flex items-center justify-between gap-3 overflow-x-auto rounded-2xl bg-muted p-4 dark:bg-card/50">
            {EMOJI_STATS.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => updateForm({ emoji: item.emoji, emojiName: item.name })}
                className={`flex min-w-[80px] flex-col items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                  diaryForm.emojiName === item.name
                    ? 'scale-110 bg-card shadow-md'
                    : 'bg-muted hover:bg-muted/80 dark:bg-secondary/50 dark:hover:bg-secondary'
                }`}
              >
                <img
                  src={item.emoji}
                  alt={item.name}
                  className="h-12 w-12 object-contain md:h-14 md:w-14"
                />
                <span className="whitespace-nowrap text-[16px] text-muted-foreground">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {diaryForm.type === 'attended' && (
        <div className="diary-field-group">
          <label className="diary-field-label mb-3 block text-[16px] text-muted-foreground">사진 추가</label>
          <div className="diary-photo-grid grid grid-cols-3 gap-3">
            {allPhotos.map((photo: string | DiaryPhotoFile, index: number) => (
              <div key={index} className="diary-photo-tile relative aspect-square">
                <img
                  src={getPhotoPreviewUrl(photo)}
                  alt={`업로드 ${index + 1}`}
                  className="h-full w-full rounded-lg object-cover"
                />
                {typeof photo !== 'string' && (
                  <div className="absolute left-2 top-2">
                    <InlineBadge
                      className={
                        photo.sourceType === 'TICKET_SCAN'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                      }
                    >
                      {photo.sourceType === 'TICKET_SCAN' ? '티켓' : '일반'}
                    </InlineBadge>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                >
                  <MyPageCloseIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {allPhotos.length < MAX_PHOTOS && (
              <label className="diary-photo-tile flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted dark:hover:bg-secondary">
                <MyPageCameraIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                <span className="text-[16px] text-muted-foreground">사진 추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handlePhotoUpload(event.target.files, 'DIARY_UPLOAD')}
                  data-testid="diary-photo-upload-input"
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="mt-2 text-[16px] text-muted-foreground">
            최대 {MAX_PHOTOS}장까지 업로드 가능합니다
          </p>
        </div>
      )}

      <div className="diary-field-group">
        <label className="diary-field-label mb-1 block text-[16px] text-muted-foreground">경기 선택</label>
        {availableGames.length > 0 ? (
          <select
            value={diaryForm.gameId || ''}
            onChange={(event) =>
              updateForm({ gameId: event.target.value ? Number(event.target.value) : undefined })
            }
            className="w-full rounded-lg border border-border bg-card p-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">경기를 선택하세요</option>
            {availableGames.map((game: Game) => (
              <option key={game.id} value={game.id}>
                {game.homeTeam} vs {game.awayTeam} - {formatStadiumDisplayName(game.stadium)}{' '}
                {game.score ? `(${game.score})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full rounded-lg border border-border bg-muted p-2 text-center text-muted-foreground dark:bg-card/50">
            이 날짜에 예정된 경기가 없습니다
          </div>
        )}
      </div>

      {diaryForm.type === 'attended' && (
        <div
          className="diary-field-group diary-seat-panel space-y-3 rounded-xl border border-border bg-muted p-4 dark:border-border dark:bg-card/50"
          data-testid="diary-editor-seat-panel"
        >
          <div className="flex items-center justify-between">
            <label className="text-[16px] font-bold text-primary">좌석 정보</label>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[16px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              티켓 인증 + 승인 시야뷰 = 리워드 대상
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="구역 (예: 1루 레드석)"
              value={diaryForm.section || ''}
              onChange={(event) => updateForm({ section: event.target.value })}
              className="rounded-lg border border-border bg-card p-2 text-[16px] text-foreground"
            />
            <input
              type="text"
              placeholder="블록 (예: 101블록)"
              value={diaryForm.block || ''}
              onChange={(event) => updateForm({ block: event.target.value })}
              className="rounded-lg border border-border bg-card p-2 text-[16px] text-foreground"
            />
            <input
              type="text"
              placeholder="열 (예: 5열)"
              value={diaryForm.seatRow || ''}
              onChange={(event) => updateForm({ seatRow: event.target.value })}
              className="rounded-lg border border-border bg-card p-2 text-[16px] text-foreground"
            />
            <input
              type="text"
              placeholder="번 (예: 13번)"
              value={diaryForm.seatNumber || ''}
              onChange={(event) => updateForm({ seatNumber: event.target.value })}
              className="rounded-lg border border-border bg-card p-2 text-[16px] text-foreground"
            />
          </div>
        </div>
      )}

      {diaryForm.type === 'attended' && (
        <div className="diary-field-group space-y-2">
          <label className="diary-field-label mb-2 block text-[16px] text-muted-foreground">응원 팀 승패</label>
          <div className="diary-winning-row flex gap-3">
            {WINNING_OPTIONS.map(({ value, label, bg, lightBg, textColor }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateForm({ winningName: value })}
                className={`flex-1 transform rounded-xl border-2 px-4 py-4 transition-all ${
                  diaryForm.winningName === value ? 'scale-105 shadow-lg' : 'hover:scale-105'
                }`}
                style={
                  diaryForm.winningName === value
                    ? {
                        backgroundColor: bg,
                        color: 'white',
                        borderColor: bg,
                      }
                    : {
                        backgroundColor: lightBg,
                        color: textColor,
                        borderColor: lightBg,
                      }
                }
              >
                <div className="text-lg font-bold">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="diary-field-group">
        <label className="diary-field-label mb-1 block text-[16px] text-muted-foreground">메모</label>
        <textarea
          disabled={diaryForm.type === 'scheduled'}
          value={diaryForm.memo}
          onChange={(event) => updateForm({ memo: event.target.value })}
          placeholder={
            diaryForm.type === 'attended' ? '오늘의 직관 경험을 기록해보세요' : '경기 후 입력 가능'
          }
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-card p-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="diary-form-actions flex gap-3">
        {selectedDiary && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setIsEditMode(false);
              handleDateSelect(selectedDate);
            }}
            disabled={saveMutation.isPending || updateMutation.isPending}
          >
            취소
          </Button>
        )}
        <Button
          data-testid="save-diary-btn"
          className={`${selectedDiary ? 'flex-1' : 'w-full'} bg-primary text-primary-foreground`}
          onClick={handleSaveDiary}
          disabled={saveMutation.isPending || updateMutation.isPending}
        >
          {saveMutation.isPending || updateMutation.isPending
            ? '저장 중...'
            : selectedDiary
              ? '저장하기'
              : '작성하기'}
        </Button>
      </div>

      <PlainDialog
        open={seatViewSelectionState.open}
        onClose={handleSeatViewDialogClose}
        title="AI 추천 시야뷰 확인"
        description="공개할 시야뷰 사진을 선택하세요. 티켓 스캔 이미지는 개인 다이어리에는 남지만 공개 갤러리에는 자동 제외됩니다."
        contentTestId="diary-seat-view-dialog"
        className="diary-seat-view-dialog sm:max-w-2xl"
        bodyClassName="max-h-[calc(90vh-81px)] overflow-y-auto"
        hideCloseButton={seatViewSelectionState.submitting}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSeatViewSelectionSkip()}
              data-testid="diary-seat-view-skip-button"
              disabled={seatViewSelectionState.submitting}
            >
              이번엔 공유 안 함
            </Button>
            <Button
              type="button"
              onClick={() => handleSeatViewSelectionConfirm()}
              data-testid="diary-seat-view-submit-button"
              disabled={seatViewSelectionState.submitting}
            >
              {seatViewSelectionState.submitting ? '제출 중...' : '선택한 사진 제출'}
            </Button>
          </>
        }
      >
        <div className="diary-seat-view-list grid max-h-[60vh] gap-3 overflow-y-auto">
          {seatViewSelectionState.candidates.map((candidate) => {
            const checked = seatViewSelectionState.selectedIds.includes(candidate.id);
            const confidenceLabel =
              candidate.aiConfidence != null
                ? `${Math.round(candidate.aiConfidence * 100)}%`
                : '미분류';

            return (
              <label
                key={candidate.id}
                className={`diary-seat-view-candidate flex gap-3 rounded-xl border p-3 transition-colors ${
                  candidate.shareEligible
                    ? 'cursor-pointer border-border hover:border-primary'
                    : 'cursor-not-allowed border-dashed border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    toggleSeatViewCandidate(candidate.id, event.target.checked)
                  }
                  disabled={!candidate.shareEligible || seatViewSelectionState.submitting}
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border border-border accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <img
                  src={candidate.previewUrl}
                  alt="시야뷰 후보"
                  className="h-24 w-24 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <InlineBadge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white">
                      {candidate.sourceType === 'TICKET_SCAN' ? '티켓 스캔' : '일반 업로드'}
                    </InlineBadge>
                    {candidate.aiSuggestedLabel && (
                      <InlineBadge
                        className={
                          candidate.aiSuggestedLabel === 'SEAT_VIEW'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-white'
                        }
                      >
                        AI: {candidate.aiSuggestedLabel}
                      </InlineBadge>
                    )}
                    <InlineBadge className="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      신뢰도 {confidenceLabel}
                    </InlineBadge>
                  </div>
                  <p className="text-[16px] text-muted-foreground">
                    {candidate.shareEligible
                      ? '선택한 사진만 검토 대기 상태로 올라갑니다.'
                      : '이 사진은 공개 시야뷰 후보로 제출할 수 없습니다.'}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </PlainDialog>
    </div>
  );
}
