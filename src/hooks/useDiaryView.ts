import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGames, fetchDiaries, saveDiary, updateDiary, deleteDiary, uploadDiaryImages } from '../api/diary';
import { DiaryEntry, Game } from '../types/diary';
import { formatDateString } from '../utils/diary';
import { useDiaryForm } from './useDiaryForm';
import { toast } from 'sonner';
import { useConfirmDialog } from '../components/contexts/ConfirmDialogContext';

export const useDiaryView = () => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  // const { openErrorModal } = useErrorModal(); // Removed

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

  // ========== Fetch Diaries from DB ==========
  const { data: diaryEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['diaries'],
    queryFn: () => fetchDiaries(),
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  });

  const selectedDiary = useMemo(() => {
    return diaryEntries.find((e: DiaryEntry) => e.date === dateStr);
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
    const entry = diaryEntries.find((e: DiaryEntry) => e.date === newDateStr);

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
      // Global modal handles server errors. Toast provides quick feedback.
      toast.error('일부 사진 업로드에 실패했습니다.');
      return [];
    }
  };

  // ========== Save Mutation ==========
  const saveMutation = useMutation({
    mutationFn: (data: any) => saveDiary(data),
    onSuccess: async (result) => {
      const diaryId = result.id || result.data?.id;

      // 이미지 업로드
      const uploadedPhotos = await handleImageUpload(diaryId, diaryForm.photoFiles);

      // 업로드된 사진이 있으면 다이어리 레코드 업데이트
      if (uploadedPhotos.length > 0) {
        const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));

        await updateDiary({
          id: diaryId,
          data: {
            date: dateStr,
            type: diaryForm.type,
            emoji: diaryForm.emoji,
            emojiName: diaryForm.emojiName,
            winningName: diaryForm.winningName,
            gameId: diaryForm.gameId,
            memo: diaryForm.memo,
            photos: uploadedPhotos,
            team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
            stadium: game?.stadium || '',
            section: diaryForm.section,
            block: diaryForm.block,
            row: diaryForm.row,
            seat: diaryForm.seat,
          },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // DB 데이터 다시 조회 (강제 리프레시)
      await queryClient.invalidateQueries({ queryKey: ['diaries'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['diaries'], type: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });

      toast.success('다이어리가 작성되었습니다!');
      setIsEditMode(false);
    },
    onError: (error) => {
      // Global error modal handles the details. Toast is optional but good for quick feedback.
      toast.error('다이어리 저장에 실패했습니다.');
    },
  });

  // ========== Update Mutation ==========
  const updateMutation = useMutation({
    mutationFn: (params: { id: number; data: any }) => updateDiary(params),
    onSuccess: async (result, variables) => {
      const diaryId = variables.id;

      // 새 사진이 있으면 업로드
      if (diaryForm.photoFiles.length > 0) {
        const uploadedPhotos = await handleImageUpload(diaryId, diaryForm.photoFiles);

        // 업로드 성공 시 기존 사진과 합쳐서 다시 업데이트
        if (uploadedPhotos.length > 0) {
          const allPhotos = [...(diaryForm.photos || []), ...uploadedPhotos];
          const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));

          await updateDiary({
            id: diaryId,
            data: {
              ...variables.data,
              photos: allPhotos,
            },
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // DB 데이터 다시 조회 (강제 리프레시)
      await queryClient.invalidateQueries({ queryKey: ['diaries'], refetchType: 'all' });
      await queryClient.refetchQueries({ queryKey: ['diaries'], type: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });

      toast.success('다이어리가 수정되었습니다!');
      setIsEditMode(false);
    },
    onError: () => {
      toast.error('다이어리 수정에 실패했습니다.');
    },
  });

  // ========== Delete Mutation ==========
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDiary(id),
    onSuccess: async () => {
      // DB 데이터 다시 조회 (강제 리프레시)
      await queryClient.invalidateQueries({ queryKey: ['diaries'], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['diaries'] });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });

      toast.success('다이어리가 삭제되었습니다.');
      setIsEditMode(false);
      resetForm();
    },
    onError: () => {
      toast.error('다이어리 삭제에 실패했습니다.');
    },
  });

  // ========== Handlers ==========
  const handleSaveDiary = async () => {
    // const validation = validateForm();
    // if (!validation.valid) {
    //   toast.error(validation.error);
    //   return;
    // }

    const game = availableGames.find((g: Game) => g.id === Number(diaryForm.gameId));

    const entry = {
      date: dateStr,
      type: diaryForm.type,
      emoji: diaryForm.emoji,
      emojiName: diaryForm.emojiName,
      winningName: diaryForm.winningName,
      gameId: diaryForm.gameId,
      memo: diaryForm.memo,
      photos: diaryForm.photos, // 기존 사진 URL 유지
      team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
      stadium: game?.stadium || '',
      section: diaryForm.section,
      block: diaryForm.block,
      row: diaryForm.row,
      seat: diaryForm.seat,
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

  const handleDeleteDiary = async () => {
    if (!selectedDiary) return;
    const confirmed = await confirm({ title: '다이어리 삭제', description: '정말로 이 다이어리를 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
    if (confirmed) {
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

    // Diary Entries (DB에서 조회)
    diaryEntries,
    entriesLoading,
  };
};