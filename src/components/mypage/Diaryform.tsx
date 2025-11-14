import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Camera, X } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useDiaryStore } from '../../store/diaryStore';
import worstEmoji from 'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png';
import fullEmoji from 'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png';
import bestEmoji from 'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png';
import angryEmoji from 'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png';
import happyEmoji from 'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET_NAME = import.meta.env.SUPABASE_STORAGE_DIARY_BUCKET || 'diary-images';

const getFullImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  return imagePath;
};

const emojiStats = [
  { name: '최악', emoji: worstEmoji },
  { name: '배부름', emoji: fullEmoji },
  { name: '최고', emoji: bestEmoji },
  { name: '분노', emoji: angryEmoji },
  { name: '즐거움', emoji: happyEmoji }
];

// API 함수들
const fetchGames = async (date: string) => {
  const response = await fetch(`/api/diary/games?date=${date}`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('경기 정보 불러오기 실패');
  return response.json();
};

const saveDiary = async (data: any) => {
  const response = await fetch('/api/diary/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('다이어리 저장 실패');
  return response.json();
};

const updateDiary = async ({ id, data }: { id: number; data: any }) => {
  const response = await fetch(`/api/diary/${id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('다이어리 수정 실패');
  return response.json();
};

const deleteDiary = async (id: number) => {
  const response = await fetch(`/api/diary/${id}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('다이어리 삭제 실패');
  return response.json();
}

export default function DiaryViewSection() {
  const queryClient = useQueryClient();
  const { diaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = useDiaryStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  
  const dateStr = useMemo(() => {
    return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  const selectedDiary = useMemo(() => {
    return diaryEntries.find(e => e.date === dateStr);
  }, [diaryEntries, dateStr]);

  const { data: availableGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games', dateStr],
    queryFn: () => fetchGames(dateStr),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
    gcTime: 30 * 60 * 1000, // 30분간 메모리 유지
  });

  const [diaryForm, setDiaryForm] = useState({
    type: 'attended' as 'attended' | 'scheduled',
    emoji: happyEmoji,
    emojiName: '즐거움',
    winningName: '',
    gameId: '',
    memo: '',
    photos: [] as string[],
    photoFiles: [] as File[]
  });

  // 날짜 선택 시 폼 초기화 (API 호출 없음!)
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsEditMode(false);
    
    const newDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const entry = diaryEntries.find(e => e.date === newDateStr);
    
    if (entry) {
      setDiaryForm({
        type: entry.type || 'attended',
        emoji: entry.emoji,
        emojiName: entry.emojiName,
        winningName: entry.winningName || '',
        gameId: entry.gameId ? String(entry.gameId) : '',
        memo: entry.memo || '',
        photos: entry.photos || [],
        photoFiles: []
      });
    } else {
      setIsEditMode(true);
      setDiaryForm({
        type: 'attended',
        emoji: happyEmoji,
        emojiName: '즐거움',
        winningName: '',
        gameId: '',
        memo: '',
        photos: [],
        photoFiles: []
      });
    }
  };

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: saveDiary,
    onSuccess: async (result) => {
      const diaryId = result.id || result.data?.id;
      let finalPhotos: string[] = [];

      console.log('💾 다이어리 저장 성공, ID:', diaryId);
      console.log('📸 업로드할 사진 개수:', diaryForm.photoFiles.length);

      // 이미지 업로드
      if (diaryForm.photoFiles.length > 0) {
        const formData = new FormData();
        diaryForm.photoFiles.forEach(file => {
          formData.append('images', file);
          console.log('📤 업로드 대기:', file.name);
        });

        try {
          const imageResponse = await fetch(`/api/diary/${diaryId}/images`, {
            method: 'POST',
            credentials: 'include',
            body: formData
          });

          console.log('📡 이미지 업로드 응답:', imageResponse.status);

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            console.log('🔍 이미지 업로드 서버 응답 JSON 전체:', imageResult);
            finalPhotos = imageResult.photos || imageResult.data?.photos || [];
            console.log('✅ 업로드 완료, 사진 경로:', finalPhotos);
          } else {
            console.error('❌ 이미지 업로드 실패:', imageResponse.statusText);
          }
        } catch (error) {
          console.error('❌ 이미지 업로드 에러:', error);
        }
      }

      const game = availableGames.find((g: any) => g.id === Number(diaryForm.gameId));
      const finalEntry = {
        id: diaryId,
        date: dateStr,
        type: diaryForm.type,
        emoji: diaryForm.emoji,
        emojiName: diaryForm.emojiName,
        winningName: diaryForm.winningName,
        gameId: diaryForm.gameId,
        memo: diaryForm.memo,
        photos: finalPhotos,  // ✅ 여기가 중요!
        team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
        stadium: game?.stadium || ''
      };

      console.log('📝 최종 저장 데이터:', finalEntry);
      console.log('📸 저장되는 사진:', finalEntry.photos);

      addDiaryEntry(finalEntry as any);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      
      alert(`다이어리가 작성되었습니다! ${finalPhotos.length}장의 사진이 저장되었습니다.`);
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: (error) => {
      console.error('❌ 저장 실패:', error);
      alert('다이어리 저장에 실패했습니다.');
    }
  });

  // 수정 mutation
  const updateMutation = useMutation({
    mutationFn: updateDiary,
    onSuccess: async (result, variables) => {
      const diaryId = variables.id;
      let finalPhotos: string[] = [...diaryForm.photos];

      // 새 이미지 업로드
      if (diaryForm.photoFiles.length > 0) {
        const formData = new FormData();
        diaryForm.photoFiles.forEach(file => formData.append('images', file));

        try {
          const imageResponse = await fetch(`/api/diary/${diaryId}/images`, {
            method: 'POST',
            credentials: 'include',
            body: formData
          });

          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            const newPhotos = imageResult.photos || imageResult.data?.photos || [];
            finalPhotos = [...finalPhotos, ...newPhotos];
          }
        } catch (error) {
          console.error('이미지 업로드 실패:', error);
        }
      }

      // 스토어 업데이트
      const game = availableGames.find((g: any) => g.id === Number(diaryForm.gameId));
      const finalEntry = {
        id: diaryId,
        date: dateStr,
        type: diaryForm.type,
        emoji: diaryForm.emoji,
        emojiName: diaryForm.emojiName,
        winningName: diaryForm.winningName,
        gameId: diaryForm.gameId,
        memo: diaryForm.memo,
        photos: finalPhotos,
        team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
        stadium: game?.stadium || ''
      };

      updateDiaryEntry(dateStr, finalEntry as any);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      
      alert('다이어리가 수정되었습니다!');
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: () => {
      alert('다이어리 수정에 실패했습니다.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDiary,
    onSuccess: () => {
      deleteDiaryEntry(dateStr);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      alert('다이어리가 삭제되었습니다.');
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: () => {
      alert('다이어리 삭제에 실패했습니다.');
    }
  });

  const handleDeleteDiary = () => {
    if (!selectedDiary) return;
    if (window.confirm('정말로 이 다이어리를 삭제하시겠습니까?')) {
      deleteMutation.mutate(selectedDiary.id);
    }
  };

  const handleSaveDiary = async () => {
    if (!diaryForm.gameId) {
      alert('경기를 선택해주세요.');
      return;
    }

    if (diaryForm.type === 'attended') {
      if (!diaryForm.winningName) {
        alert('승패를 선택해주세요.');
        return;
      }
      if (!diaryForm.emojiName) {
        alert('감정을 선택해주세요.');
        return;
      }
    }
    const game = availableGames.find((g: any) => g.id === Number(diaryForm.gameId));
    
    const entry = {
      date: dateStr,
      type: diaryForm.type,
      emoji: diaryForm.emoji,
      emojiName: diaryForm.emojiName,
      winningName: diaryForm.winningName,
      gameId: diaryForm.gameId,
      memo: diaryForm.memo,
      photos: [],
      team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
      stadium: game?.stadium || ''
    };

    if (selectedDiary) {
      // 수정
      updateMutation.mutate({ 
        id: selectedDiary.id, 
        data: { ...entry, id: selectedDiary.id } 
      });
    } else {
      // 새로 저장
      saveMutation.mutate(entry);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if(!files) return;
    const fileArray = Array.from(files);
    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const oversizedFiles = fileArray.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`파일 크기가 너무 큽니다. 각 파일은 10MB 이하여야 합니다.`);
      return;
    }
    
    const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 60 * 1024 * 1024) {
      alert('전체 파일 크기가 60MB를 초과합니다.');
      return;
    }

    const newPhotoPromises = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPhotoPromises).then(newPhotos => {
      setDiaryForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos],
        photoFiles: [...prev.photoFiles, ...fileArray]
      }));
    });
  };

  const removePhoto = (index: number) => {
    setDiaryForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoFiles: prev.photoFiles.filter((_, i) => i !== index)
    }));
  };

