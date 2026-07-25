import { type UseMutationResult } from '@tanstack/react-query';
import { type CSSProperties, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import './Diary.css';

import { useDiaryView } from '../../hooks/useDiaryView';
import AchievementCelebrationOverlay from '../AchievementCelebrationOverlay';
import { useWeekCalendar } from '../../hooks/useWeekCalendar';
import { useMonthCalendar } from '../../hooks/useMonthCalendar';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { type DiaryFormData, type DiaryEntry } from '../../types/diary';
import { getEmojiByName, getFullImageUrl, formatDateString, getWinningLabel } from '../../utils/diary';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  canShareDiaryToCheer,
  createCheerLinkedEntryAction,
} from '../cheer/CheerLinkedEntryActions';
import {
  DiaryformArrowLeftIcon as MyPageArrowLeftIcon,
  DiaryformChevronLeftIcon as MyPageChevronLeftIcon,
  DiaryformChevronRightIcon as MyPageChevronRightIcon,
} from './DiaryformIcons';

interface DiaryReadModeProps {
  diaryForm: DiaryFormData;
  selectedDiary: DiaryEntry | undefined;
  setIsEditMode: (value: boolean) => void;
  handleDeleteDiary: () => void;
  deleteMutation: UseMutationResult<void, Error, number>;
  onShareToCheer: () => void;
  isShareToCheerPending: boolean;
}

const DiaryEditModeRuntime = lazy(() => import('./DiaryEditModeRuntime'));

interface DiaryViewSectionProps {
  initialDate?: string;
  onBackToLog?: () => void;
}

const getCalendarDayStyle = (type: DiaryEntry['type'] | undefined): CSSProperties | undefined => {
  if (!type) {
    return undefined;
  }

  return type === 'attended'
    ? {
        backgroundColor: 'var(--mp-win-bg)',
        borderColor: 'var(--mp-win)',
      }
    : {
        backgroundColor: 'var(--mp-draw-bg)',
        borderColor: 'var(--mp-draw)',
      };
};

const getCalendarDayBadgeStyle = (type: DiaryEntry['type'] | undefined): CSSProperties | undefined => {
  if (!type) {
    return undefined;
  }

  return type === 'attended'
    ? {
        backgroundColor: 'var(--mp-win-bg)',
        borderColor: 'var(--mp-win)',
      }
    : {
        backgroundColor: 'var(--mp-draw-bg)',
        borderColor: 'var(--mp-draw)',
      };
};

const diaryEditModeFallback = (
  <div className="py-8 text-center text-body text-muted-foreground">
    직관 기록 폼을 불러오는 중입니다.
  </div>
);

