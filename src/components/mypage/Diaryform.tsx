import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Camera, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { EMOJI_STATS, WINNING_OPTIONS, MAX_PHOTOS } from '../../constants/diary';
import { getFullImageUrl, formatDateString, getWinningLabel } from '../../utils/diary';
import { useDiaryView } from '../../hooks/useDiaryView';
import { useWeekCalendar } from '../../hooks/useWeekCalendar';
import { useMonthCalendar } from '../../hooks/useMonthCalendar';
import { useMediaQuery } from '../../hooks/useMediaQuery';

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
    deleteMutation,
    diaryEntries,
    entriesLoading,
  } = useDiaryView();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const weekCalendar = useWeekCalendar(selectedDate);
  const monthCalendar = useMonthCalendar(currentMonth);

  return (
    <div className="rounded-3xl p-4 md:p-8" style={{ backgroundColor: '#2d5f4f' }}>
      {isDesktop ? (
        // 데스크톱: 기존 월간 뷰
        <div className="grid grid-cols-20 gap-8">
          {/* 왼쪽: 캘린더 */}
          <Card className="p-8 col-span-13">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                  )
                }
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 style={{ fontWeight: 900 }}>
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </h3>
              <button
                onClick={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                  )
                }
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {monthCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-2 text-sm text-gray-500">
                  {day}
                </div>
              ))}

              {monthCalendar.calendarDays.map((day, i) => {
                const selectedDateStr = formatDateString(selectedDate);
                const entry = diaryEntries.find((e) => e.date === day.dateString);
                const isSelected = selectedDateStr === day.dateString;

                return (
                  <button
                    key={i}
                    onClick={() =>
                      day.isValidDay &&
                      handleDateSelect(
                        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day.dayNumber, 12, 0, 0)
                      )
                    }
                    className={`border rounded-lg p-2 flex flex-col min-h-[110px] ${
                      day.isValidDay ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                    } ${isSelected ? 'ring-2 ring-offset-1 ring-[#2d5f4f]' : ''}`}
                    style={{
                      borderColor: entry
                        ? entry.type === 'attended'
                          ? '#2d5f4f'
                          : '#fbbf24'
                        : '#e5e7eb',
                      backgroundColor: entry
                        ? entry.type === 'attended'
                          ? '#e8f5f0'
                          : '#fef3c7'
                        : day.isValidDay
                        ? 'white'
                        : '#f9fafb',
                    }}
                    disabled={!day.isValidDay}
                  >
                    {day.isValidDay && (
                      <>
                        <div className="text-sm text-center w-full mb-2">{day.dayNumber}</div>
                        {entry && (
                          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                            {entry.team && (
                              <div className="text-[10px] text-gray-700 font-semibold text-center leading-snug px-1 line-clamp-2">
                                {entry.team}
                              </div>
                            )}
                            <img
                              src={entry.emoji}
                              alt={entry.emojiName}
                              className="w-10 h-10 flex-shrink-0"
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
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#e8f5f0', border: '2px solid #2d5f4f' }}
                />
                <span className="text-sm text-gray-600">직관 완료</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }}
                />
                <span className="text-sm text-gray-600">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 오른쪽: 다이어리 폼 */}
          <Card className="p-6 col-span-7">
            <div className="mb-6">
              <h3 style={{ color: '#2d5f4f', fontWeight: 900 }}>
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
              <button onClick={weekCalendar.goToPrevWeek} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 style={{ fontWeight: 900, fontSize: '16px' }}>
                {weekCalendar.getWeekDays()[0].getMonth() + 1}월{' '}
                {weekCalendar.getWeekDays()[0].getDate()}일 -{' '}
                {weekCalendar.getWeekDays()[6].getMonth() + 1}월{' '}
                {weekCalendar.getWeekDays()[6].getDate()}일
              </h3>
              <button onClick={weekCalendar.goToNextWeek} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekCalendar.weekDays.map((day) => (
                <div key={day} className="text-center py-1 text-xs text-gray-500">
                  {day}
                </div>
              ))}

              {weekCalendar.getWeekDays().map((date: Date, index: number) => {
                const dayDateStr = formatDateString(date);
                const selectedDateStr = formatDateString(selectedDate);
                const entry = diaryEntries.find((e: any) => e.date === dayDateStr);
                const isSelected = selectedDateStr === dayDateStr;

                return (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    className={`border rounded-lg p-2 flex flex-col min-h-[100px] bg-white hover:bg-gray-50 ${
                      isSelected ? 'ring-2 ring-offset-1 ring-[#2d5f4f]' : ''
                    }`}
                    style={{
                      borderColor: entry
                        ? entry.type === 'attended'
                          ? '#2d5f4f'
                          : '#fbbf24'
                        : '#e5e7eb',
                      backgroundColor: entry
                        ? entry.type === 'attended'
                          ? '#e8f5f0'
                          : '#fef3c7'
                        : 'white',
                    }}
                  >
                    <div className="text-sm text-center w-full mb-1">{date.getDate()}</div>
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
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#e8f5f0', border: '2px solid #2d5f4f' }}
                />
                <span className="text-gray-600">직관 완료</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }}
                />
                <span className="text-gray-600">직관 예정</span>
              </div>
            </div>
          </Card>

          {/* 다이어리 폼 */}
          <Card className="p-4">
            <div className="mb-6">
              <h3 style={{ color: '#2d5f4f', fontWeight: 900 }}>
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
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ========== 읽기 모드 컴포넌트 ==========
function DiaryReadMode({ diaryForm, selectedDiary, setIsEditMode, handleDeleteDiary, deleteMutation }: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>직관 기록</h3>
      </div>

      {/* 오늘의 기분 */}
      <div
        className="flex items-center gap-6 p-6 rounded-2xl"
        style={{ backgroundColor: '#f8fcfb' }}
      >
        <img src={diaryForm.emoji} alt={diaryForm.emojiName} className="w-20 h-20" />
        <div>
          <div className="text-sm text-gray-500 mb-1">오늘의 기분</div>
          <div className="text-2xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>
            {diaryForm.emojiName}
          </div>
        </div>
      </div>

      {/* 사진 */}
      {diaryForm.photos && diaryForm.photos.length > 0 && (
        <div>
          <div className="text-sm mb-3" style={{ color: '#2d5f4f', fontWeight: 700 }}>
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
          <div className="text-sm text-gray-600">경기</div>
          <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
            {selectedDiary?.team || '경기 정보 없음'}
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <div className="text-sm text-gray-600">구장</div>
          <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
            {selectedDiary?.stadium || '구장 정보 없음'}
          </div>
        </div>
        {diaryForm.winningName && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-sm text-gray-600">승패</div>
            <div style={{ fontWeight: 700, color: '#2d5f4f' }}>
              {getWinningLabel(diaryForm.winningName)}
            </div>
          </div>
        )}
        {diaryForm.memo && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <div className="text-sm text-gray-600">메모</div>
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {diaryForm.memo}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={() => setIsEditMode(true)}
          className="text-white"
          style={{ backgroundColor: '#2d5f4f' }}
          disabled={deleteMutation.isPending}
        >
          수정하기
        </Button>
        <Button
          onClick={handleDeleteDiary}
          className="text-white"
          style={{ backgroundColor: '#EF4444' }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? '삭제 중...' : '삭제'}
        </Button>
      </div>
    </div>
  );
}

const getPhotoPreviewUrl = (photo: string | File): string => {
  if (photo instanceof File) {
    // File 객체면 임시 미리보기 URL 생성
    return URL.createObjectURL(photo);
  }
  // 문자열이면 Supabase Storage URL
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
}: any) {
  const allPhotos = [
    ...diaryForm.photos,      // DB에 저장된 URL들
    ...diaryForm.photoFiles,  // 새로 추가한 File 객체들
  ];

  return (
    <div className="space-y-4">
      {/* 직관 유형 선택 */}
      <div>
        <label className="text-sm text-gray-600 mb-3 block">직관 유형</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => updateForm({ type: 'attended' })}
            className={`flex-1 rounded-lg transition-all ${
              diaryForm.type === 'attended' ? 'shadow-md scale-105' : 'bg-gray-100'
            }`}
            style={{
              backgroundColor: diaryForm.type === 'attended' ? '#2d5f4f' : undefined,
              padding: '10px',
            }}
          >
            <div
              className={`font-bold ${
                diaryForm.type === 'attended' ? 'text-white' : 'text-gray-700'
              }`}
            >
              직관 완료
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ type: 'scheduled' })}
            className={`flex-1 rounded-lg transition-all ${
              diaryForm.type === 'scheduled' ? 'shadow-md scale-105' : 'bg-gray-100'
            }`}
            style={{
              backgroundColor: diaryForm.type === 'scheduled' ? '#fbbf24' : undefined,
              padding: '10px',
            }}
          >
            <div
              className={`font-bold ${
                diaryForm.type === 'scheduled' ? 'text-white' : 'text-gray-700'
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
          <label className="text-sm text-gray-600 mb-3 block">오늘의 기분</label>
          <div className="flex items-center justify-around p-4 bg-gray-50 rounded-2xl">
            {EMOJI_STATS.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => updateForm({ emoji: item.emoji, emojiName: item.name })}
                className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 ${
                  diaryForm.emojiName === item.name
                    ? 'bg-white shadow-md scale-110'
                    : 'hover:bg-white/50'
                }`}
              >
                <img src={item.emoji} alt={item.name} className="w-12 h-12" />
                <span className="text-xs text-gray-600">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 사진 업로드 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div>
          <label className="text-sm text-gray-600 mb-3 block">사진 추가</label>
          <div className="grid grid-cols-3 gap-3">
            {allPhotos.map((photo: string | File, index: number) => (
              <div key={index} className="relative aspect-square">
                <img
                  src={getPhotoPreviewUrl(photo)}
                  alt={`업로드 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
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
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2d5f4f] hover:bg-gray-50">
                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">사진 추가</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">최대 {MAX_PHOTOS}장까지 업로드 가능합니다</p>
        </div>
      )}

      {/* 경기 선택 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">경기 선택</label>
        {availableGames.length > 0 ? (
          <select
            value={diaryForm.gameId}
            onChange={(e) => updateForm({ gameId: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
          >
            <option value="">경기를 선택하세요</option>
            {availableGames.map((game: any) => (
              <option key={game.id} value={game.id}>
                {game.homeTeam} vs {game.awayTeam} - {game.stadium}{' '}
                {game.score ? `(${game.score})` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
            이 날짜에 예정된 경기가 없습니다
          </div>
        )}
      </div>

      {/* 승패 선택 (직관 완료시만) */}
      {diaryForm.type === 'attended' && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-500 mb-2">응원 팀 승패</label>
          <div className="flex gap-3">
            {WINNING_OPTIONS.map(({ value, label, bg, lightBg, textColor }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateForm({ winningName: value })}
                className={`flex-1 py-4 px-4 rounded-xl transition-all transform border-2 ${
                  diaryForm.winningName === value ? 'shadow-lg scale-105' : 'hover:scale-105'
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
                <div className="font-bold text-lg">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메모 */}
      <div>
        <label className="text-sm text-gray-500 mb-1 block">메모</label>
        <textarea
          disabled={diaryForm.type === 'scheduled'}
          value={diaryForm.memo}
          onChange={(e) => updateForm({ memo: e.target.value })}
          placeholder={
            diaryForm.type === 'attended' ? '오늘의 직관 경험을 기록해보세요' : '경기 후 입력 가능'
          }
          rows={4}
          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] resize-none"
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
          className={`${selectedDiary ? 'flex-1' : 'w-full'} text-white`}
          style={{ backgroundColor: '#2d5f4f' }}
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
    </div>
  );
}