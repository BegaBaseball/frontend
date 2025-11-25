import { useState } from 'react';
import { DiaryFormData, DiaryEntry } from '../types/diary';
import { DEFAULT_EMOJI, DEFAULT_EMOJI_NAME } from '../constants/diary';
import { validateFileSize, convertFilesToBase64 } from '../utils/diary';
import { toast } from 'sonner';

const getInitialFormData = (): DiaryFormData => ({
  type: 'attended',
  emoji: DEFAULT_EMOJI,
  emojiName: DEFAULT_EMOJI_NAME,
  winningName: '',
  gameId: '',
  memo: '',
  photos: [],
  photoFiles: [],
});

export const useDiaryForm = () => {
  const [diaryForm, setDiaryForm] = useState<DiaryFormData>(getInitialFormData());

  // ========== 폼 초기화 ==========
  const resetForm = (entry?: DiaryEntry) => {
    if (entry) {
      setDiaryForm({
        type: entry.type || 'attended',
        emoji: entry.emoji,
        emojiName: entry.emojiName,
        winningName: entry.winningName || '',
        gameId: entry.gameId ? String(entry.gameId) : '',
        memo: entry.memo || '',
        photos: entry.photos || [],
        photoFiles: [],
      });
    } else {
      setDiaryForm(getInitialFormData());
    }
  };

  // ========== 폼 업데이트 ==========
  const updateForm = (updates: Partial<DiaryFormData>) => {
    setDiaryForm((prev) => ({ ...prev, ...updates }));
  };

  // ========== 사진 업로드 ==========
  const handlePhotoUpload = async (files: FileList | null) => {
    
    if (!files) {
      return;
    }

    const fileArray = Array.from(files);

    // 파일 크기 검증
    const validation = validateFileSize(fileArray);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }


    setDiaryForm((prev) => {
      const newPhotoFiles = [...prev.photoFiles, ...fileArray];
      return {
        ...prev,
        photoFiles: newPhotoFiles,
      };
    });

  };

  // ========== 사진 삭제 ==========
  const removePhoto = (index: number) => {
    
    setDiaryForm((prev) => {
      const existingPhotosCount = prev.photos.length;

      if (index < existingPhotosCount) {
        // 기존 사진 삭제 (DB URL)
        return {
          ...prev,
          photos: prev.photos.filter((_, i) => i !== index),
        };
      } else {
        // 새 사진 삭제 (File 객체)
        const fileIndex = index - existingPhotosCount;
        return {
          ...prev,
          photoFiles: prev.photoFiles.filter((_, i) => i !== fileIndex),
        };
      }
    });
  };

  // ========== 폼 검증 ==========
  const validateForm = (): { valid: boolean; error?: string } => {
    
    if (!diaryForm.gameId) {
      return { valid: false, error: '경기를 선택해주세요.' };
    }

    if (diaryForm.type === 'attended') {
      if (!diaryForm.winningName) {
        return { valid: false, error: '승패를 선택해주세요.' };
      }
      if (!diaryForm.emojiName) {
        return { valid: false, error: '감정을 선택해주세요.' };
      }
    }

    return { valid: true };
  };

  return {
    diaryForm,
    setDiaryForm,
    resetForm,
    updateForm,
    handlePhotoUpload,
    removePhoto,
    validateForm,
  };
};