export default function DiaryViewSection({ initialDate, onBackToLog }: DiaryViewSectionProps) {
  const navigate = useNavigate();
  const cheerEntryActionRef = useRef(createCheerLinkedEntryAction());
  const [isShareToCheerPending, setIsShareToCheerPending] = useState(false);
  const {
    selectedDate,
    currentMonth,
    setCurrentMonth,
    isEditMode,
    setIsEditMode,
    selectedDiary,
    availableGames,
    diaryForm,
    updateForm,
    handlePhotoUpload,
    removePhoto,
    handleDateSelect,
    handleSaveDiary,
    handleDeleteDiary,
    saveMutation,
    updateMutation,
    seatViewSelectionState,
    toggleSeatViewCandidate,
    handleSeatViewSelectionConfirm,
    handleSeatViewSelectionSkip,
    deleteMutation,
    diaryEntries,
    currentAchievement,
    dismissCurrentAchievement,
  } = useDiaryView(initialDate);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const weekCalendar = useWeekCalendar(selectedDate);
  const monthCalendar = useMonthCalendar(currentMonth);
  useEffect(() => {
    cheerEntryActionRef.current.invalidate();
    setIsShareToCheerPending(false);
    return () => cheerEntryActionRef.current.invalidate();
  }, [selectedDiary?.id]);

  const handleShareToCheer = () => {
    void cheerEntryActionRef.current.run({
      target: { kind: 'diary', id: selectedDiary?.id },
      lookup: async (params) => {
        const { fetchLinkedPostTarget } = await import('../../api/cheerApi');
        return fetchLinkedPostTarget(params);
      },
      navigate,
      onLoadingChange: setIsShareToCheerPending,
      onError: (error) => {
        console.error('다이어리 응원석 공유 조회 중 오류:', error);
        toast.error('응원석 공유 정보를 확인하지 못했습니다. 다시 시도해주세요.');
      },
    });
  };

  return (
    <>
      <AchievementCelebrationOverlay
        achievement={currentAchievement}
        onClose={dismissCurrentAchievement}
      />
      {onBackToLog && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="mypage-season-ghost-button"
            onClick={onBackToLog}
          >
            <MyPageArrowLeftIcon className="h-4 w-4" />
            시즌 로그
          </button>
          <span className="text-sm font-bold text-foreground">직관 기록</span>
        </div>
      )}
      <div className="diary-green-surface rounded-2xl md:rounded-3xl p-3 md:p-8 bg-card text-card-foreground transition-colors duration-200">
      {isDesktop ? (
        // 데스크톱: 기존 월간 뷰
        <div className="diary-editor-grid grid grid-cols-1 gap-6 lg:grid-cols-10">
          {/* 왼쪽: 캘린더 */}
          <Card
            className="diary-editor-calendar-card p-5 md:p-8 lg:col-span-7"
            data-testid="diary-editor-calendar-card"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-2 hover:bg-muted rounded-full"
              >
                <MyPageChevronLeftIcon className="w-5 h-5" />
              </button>
              <h3 style={{ fontWeight: 900 }}>
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </h3>
              <button
                type="button"
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-2 hover:bg-muted rounded-full"
              >
                <MyPageChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {monthCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-2 text-body text-muted-foreground">
                  {day}
                </div>
              ))}

              {monthCalendar.calendarDays.map((day, i) => {
                const selectedDateStr = formatDateString(selectedDate);
                const dayDateStr = day.dateString;
                const entry = diaryEntries.find((e) => e.date === dayDateStr);
                const isSelected = selectedDateStr === dayDateStr;

                // Determine classes based on state
                let bgClass = '';
                let style: CSSProperties | undefined;
                if (entry) {
                  if (entry.type === 'attended') {
                    bgClass = 'border';
                    style = getCalendarDayStyle(entry.type);
                  } else {
                    bgClass = 'border';
                    style = getCalendarDayStyle(entry.type);
                  }
                } else if (day.isValidDay) {
                  bgClass = 'bg-card hover:bg-muted/80 border-border';
                } else {
                  bgClass = 'bg-muted border-border';
                }

                return (
                  <button
                    type="button"
                    key={i}
                    data-testid={day.isValidDay ? `day-${day.dayNumber}` : undefined}
                    onClick={() =>
                      day.isValidDay &&
                      handleDateSelect(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day.dayNumber, 12, 0, 0)
                      )
                    }
                    className={`border rounded-lg p-2 flex flex-col min-h-[96px] md:min-h-[110px] transition-colors ${bgClass} ${isSelected ? 'ring-2 ring-offset-1 ring-primary ring-offset-background' : ''
                      }`}
                    style={style}
                    disabled={!day.isValidDay}
                  >
                    {day.isValidDay && (
                      <>
                        <div className={`text-body text-center w-full mb-2 ${!day.isValidDay ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                          {day.dayNumber}
                        </div>
                        {entry && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                            {entry.team && (
                              <div className="text-body font-semibold text-center leading-snug px-1 line-clamp-2 text-muted-foreground">
                                {entry.team}
                              </div>
                            )}
                            <img
                              src={getEmojiByName(entry.emojiName)}
                              alt={entry.emojiName}
                              className="w-9 h-9 md:w-10 md:h-10 flex-shrink-0"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-6 mt-6 justify-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border-2 border-primary"
                    style={getCalendarDayBadgeStyle('attended')}
                  />
                <span className="text-body text-muted-foreground">직관 완료</span>
              </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border-2 border-primary"
                    style={getCalendarDayBadgeStyle('scheduled')}
                  />
                <span className="text-body text-muted-foreground">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 오른쪽: 다이어리 폼 */}
          <Card
            className="diary-editor-form-card p-5 md:p-6 lg:col-span-3"
            data-testid="diary-editor-form-card"
          >
            <div className="mb-6">
              <h3 className="text-primary" style={{ fontWeight: 900 }}>
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 직관 기록
              </h3>
            </div>

            {selectedDiary && !isEditMode ? (
              <DiaryReadMode
                diaryForm={diaryForm}
                selectedDiary={selectedDiary}
                setIsEditMode={setIsEditMode}
                handleDeleteDiary={handleDeleteDiary}
                deleteMutation={deleteMutation}
                onShareToCheer={handleShareToCheer}
                isShareToCheerPending={isShareToCheerPending}
              />
            ) : (
              <Suspense fallback={diaryEditModeFallback}>
                <DiaryEditModeRuntime
                  diaryForm={diaryForm}
                  updateForm={updateForm}
                  handlePhotoUpload={handlePhotoUpload}
                  removePhoto={removePhoto}
                  availableGames={availableGames}
                  selectedDiary={selectedDiary}
                  setIsEditMode={setIsEditMode}
                  handleDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                  handleSaveDiary={handleSaveDiary}
                  saveMutation={saveMutation}
                  updateMutation={updateMutation}
                  seatViewSelectionState={seatViewSelectionState}
                  toggleSeatViewCandidate={toggleSeatViewCandidate}
                  handleSeatViewSelectionConfirm={handleSeatViewSelectionConfirm}
                  handleSeatViewSelectionSkip={handleSeatViewSelectionSkip}
                />
              </Suspense>
            )}
          </Card>
        </div>
      ) : (
        // 모바일: 주간 뷰
        <div className="space-y-4">
          {/* 주간 캘린더 */}
          <Card
            className="diary-editor-calendar-card p-4"
            data-testid="diary-editor-calendar-card"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={weekCalendar.goToPrevWeek}
                className="p-2 hover:bg-muted rounded-full"
              >
                <MyPageChevronLeftIcon className="w-5 h-5" />
              </button>
              <h3 style={{ fontWeight: 900, fontSize: '16px' }}>
                {weekCalendar.getWeekDays()[0].getMonth() + 1}월{' '}
                {weekCalendar.getWeekDays()[0].getDate()}일 -{' '}
                {weekCalendar.getWeekDays()[6].getMonth() + 1}월{' '}
                {weekCalendar.getWeekDays()[6].getDate()}일
              </h3>
              <button
                type="button"
                onClick={weekCalendar.goToNextWeek}
                className="p-2 hover:bg-muted rounded-full"
              >
                <MyPageChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-1 text-body text-muted-foreground">
                  {day}
                </div>
              ))}

              {weekCalendar.getWeekDays().map((date: Date, index: number) => {
                const dayDateStr = formatDateString(date);
                const selectedDateStr = formatDateString(selectedDate);
                const entry = diaryEntries.find((e: DiaryEntry) => e.date === dayDateStr);
                const isSelected = selectedDateStr === dayDateStr;

                return (
                  <button
                    type="button"
                    key={index}
                    data-testid={`day-${date.getDate()}`}
                    onClick={() => handleDateSelect(date)}
                    className={`border rounded-lg p-2 flex flex-col min-h-[84px] hover:bg-muted/80 ${isSelected ? 'ring-2 ring-offset-1 ring-primary ring-offset-background' : ''} ${entry
                        ? entry.type === 'attended'
                          ? 'border'
                          : 'border'
                        : 'bg-card border-border'
                      }`}
                    style={entry ? getCalendarDayStyle(entry.type) : undefined}
                  >
                    <div className="text-body text-center w-full mb-1 text-foreground">
                      {date.getDate()}
                    </div>
                    {entry && (
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <img
                          src={entry.emoji}
                          alt={entry.emojiName}
                          className="w-8 h-8 flex-shrink-0"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 justify-center text-body">
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded border-2 border-primary"
                    style={getCalendarDayBadgeStyle('attended')}
                  />
                <span className="text-muted-foreground">직관 완료</span>
              </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded border-2 border-primary"
                    style={getCalendarDayBadgeStyle('scheduled')}
                  />
                <span className="text-muted-foreground">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 다이어리 폼 */}
          <Card
            className="diary-editor-form-card p-4"
            data-testid="diary-editor-form-card"
          >
            <div className="mb-6">
              <h3 className="text-primary" style={{ fontWeight: 900 }}>
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 직관 기록
              </h3>
            </div>

            {selectedDiary && !isEditMode ? (
              <DiaryReadMode
                diaryForm={diaryForm}
                selectedDiary={selectedDiary}
                setIsEditMode={setIsEditMode}
                handleDeleteDiary={handleDeleteDiary}
                deleteMutation={deleteMutation}
                onShareToCheer={handleShareToCheer}
                isShareToCheerPending={isShareToCheerPending}
              />
            ) : (
              <Suspense fallback={diaryEditModeFallback}>
                <DiaryEditModeRuntime
                  diaryForm={diaryForm}
                  updateForm={updateForm}
                  handlePhotoUpload={handlePhotoUpload}
                  removePhoto={removePhoto}
                  availableGames={availableGames}
                  selectedDiary={selectedDiary}
                  setIsEditMode={setIsEditMode}
                  handleDateSelect={handleDateSelect}
                  selectedDate={selectedDate}
                  handleSaveDiary={handleSaveDiary}
                  saveMutation={saveMutation}
                  updateMutation={updateMutation}
                  seatViewSelectionState={seatViewSelectionState}
                  toggleSeatViewCandidate={toggleSeatViewCandidate}
                  handleSeatViewSelectionConfirm={handleSeatViewSelectionConfirm}
                  handleSeatViewSelectionSkip={handleSeatViewSelectionSkip}
                />
              </Suspense>
            )}
          </Card>
        </div>
      )}
      </div>
    </>
  );
}

// ========== 읽기 모드 컴포넌트 ==========
export function DiaryReadMode({
  diaryForm,
  selectedDiary,
  setIsEditMode,
  handleDeleteDiary,
  deleteMutation,
  onShareToCheer,
  isShareToCheerPending,
}: DiaryReadModeProps) {
  const canShareToCheer = Boolean(selectedDiary && canShareDiaryToCheer(selectedDiary));
  const shareDisabled = !canShareToCheer || isShareToCheerPending || deleteMutation.isPending;
  const shareDisabledReason = !canShareToCheer
    ? '직관 완료와 티켓 인증 후 응원석에 공유할 수 있습니다.'
    : isShareToCheerPending
      ? '응원석 공유 대상을 확인하고 있습니다.'
      : deleteMutation.isPending
        ? '삭제 처리가 끝난 후 다시 시도해주세요.'
        : undefined;

  return (
    <div className="diary-read-mode p-6 space-y-6" data-testid="diary-read-mode">
      <div className="flex items-center justify-between">
        <h3 className="text-primary" style={{ fontWeight: 900 }}>직관 기록</h3>
      </div>

      {/* 오늘의 기분 */}
      <div
        className="diary-read-summary flex items-center gap-6 p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--mp-win-bg)' }}
      >
        <img
          src={getEmojiByName(diaryForm.emojiName)}
          alt={diaryForm.emojiName}
          className="w-20 h-20 object-contain"
        />
        <div>
          <div className="text-body text-muted-foreground mb-1">오늘의 기분</div>
          <div className="text-2xl text-primary" style={{ fontWeight: 900 }}>
            {diaryForm.emojiName}
          </div>
        </div>
      </div>

      {/* 사진 */}
      {diaryForm.photos && diaryForm.photos.length > 0 && (
        <div className="diary-read-photo-section">
          <div className="text-body mb-3 text-primary" style={{ fontWeight: 700 }}>
            사진
          </div>
          {diaryForm.photos.length === 1 ? (
            <img
              src={getFullImageUrl(diaryForm.photos[0])}
              alt="직관 사진"
              className="w-full rounded-xl object-cover max-h-64"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {diaryForm.photos.slice(0, 4).map((photo: string, index: number) => (
                <div key={index} className="aspect-square relative rounded-xl overflow-hidden">
                  <img
                    src={getFullImageUrl(photo)}
                    alt={`사진 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && diaryForm.photos.length > 4 && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <span className="text-foreground text-2xl" style={{ fontWeight: 900 }}>
                        +{diaryForm.photos.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 경기 정보 */}
      <div className="diary-read-details space-y-4">
        <div className="diary-read-row grid grid-cols-[80px_1fr] gap-2">
          <div className="text-body text-muted-foreground">경기</div>
          <div className="font-bold text-primary">
            {selectedDiary?.team || '경기 정보 없음'}
          </div>
        </div>
        <div className="diary-read-row grid grid-cols-[80px_1fr] gap-2">
          <div className="text-body text-muted-foreground">구장</div>
          <div className="font-bold text-primary">
            {selectedDiary?.stadium ? formatStadiumDisplayName(selectedDiary.stadium) : '구장 정보 없음'}
          </div>
        </div>
        {diaryForm.winningName && (
          <div className="diary-read-row grid grid-cols-[80px_1fr] gap-2">
            <div className="text-body text-muted-foreground">승패</div>
            <div className="font-bold text-primary">
              {getWinningLabel(diaryForm.winningName)}
            </div>
          </div>
        )}
        {diaryForm.memo && (
          <div className="diary-read-row grid grid-cols-[80px_1fr] gap-2">
            <div className="text-body text-muted-foreground">메모</div>
            <div
              data-testid="diary-memo"
              className="text-foreground leading-relaxed whitespace-pre-wrap"
            >
              {diaryForm.memo}
            </div>
          </div>
        )}
      </div>

      <div className="diary-read-actions flex flex-wrap gap-3 justify-center">
        <Button
          data-testid="diary-share-to-cheer"
          onClick={onShareToCheer}
          className="border-primary text-primary"
          variant="outline"
          disabled={shareDisabled}
          title={shareDisabledReason}
          aria-label={shareDisabledReason ?? '응원석에 공유'}
          aria-busy={isShareToCheerPending}
        >
          {isShareToCheerPending ? '공유 확인 중...' : '응원석에 공유'}
        </Button>
        <Button
          data-testid="edit-diary-btn"
          onClick={() => setIsEditMode(true)}
          className="text-primary-foreground bg-primary"
          disabled={deleteMutation.isPending}
        >
          수정하기
        </Button>
        <Button
          data-testid="delete-diary-btn"
          onClick={handleDeleteDiary}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </div>
  );
}
