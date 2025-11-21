import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDiaryStore } from '../store/diaryStore';
import { fetchGames, saveDiary, updateDiary, deleteDiary, uploadDiaryImages } from '../api/diary';
import { DiaryEntry, Game } from '../types/diary';
import { formatDateString } from '../utils/diary';
import { useDiaryForm } from './useDiaryForm';
import { toast } from 'sonner';

export const useDiaryView = () => {
  const queryClient = useQueryClient();
  const { diaryEntries, addDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = useDiaryStore();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);

  const {
    diaryForm,
    resetForm,
    updateForm,
    handlePhotoUpload,
    removePhoto,
    validateForm,
  } = useDiaryForm();

  // ========== Computed Values ==========
  const dateStr = useMemo(() => formatDateString(selectedDate), [selectedDate]);

  const selectedDiary = useMemo(() => {
    return diaryEntries.find((e) => e.date === dateStr);
  }, [diaryEntries, dateStr]);

  // ========== Fetch Games ==========
  const { data: availableGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games', dateStr],
    queryFn: () => fetchGames(dateStr),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ========== 날짜 선택 ==========
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsEditMode(false);

    const newDateStr = formatDateString(date);
    const entry = diaryEntries.find((e) => e.date === newDateStr);

    if (entry) {
      resetForm(entry);
    } else {
      setIsEditMode(true);
      resetForm();
    }
  };

  // ========== 이미지 업로드 처리 ==========
  const handleImageUpload = async (diaryId: number, photoFiles: File[]) => {
    if (photoFiles.length === 0) return [];

    try {
      const photos = await uploadDiaryImages(diaryId, photoFiles);
      toast.success(`${photos.length}장의 사진이 저장되었습니다.`);
      return photos;
    } catch (error) {
      console.error('❌ 이미지 업로드 에러:', error);
      toast.error('일부 사진 업로드에 실패했습니다.');
      return [];
    }
  };

  // ========== Save Mutation ==========
  const saveMutation = useMutation({
    mutationFn: saveDiary,
    onSuccess: async (result) => {
      const diaryId = result.id || result.data?.id;
      console.log('💾 다이어리 저장 성공, ID:', diaryId);

      // 이미지 업로드
      const finalPhotos = await handleImageUpload(diaryId, diaryForm.photoFiles);

      // 최종 데이터 구성
      const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));
      const finalEntry: DiaryEntry = {
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
        stadium: game?.stadium || '',
      };

      console.log('📝 최종 저장 데이터:', finalEntry);

      addDiaryEntry(finalEntry);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });

      toast.success('다이어리가 작성되었습니다!');
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: (error) => {
      console.error('❌ 저장 실패:', error);
      toast.error('다이어리 저장에 실패했습니다.');
    },
  });

  // ========== Update Mutation ==========
  const updateMutation = useMutation({
    mutationFn: updateDiary,
    onSuccess: async (result, variables) => {
      const diaryId = variables.id;

      // 기존 사진 유지 + 새 사진 업로드
      let finalPhotos = [...diaryForm.photos];
      if (diaryForm.photoFiles.length > 0) {
        const newPhotos = await handleImageUpload(diaryId, diaryForm.photoFiles);
        finalPhotos = [...finalPhotos, ...newPhotos];
      }

      // 최종 데이터 구성
      const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));
      const finalEntry: DiaryEntry = {
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
        stadium: game?.stadium || '',
      };

      updateDiaryEntry(dateStr, finalEntry);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });

      toast.success('다이어리가 수정되었습니다!');
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: () => {
      toast.error('다이어리 수정에 실패했습니다.');
    },
  });

  // ========== Delete Mutation ==========
  const deleteMutation = useMutation({
    mutationFn: deleteDiary,
    onSuccess: () => {
      deleteDiaryEntry(dateStr);
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      toast.success('다이어리가 삭제되었습니다.');
      setIsEditMode(false);
      handleDateSelect(selectedDate);
    },
    onError: () => {
      toast.error('다이어리 삭제에 실패했습니다.');
    },
  });

  // ========== Handlers ==========
  const handleSaveDiary = async () => {
    const validation = validateForm();
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));

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
      stadium: game?.stadium || '',
    };

    if (selectedDiary) {
      updateMutation.mutate({
        id: selectedDiary.id,
        data: { ...entry, id: selectedDiary.id },
      });
    } else {
      saveMutation.mutate(entry);
    }
  };

  const handleDeleteDiary = () => {
    if (!selectedDiary) return;
    if (window.confirm('정말로 이 다이어리를 삭제하시겠습니까?')) {
      deleteMutation.mutate(selectedDiary.id);
    }
  };

  return {
    // State
    selectedDate,
    currentMonth,
    setCurrentMonth,
    isEditMode,
    setIsEditMode,
    dateStr,
    selectedDiary,

    // Games
    availableGames,
    gamesLoading,

    // Form
    diaryForm,
    updateForm,
    handlePhotoUpload,
    removePhoto,

    // Handlers
    handleDateSelect,
    handleSaveDiary,
    handleDeleteDiary,

    // Mutations
    saveMutation,
    updateMutation,
    deleteMutation,

    // Diary Entries
    diaryEntries,
  };
};