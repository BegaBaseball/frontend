import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGames,
  fetchDiaries,
  saveDiary,
  updateDiary,
  deleteDiary,
  uploadDiaryImages,
  submitSeatViewSelections,
  type UploadDiaryImagesResponse,
} from '../api/diary';
import { DiaryEntry, Game, SaveDiaryRequest, SeatViewCandidate } from '../types/diary';
import { formatDateString } from '../utils/diary';
import { useDiaryForm } from './useDiaryForm';
import { toast } from 'sonner';
import { useConfirmDialog } from '../components/contexts/ConfirmDialogContext';
import { useDiaryStore } from '../store/diaryStore';

const DEFAULT_IMAGE_UPLOAD_RESULT: UploadDiaryImagesResponse = {
  photos: [],
  candidates: [],
};

const AUTO_SELECT_CONFIDENCE = 0.7;

interface SeatViewSelectionState {
  open: boolean;
  diaryId: number | null;
  candidates: SeatViewCandidate[];
  selectedIds: number[];
  submitting: boolean;
}

const createEmptySeatViewSelectionState = (): SeatViewSelectionState => ({
  open: false,
  diaryId: null,
  candidates: [],
  selectedIds: [],
  submitting: false,
});

const getAutoSelectedCandidateIds = (candidates: SeatViewCandidate[]): number[] =>
  candidates
    .filter(
      (candidate) =>
        candidate.shareEligible &&
        candidate.sourceType === 'DIARY_UPLOAD' &&
        candidate.aiSuggestedLabel === 'SEAT_VIEW' &&
        (candidate.aiConfidence ?? 0) >= AUTO_SELECT_CONFIDENCE
    )
    .map((candidate) => candidate.id);

