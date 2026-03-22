import React, { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Camera, X, Ticket, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { EMOJI_STATS, WINNING_OPTIONS, MAX_PHOTOS } from '../../constants/diary';
import { getEmojiByName, getFullImageUrl, formatDateString, getWinningLabel } from '../../utils/diary';
import { useDiaryView } from '../../hooks/useDiaryView';
import { useWeekCalendar } from '../../hooks/useWeekCalendar';
import { useMonthCalendar } from '../../hooks/useMonthCalendar';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { analyzeTicket } from '../../api/ticket';
import { DiaryFormData, DiaryEntry, DiaryPhotoFile, Game, SaveDiaryRequest, SeatViewCandidate, SeatViewSourceType } from '../../types/diary';
import { UseMutationResult } from '@tanstack/react-query';

interface DiaryReadModeProps {
  diaryForm: DiaryFormData;
  selectedDiary: DiaryEntry | undefined;
  setIsEditMode: (value: boolean) => void;
  handleDeleteDiary: () => void;
  deleteMutation: UseMutationResult<void, Error, number>;
}

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

export default function DiaryViewSection() {
  const {
    selectedDate,
    currentMonth,
    setCurrentMonth,
    isEditMode,
    setIsEditMode,
    dateStr,
    selectedDiary,
    availableGames,
    gamesLoading,
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
    entriesLoading,
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
                <ChevronLeft className="w-5 h-5" />
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
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {monthCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-2 text-sm text-muted-foreground">
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
                        <div className={`text-sm text-center w-full mb-2 ${!day.isValidDay ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                          {day.dayNumber}
                        </div>
                        {entry && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                            {entry.team && (
                              <div className="text-[10px] font-semibold text-center leading-snug px-1 line-clamp-2 text-muted-foreground">
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
                <span className="text-sm text-muted-foreground">직관 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded bg-amber-100 dark:bg-secondary border-2 border-amber-300 dark:border-amber-500"
                />
                <span className="text-sm text-muted-foreground">직관 예정</span>
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
              <DiaryEditMode
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
                <ChevronLeft className="w-5 h-5" />
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
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-1 text-xs text-muted-foreground">
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
                    <div className="text-sm text-center w-full mb-1 text-foreground">
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

            <div className="flex items-center gap-4 mt-4 justify-center text-xs">
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
              <DiaryEditMode
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
          <div className="text-sm text-muted-foreground mb-1">오늘의 기분</div>
          <div className="text-2xl text-primary" style={{ fontWeight: 900 }}>
            {diaryForm.emojiName}
          </div>
        </div>
      </div>

      {/* 사진 */}
      {diaryForm.photos && diaryForm.photos.length > 0 && (
        <div>
          <div className="text-sm mb-3 text-primary" style={{ fontWeight: 700 }}>
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
          <div className="text-sm text-muted-foreground">경기</div>
          <div className="font-bold text-primary">
            {selectedDiary?.team || '경기 정보 없음'}
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <div className="text-sm text-muted-foreground">구장</div>
          <div className="font-bold text-primary">
            {selectedDiary?.stadium || '구장 정보 없음'}
          </div>
        </div>
        {diaryForm.winningName && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-sm text-muted-foreground">승패</div>
            <div className="font-bold text-primary">
              {getWinningLabel(diaryForm.winningName)}
            </div>
          </div>
        )}
        {diaryForm.memo && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-sm text-muted-foreground">메모</div>
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

const getPhotoPreviewUrl = (photo: string | DiaryPhotoFile): string => {
  if (typeof photo !== 'string') {
    return URL.createObjectURL(photo.file);
  }
  return getFullImageUrl(photo);
};

function DiaryEditMode({
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
      // Backend API 호출 (기존 AI Service 직접 호출에서 변경)
      const ticketInfo = await analyzeTicket(file);

      // 폼 필드 자동 채우기
      // 1. gameId 매칭 (백엔드에서 이미 처리해서 내려줌)
      if (ticketInfo.gameId) {
        updateForm({ gameId: ticketInfo.gameId });
      } else if (ticketInfo.homeTeam && ticketInfo.awayTeam) {
        // 백엔드에서 매칭 실패시 기존 로직으로 재시도
        const { homeTeam, awayTeam } = ticketInfo;
        const matchingGame = availableGames.find((game: Game) =>
          (game.homeTeam.includes(homeTeam) || homeTeam.includes(game.homeTeam)) &&
          (game.awayTeam.includes(awayTeam) || awayTeam.includes(game.awayTeam))
        );

        if (matchingGame) {
          updateForm({ gameId: matchingGame.id });
        }
      }

      // 2. 좌석 정보 매칭
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

  const allPhotos = [...diaryForm.photos, ...diaryForm.photoFiles];

  return (
    <div className="space-y-4">
      {/* 티켓 스캔 버튼 */}
      <div className="mb-4">
        <label className={`
          flex items-center justify-center gap-2 w-full py-3 px-4 
          border-2 border-dashed border-primary rounded-xl cursor-pointer
          bg-emerald-50 dark:bg-secondary hover:bg-emerald-100 dark:hover:bg-secondary/80 transition-colors
          ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-primary font-semibold">티켓 분석 중...</span>
            </>
          ) : (
            <>
              <Ticket className="w-5 h-5 text-primary" />
              <span className="text-primary font-semibold">티켓 사진으로 자동 입력</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleTicketScan(e.target.files)}
            data-testid="diary-ticket-scan-input"
            className="hidden"
            disabled={isScanning}
          />
        </label>
        <p className="text-xs text-muted-foreground text-center mt-1">티켓 사진을 올리면 AI가 자동으로 정보를 채워줍니다</p>
        {(diaryForm.ticketVerified || diaryForm.ticketVerificationToken) && (
          <div className="mt-2 flex justify-center">
            <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {diaryForm.ticketVerified ? '티켓 인증 완료' : '티켓 인증 준비됨'}
            </Badge>
          </div>
        )}
      </div>

      {/* 직관 유형 선택 */}
      <div>
        <label className="text-sm text-muted-foreground mb-3 block">직관 유형</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateForm({ type: 'attended' })}
            className={`flex-1 rounded-lg transition-all ${diaryForm.type === 'attended' ? 'shadow-md scale-105 bg-primary' : 'bg-muted dark:bg-secondary/50'
              }`}
            style={{
              padding: '10px',
            }}
          >
            <div
              className={`font-bold ${diaryForm.type === 'attended' ? 'text-white' : 'text-muted-foreground'
                }`}
            >
              직관 완료
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ type: 'scheduled' })}
            className={`flex-1 rounded-lg transition-all ${diaryForm.type === 'scheduled'
              ? 'shadow-md scale-105 bg-amber-400 text-white'
              : 'bg-muted dark:bg-secondary/50'
              }`}
            style={{ padding: '10px' }}
          >
            <div
              className={`font-bold ${diaryForm.type === 'scheduled' ? 'text-white' : 'text-muted-foreground'
                }`}
            >
              직관 예정
            </div>
          </button>
        </div>
      </div>

      {/* 감정 선택 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div>
          <label className="text-sm text-muted-foreground mb-3 block">오늘의 기분</label>
          <div className="flex items-center justify-between gap-3 p-4 bg-muted dark:bg-card/50 rounded-2xl overflow-x-auto">
            {EMOJI_STATS.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => updateForm({ emoji: item.emoji, emojiName: item.name })}
                className={`flex min-w-[80px] flex-col items-center gap-2 rounded-xl px-3 py-2 transition-all ${diaryForm.emojiName === item.name
                  ? 'bg-card shadow-md scale-110'
                  : 'bg-muted dark:bg-secondary/50 hover:bg-muted/80 dark:hover:bg-secondary'
                  }`}
              >
                <img
                  src={item.emoji}
                  alt={item.name}
                  className="h-12 w-12 object-contain md:h-14 md:w-14"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 사진 업로드 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div>
          <label className="text-sm text-muted-foreground mb-3 block">사진 추가</label>
          <div className="grid grid-cols-3 gap-3">
            {allPhotos.map((photo: string | DiaryPhotoFile, index: number) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={getPhotoPreviewUrl(photo)}
                  alt={`업로드 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                {typeof photo !== 'string' && (
                  <div className="absolute left-2 top-2">
                    <Badge className={`border-0 ${photo.sourceType === 'TICKET_SCAN'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                      }`}>
                      {photo.sourceType === 'TICKET_SCAN' ? '티켓' : '일반'}
                    </Badge>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {allPhotos.length < MAX_PHOTOS && (
              <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted dark:hover:bg-secondary">
                <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">사진 추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files, 'DIARY_UPLOAD')}
                  data-testid="diary-photo-upload-input"
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">최대 {MAX_PHOTOS}장까지 업로드 가능합니다</p>
        </div>
      )}

      {/* 경기 선택 */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">경기 선택</label>
        {availableGames.length > 0 ? (
          <select
            value={diaryForm.gameId || ''}
            onChange={(e) => updateForm({ gameId: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground"
          >
            <option value="">경기를 선택하세요</option>
            {availableGames.map((game: Game) => (
              <option key={game.id} value={game.id}>
                {game.homeTeam} vs {game.awayTeam} - {game.stadium}{' '}
                {game.score ? `(${game.score})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full p-2 border border-border rounded-lg bg-muted dark:bg-card/50 text-muted-foreground text-center">
            이 날짜에 예정된 경기가 없습니다
          </div>
        )}
      </div>

      {/* 좌석 정보 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div className="space-y-3 p-4 bg-muted dark:bg-card/50 rounded-xl border border-border dark:border-border">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-primary">좌석 정보</label>
            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              티켓 인증 + 승인 시야뷰 = 리워드 대상
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="구역 (예: 1루 레드석)"
              value={diaryForm.section || ''}
              onChange={(e) => updateForm({ section: e.target.value })}
              className="p-2 border rounded-lg text-sm bg-card border-border text-foreground"
            />
            <input
              type="text"
              placeholder="블록 (예: 101블록)"
              value={diaryForm.block || ''}
              onChange={(e) => updateForm({ block: e.target.value })}
              className="p-2 border rounded-lg text-sm bg-card border-border text-foreground"
            />
            <input
              type="text"
              placeholder="열 (예: 5열)"
              value={diaryForm.seatRow || ''}
              onChange={(e) => updateForm({ seatRow: e.target.value })}
              className="p-2 border rounded-lg text-sm bg-card border-border text-foreground"
            />
            <input
              type="text"
              placeholder="번 (예: 13번)"
              value={diaryForm.seatNumber || ''}
              onChange={(e) => updateForm({ seatNumber: e.target.value })}
              className="p-2 border rounded-lg text-sm bg-card border-border text-foreground"
            />
          </div>
        </div>
      )}

      {/* 승패 선택 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div className="space-y-2">
          <label className="block text-sm text-muted-foreground mb-2">응원 팀 승패</label>
          <div className="flex gap-3">
            {WINNING_OPTIONS.map(({ value, label, bg, lightBg, textColor }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateForm({ winningName: value })}
                className={`flex-1 py-4 px-4 rounded-xl transition-all transform border-2 ${diaryForm.winningName === value ? 'shadow-lg scale-105' : 'hover:scale-105'
                  }`}
                style={
                  diaryForm.winningName === value
                    ? {
                      backgroundColor: bg,
                      color: 'white',
                      borderColor: bg,
                    }
                    : {
                      backgroundColor: lightBg, // Note: You might want to adjust these colors for dark mode too if they are fixed hex codes
                      color: textColor,
                      borderColor: lightBg,
                    }
                }
              >
                <div className="font-bold text-lg">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메모 */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">메모</label>
        <textarea
          disabled={diaryForm.type === 'scheduled'}
          value={diaryForm.memo}
          onChange={(e) => updateForm({ memo: e.target.value })}
          placeholder={
            diaryForm.type === 'attended' ? '오늘의 직관 경험을 기록해보세요' : '경기 후 입력 가능'
          }
          rows={4}
          className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-3">
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
          className={`${selectedDiary ? 'flex-1' : 'w-full'} text-primary-foreground bg-primary`}
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

      <Dialog
        open={seatViewSelectionState.open}
        onOpenChange={(open) => {
          if (!open && seatViewSelectionState.open && !seatViewSelectionState.submitting) {
            handleSeatViewSelectionSkip();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI 추천 시야뷰 확인</DialogTitle>
            <DialogDescription>
              공개할 시야뷰 사진을 선택하세요. 티켓 스캔 이미지는 개인 다이어리에는 남지만 공개 갤러리에는 자동 제외됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
            {seatViewSelectionState.candidates.map((candidate) => {
              const checked = seatViewSelectionState.selectedIds.includes(candidate.id);
              const confidenceLabel = candidate.aiConfidence != null
                ? `${Math.round(candidate.aiConfidence * 100)}%`
                : '미분류';

              return (
                <label
                  key={candidate.id}
                  className={`flex gap-3 rounded-xl border p-3 transition-colors ${candidate.shareEligible
                    ? 'cursor-pointer border-border hover:border-primary'
                    : 'cursor-not-allowed border-dashed border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/20'
                    }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleSeatViewCandidate(candidate.id, Boolean(value))}
                    disabled={!candidate.shareEligible || seatViewSelectionState.submitting}
                    className="mt-1"
                  />
                  <img
                    src={candidate.previewUrl}
                    alt="시야뷰 후보"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {candidate.sourceType === 'TICKET_SCAN' ? '티켓 스캔' : '일반 업로드'}
                      </Badge>
                      {candidate.aiSuggestedLabel && (
                        <Badge className={`border-0 ${candidate.aiSuggestedLabel === 'SEAT_VIEW'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                          }`}>
                          AI: {candidate.aiSuggestedLabel}
                        </Badge>
                      )}
                      <Badge className="border-0 bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        신뢰도 {confidenceLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {candidate.shareEligible
                        ? '선택한 사진만 검토 대기 상태로 올라갑니다.'
                        : '이 사진은 공개 시야뷰 후보로 제출할 수 없습니다.'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