return (
    <div className="rounded-3xl p-8" style={{ backgroundColor: '#2d5f4f' }}>
      <div className="grid grid-cols-20 gap-8">
        {/* 왼쪽: 캘린더 */}
        <Card className="p-8 col-span-13">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 style={{ fontWeight: 900 }}>
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
            </h3>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center py-2 text-sm text-gray-500">{day}</div>
            ))}

            {Array.from({ length: 35 }, (_, i) => {
              const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
              const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
              const dayNumber = i - firstDay + 1;
              const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
              
              const dateStr = isValidDay 
                ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
                : '';

              const selectedDateStr = useMemo(() => {
              return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            }, [selectedDate]);
              
              const entry = diaryEntries.find(e => e.date === dateStr);
              const isSelected = selectedDateStr === dateStr;

              return (
                <button
                  key={i}
                  onClick={() => isValidDay && handleDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber))}
                  className={`border rounded-lg p-2 flex flex-col min-h-[110px] ${
                    isValidDay ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                  } ${isSelected ? 'ring-2 ring-offset-1 ring-[#2d5f4f]' : ''}`}
                  style={{
                    borderColor: entry 
                      ? entry.type === 'attended' ? '#2d5f4f' : '#fbbf24'
                      : '#e5e7eb',
                    backgroundColor: entry 
                      ? entry.type === 'attended' ? '#e8f5f0' : '#fef3c7'
                      : isValidDay ? 'white' : '#f9fafb',
                  }}
                  disabled={!isValidDay}
                >
                  {isValidDay && (
                    <>
                      <div className="text-sm text-center w-full mb-2">{dayNumber}</div>
                      {entry && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                          {entry.team && (
                            <div className="text-[10px] text-gray-700 font-semibold text-center leading-snug px-1 line-clamp-2">
                              {entry.team}
                            </div>
                          )}
                          <img src={entry.emoji} alt={entry.emojiName} className="w-10 h-10 flex-shrink-0" />
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
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e8f5f0', border: '2px solid #2d5f4f' }} />
              <span className="text-sm text-gray-600">직관 완료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24' }} />
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

          {/* 읽기 모드 */}
          {selectedDiary && !isEditMode ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>직관 기록</h3>
              </div>

              {/* 오늘의 기분 */}
              <div className="flex items-center gap-6 p-6 rounded-2xl" style={{ backgroundColor: '#f8fcfb' }}>
                <img src={diaryForm.emoji} alt={diaryForm.emojiName} className="w-20 h-20" />
                <div>
                  <div className="text-sm text-gray-500 mb-1">오늘의 기분</div>
                  <div className="text-2xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                    {diaryForm.emojiName}
                  </div>
                </div>
              </div>

              {/* 사진 */}
              {diaryForm.photos.length > 0 && (
                <div>
                  <div className="text-sm mb-3" style={{ color: '#2d5f4f', fontWeight: 700 }}>사진</div>
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
                          <img src={getFullImageUrl(photo)} alt={`사진 ${index + 1}`} className="w-full h-full object-cover" />
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
                      {diaryForm.winningName === 'WIN' ? '승리' : diaryForm.winningName === 'DRAW' ? '무승부' : '패배'}
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
          ) : (
            /* 편집 모드 */
            <div className="space-y-4">
              {/* 직관 유형 선택 */}
              <div>
                <label className="text-sm text-gray-600 mb-3 block">직관 유형</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDiaryForm({ ...diaryForm, type: 'attended' })}
                    className={`flex-1 rounded-lg transition-all ${diaryForm.type === 'attended' ? 'shadow-md scale-105' : 'bg-gray-100'}`}
                    style={{
                      backgroundColor: diaryForm.type === 'attended' ? '#2d5f4f' : undefined,
                      padding: '10px'
                    }}
                  >
                    <div className={`font-bold ${diaryForm.type === 'attended' ? 'text-white' : 'text-gray-700'}`}>
                      직관 완료
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiaryForm({ ...diaryForm, type: 'scheduled' })}
                    className={`flex-1 rounded-lg transition-all ${diaryForm.type === 'scheduled' ? 'shadow-md scale-105' : 'bg-gray-100'}`}
                    style={{
                      backgroundColor: diaryForm.type === 'scheduled' ? '#fbbf24' : undefined,
                      padding: '10px'
                    }}
                  >
                    <div className={`font-bold ${diaryForm.type === 'scheduled' ? 'text-white' : 'text-gray-700'}`}>
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
                    {emojiStats.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setDiaryForm({ ...diaryForm, emoji: item.emoji, emojiName: item.name })}
                        className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 ${
                          diaryForm.emojiName === item.name ? 'bg-white shadow-md scale-110' : 'hover:bg-white/50'
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
                    {diaryForm.photos.map((photo: string, index: number) => (
                      <div key={index} className="relative aspect-square">
                        <img src={getFullImageUrl(photo)} alt={`업로드 ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {diaryForm.photos.length < 6 && (
                      <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#2d5f4f] hover:bg-gray-50">
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500">사진 추가</span>
                        <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">최대 6장까지 업로드 가능합니다</p>
                </div>
              )}

              {/* 경기 선택 */}
              <div>
                <label className="text-sm text-gray-500 mb-1 block">경기 선택</label>
                {availableGames.length > 0 ? (
                  <select
                    value={diaryForm.gameId}
                    onChange={(e) => setDiaryForm({ ...diaryForm, gameId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] bg-white"
                  >
                    <option value="">경기를 선택하세요</option>
                    {availableGames.map((game: any) => (
                      <option key={game.id} value={game.id}>
                        {game.homeTeam} vs {game.awayTeam} - {game.stadium} {game.score ? `(${game.score})` : ''}
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
                    {[
                      { value: 'WIN', label: '승', bg: '#22c55e', lightBg: '#f0fdf4', textColor: '#166534' },
                      { value: 'DRAW', label: '무', bg: '#eab308', lightBg: '#fefce8', textColor: '#854d0e' },
                      { value: 'LOSE', label: '패', bg: '#ef4444', lightBg: '#fef2f2', textColor: '#991b1b' }
                    ].map(({ value, label, bg, lightBg, textColor }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDiaryForm(prev => ({ ...prev, winningName: value }))}
                        className={`flex-1 py-4 px-4 rounded-xl transition-all transform border-2 ${
                          diaryForm.winningName === value ? 'shadow-lg scale-105' : 'hover:scale-105'
                        }`}
                        style={diaryForm.winningName === value ? {
                          backgroundColor: bg,
                          color: 'white',
                          borderColor: bg
                        } : {
                          backgroundColor: lightBg,
                          color: textColor,
                          borderColor: lightBg
                        }}
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
                  onChange={(e) => setDiaryForm({ ...diaryForm, memo: e.target.value })}
                  placeholder={diaryForm.type === 'attended' ? "오늘의 직관 경험을 기록해보세요" : "경기 후 입력 가능"}
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
                    : selectedDiary ? '저장하기' : '작성하기'
                  }
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}