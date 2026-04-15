import { type UseMutationResult } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';

import './Diary.css';

import { useDiaryView } from '../../hooks/useDiaryView';
import { useWeekCalendar } from '../../hooks/useWeekCalendar';
import { useMonthCalendar } from '../../hooks/useMonthCalendar';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { type DiaryFormData, type DiaryEntry } from '../../types/diary';
import { getEmojiByName, getFullImageUrl, formatDateString, getWinningLabel } from '../../utils/diary';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
  MyPageChevronLeftIcon,
  MyPageChevronRightIcon,
} from './MyPageIcons';

interface DiaryReadModeProps {
  diaryForm: DiaryFormData;
  selectedDiary: DiaryEntry | undefined;
  setIsEditMode: (value: boolean) => void;
  handleDeleteDiary: () => void;
  deleteMutation: UseMutationResult<void, Error, number>;
}

const DiaryEditModeRuntime = lazy(() => import('./DiaryEditModeRuntime'));

const diaryEditModeFallback = (
  <div className="py-8 text-center text-[16px] text-muted-foreground">
    직관 기록 폼을 불러오는 중입니다.
  </div>
);

export default function DiaryViewSection() {
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
  } = useDiaryView();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const weekCalendar = useWeekCalendar(selectedDate);
  const monthCalendar = useMonthCalendar(currentMonth);

  return (
    <div className="diary-green-surface rounded-2xl md:rounded-3xl p-3 md:p-8 bg-primary dark:bg-primary-dark text-primary-foreground transition-colors duration-200">
      {isDesktop ? (
        // 데스크톱: 기존 월간 뷰
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          {/* 왼쪽: 캘린더 */}
          <Card className="p-5 md:p-8 lg:col-span-7">
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
                <div key={day} className="text-center py-2 text-[16px] text-muted-foreground">
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
                if (entry) {
                  if (entry.type === 'attended') {
                    bgClass = 'bg-emerald-50 dark:bg-secondary border-primary dark:border-primary';
                  } else {
                    bgClass = 'bg-amber-100 dark:bg-secondary border-amber-300 dark:border-amber-500';
                  }
                } else if (day.isValidDay) {
                  bgClass = 'bg-card hover:bg-muted/80 dark:hover:bg-secondary border-border dark:border-border';
                } else {
                  bgClass = 'bg-muted dark:bg-background border-border dark:border-border';
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
                    className={`border rounded-lg p-2 flex flex-col min-h-[96px] md:min-h-[110px] transition-colors ${bgClass} ${isSelected ? 'ring-2 ring-offset-1 ring-primary dark:ring-offset-gray-900' : ''
                      }`}
                    disabled={!day.isValidDay}
                  >
                    {day.isValidDay && (
                      <>
                        <div className={`text-[16px] text-center w-full mb-2 ${!day.isValidDay ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                          {day.dayNumber}
                        </div>
                        {entry && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                            {entry.team && (
                              <div className="text-[16px] font-semibold text-center leading-snug px-1 line-clamp-2 text-muted-foreground">
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
                  className="w-4 h-4 rounded bg-emerald-50 dark:bg-secondary border-2 border-primary dark:border-primary"
                />
                <span className="text-[16px] text-muted-foreground">직관 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded bg-amber-100 dark:bg-secondary border-2 border-amber-300 dark:border-amber-500"
                />
                <span className="text-[16px] text-muted-foreground">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 오른쪽: 다이어리 폼 */}
          <Card className="p-5 md:p-6 lg:col-span-3">
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
          <Card className="p-4">
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
                <div key={day} className="text-center py-1 text-[16px] text-muted-foreground">
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
                    className={`border rounded-lg p-2 flex flex-col min-h-[84px] hover:bg-muted/80 dark:hover:bg-secondary ${isSelected ? 'ring-2 ring-offset-1 ring-primary dark:ring-offset-gray-900' : ''} ${entry
                        ? entry.type === 'attended'
                          ? 'bg-emerald-50 dark:bg-secondary border-primary dark:border-primary'
                          : 'bg-amber-100 dark:bg-secondary border-amber-300 dark:border-amber-500'
                        : 'bg-card border-border dark:border-border'
                      }`}
                  >
                    <div className="text-[16px] text-center w-full mb-1 text-foreground">
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

            <div className="flex items-center gap-4 mt-4 justify-center text-[16px]">
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded bg-emerald-50 dark:bg-secondary border-2 border-primary dark:border-primary"
                />
                <span className="text-muted-foreground">직관 완료</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded bg-amber-100 dark:bg-secondary border-2 border-amber-300 dark:border-amber-500"
                />
                <span className="text-muted-foreground">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 다이어리 폼 */}
          <Card className="p-4">
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
  );
}

// ========== 읽기 모드 컴포넌트 ==========
function DiaryReadMode({ diaryForm, selectedDiary, setIsEditMode, handleDeleteDiary, deleteMutation }: DiaryReadModeProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-primary" style={{ fontWeight: 900 }}>직관 기록</h3>
      </div>

      {/* 오늘의 기분 */}
      <div
        className="flex items-center gap-6 p-6 rounded-2xl bg-emerald-50 dark:bg-secondary"
      >
        <img
          src={getEmojiByName(diaryForm.emojiName)}
          alt={diaryForm.emojiName}
          className="w-20 h-20 object-contain"
        />
        <div>
          <div className="text-[16px] text-muted-foreground mb-1">오늘의 기분</div>
          <div className="text-2xl text-primary" style={{ fontWeight: 900 }}>
            {diaryForm.emojiName}
          </div>
        </div>
      </div>

      {/* 사진 */}
      {diaryForm.photos && diaryForm.photos.length > 0 && (
        <div>
          <div className="text-[16px] mb-3 text-primary" style={{ fontWeight: 700 }}>
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
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="text-white text-2xl" style={{ fontWeight: 900 }}>
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
      <div className="space-y-4">
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <div className="text-[16px] text-muted-foreground">경기</div>
          <div className="font-bold text-primary">
            {selectedDiary?.team || '경기 정보 없음'}
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <div className="text-[16px] text-muted-foreground">구장</div>
          <div className="font-bold text-primary">
            {selectedDiary?.stadium || '구장 정보 없음'}
          </div>
        </div>
        {diaryForm.winningName && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-[16px] text-muted-foreground">승패</div>
            <div className="font-bold text-primary">
              {getWinningLabel(diaryForm.winningName)}
            </div>
          </div>
        )}
        {diaryForm.memo && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-[16px] text-muted-foreground">메모</div>
            <div
              data-testid="diary-memo"
              className="text-foreground leading-relaxed whitespace-pre-wrap"
            >
              {diaryForm.memo}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
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
          className="text-white bg-red-500 hover:bg-red-600"
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </div>
  );
}