export const useDiaryView = () => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirmDialog();
  const pendingDraft = useDiaryStore((state) => state.pendingDraft);
  const clearPendingDraft = useDiaryStore((state) => state.clearPendingDraft);
  const seatViewDialogResolverRef = useRef<(() => void) | null>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [seatViewSelectionState, setSeatViewSelectionState] = useState<SeatViewSelectionState>(
    createEmptySeatViewSelectionState()
  );

  const {
    diaryForm,
    resetForm,
    updateForm,
    handlePhotoUpload,
    removePhoto,
  } = useDiaryForm();

  const dateStr = useMemo(() => formatDateString(selectedDate), [selectedDate]);

  const { data: diaryEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['diaries'],
    queryFn: () => fetchDiaries(),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const selectedDiary = useMemo(() => {
    return diaryEntries.find((e: DiaryEntry) => e.date === dateStr);
  }, [diaryEntries, dateStr]);

  useEffect(() => {
    if (!pendingDraft?.date) {
      return;
    }

    const nextDate = new Date(`${pendingDraft.date}T12:00:00`);
    if (Number.isNaN(nextDate.getTime())) {
      clearPendingDraft();
      return;
    }

    const existingEntry = diaryEntries.find((entry: DiaryEntry) => entry.date === pendingDraft.date);

    setSelectedDate(nextDate);
    setCurrentMonth(nextDate);
    setIsEditMode(true);
    resetForm(existingEntry);
    updateForm({
      gameId: pendingDraft.gameId ?? existingEntry?.gameId ?? 0,
      section: pendingDraft.section ?? existingEntry?.section ?? '',
      seatRow: pendingDraft.seatRow ?? existingEntry?.seatRow ?? '',
      seatNumber: pendingDraft.seatNumber ?? existingEntry?.seatNumber ?? '',
    });
    clearPendingDraft();
  }, [clearPendingDraft, diaryEntries, pendingDraft, resetForm, updateForm]);

  const { data: availableGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games', dateStr],
    queryFn: () => fetchGames(dateStr),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

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

  const resetSeatViewSelectionDialog = () => {
    setSeatViewSelectionState(createEmptySeatViewSelectionState());
  };

  const finishSeatViewSelectionDialog = () => {
    seatViewDialogResolverRef.current?.();
    seatViewDialogResolverRef.current = null;
    resetSeatViewSelectionDialog();
  };

  const openSeatViewSelectionDialog = async (diaryId: number, candidates: SeatViewCandidate[]) => {
    const shareEligibleCandidates = candidates.filter((candidate) => candidate.shareEligible);
    if (shareEligibleCandidates.length === 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      seatViewDialogResolverRef.current = resolve;
      setSeatViewSelectionState({
        open: true,
        diaryId,
        candidates,
        selectedIds: getAutoSelectedCandidateIds(candidates),
        submitting: false,
      });
    });
  };

  const handleImageUpload = async (
    diaryId: number,
    photoFiles: typeof diaryForm.photoFiles
  ): Promise<UploadDiaryImagesResponse> => {
    if (photoFiles.length === 0) {
      return DEFAULT_IMAGE_UPLOAD_RESULT;
    }

    try {
      const result = await uploadDiaryImages(diaryId, photoFiles);
      toast.success(`${result.photos.length}장의 사진이 저장되었습니다.`);
      return result;
    } catch (error) {
      toast.error('일부 사진 업로드에 실패했습니다.');
      return DEFAULT_IMAGE_UPLOAD_RESULT;
    }
  };

  const refreshDiaryQueries = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await queryClient.invalidateQueries({ queryKey: ['diaries'], refetchType: 'all' });
    await queryClient.refetchQueries({ queryKey: ['diaries'], type: 'active' });
    await queryClient.invalidateQueries({ queryKey: ['statistics'] });
  };

  const saveMutation = useMutation({
    mutationFn: (data: SaveDiaryRequest) => saveDiary(data),
    onSuccess: async (result, variables) => {
      const diaryId = Number(result.id || (result as Record<string, unknown>)['data']);
      const uploadResult = await handleImageUpload(diaryId, diaryForm.photoFiles);

      if (uploadResult.photos.length > 0) {
        await updateDiary({
          id: diaryId,
          data: {
            ...variables,
            photos: [...variables.photos, ...uploadResult.photos],
            ticketVerificationToken: undefined,
          },
        });
      }

      await openSeatViewSelectionDialog(diaryId, uploadResult.candidates);
      await refreshDiaryQueries();

      toast.success('다이어리가 작성되었습니다!');
      setIsEditMode(false);
    },
    onError: () => {
      toast.error('다이어리 저장에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; data: SaveDiaryRequest }) => updateDiary(params),
    onSuccess: async (_result, variables) => {
      const diaryId = variables.id;

      if (diaryForm.photoFiles.length > 0) {
        const uploadResult = await handleImageUpload(diaryId, diaryForm.photoFiles);

        if (uploadResult.photos.length > 0) {
          const allPhotos = [...(diaryForm.photoStoragePaths || []), ...uploadResult.photos];
          await updateDiary({
            id: diaryId,
            data: {
              ...variables.data,
              photos: allPhotos,
              ticketVerificationToken: undefined,
            },
          });
        }

        await openSeatViewSelectionDialog(diaryId, uploadResult.candidates);
      }

      await refreshDiaryQueries();

      toast.success('다이어리가 수정되었습니다!');
      setIsEditMode(false);
    },
    onError: () => {
      toast.error('다이어리 수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDiary(id),
    onSuccess: async () => {
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

  const handleSeatViewSelectionSubmit = async (candidateIds: number[]) => {
    if (!seatViewSelectionState.diaryId) {
      finishSeatViewSelectionDialog();
      return;
    }

    setSeatViewSelectionState((prev) => ({ ...prev, submitting: true }));
    try {
      await submitSeatViewSelections(seatViewSelectionState.diaryId, candidateIds);
      toast.success(
        candidateIds.length > 0
          ? '시야뷰가 검토 대기 상태로 제출되었습니다.'
          : '공개 시야뷰 제출을 건너뛰었습니다.'
      );
      finishSeatViewSelectionDialog();
    } catch (error) {
      toast.error('시야뷰 제출 처리에 실패했습니다.');
      setSeatViewSelectionState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const toggleSeatViewCandidate = (candidateId: number, checked: boolean) => {
    setSeatViewSelectionState((prev) => {
      const candidate = prev.candidates.find((item) => item.id === candidateId);
      if (!candidate || !candidate.shareEligible || prev.submitting) {
        return prev;
      }

      const nextSelectedIds = checked
        ? [...prev.selectedIds, candidateId]
        : prev.selectedIds.filter((id) => id !== candidateId);

      return {
        ...prev,
        selectedIds: Array.from(new Set(nextSelectedIds)),
      };
    });
  };

  const handleSaveDiary = async () => {
    const game = availableGames.find((g: Game) => g.id === diaryForm.gameId);

    const entry: SaveDiaryRequest = {
      date: dateStr,
      type: diaryForm.type,
      emoji: diaryForm.emoji,
      emojiName: diaryForm.emojiName,
      winningName: diaryForm.winningName,
      gameId: diaryForm.gameId,
      memo: diaryForm.memo,
      photos: diaryForm.photoStoragePaths,
      team: game ? `${game.homeTeam} vs ${game.awayTeam}` : '',
      stadium: game?.stadium || '',
      section: diaryForm.section,
      block: diaryForm.block,
      seatRow: diaryForm.seatRow,
      seatNumber: diaryForm.seatNumber,
      ticketVerificationToken: diaryForm.ticketVerificationToken,
    };

    if (selectedDiary) {
      updateMutation.mutate({
        id: selectedDiary.id,
        data: entry,
      });
    } else {
      saveMutation.mutate(entry);
    }
  };

  const handleDeleteDiary = async () => {
    if (!selectedDiary) return;
    const confirmed = await confirm({
      title: '다이어리 삭제',
      description: '정말로 이 다이어리를 삭제하시겠습니까?',
      confirmLabel: '삭제',
      variant: 'destructive',
    });
    if (confirmed) {
      deleteMutation.mutate(selectedDiary.id);
    }
  };

  return {
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
    seatViewSelectionState,
    toggleSeatViewCandidate,
    handleSeatViewSelectionConfirm: () =>
      handleSeatViewSelectionSubmit(seatViewSelectionState.selectedIds),
    handleSeatViewSelectionSkip: () => handleSeatViewSelectionSubmit([]),
  };
};
