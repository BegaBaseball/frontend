// hooks/useCheerWrite.ts
import { useState, useMemo, useEffect, DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/cheer';
import { uploadPostImages } from '../api/images';
import { useCheerStore } from '../store/cheerStore';
import { toast } from 'sonner';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_MB = 5;

export const useCheerWrite = (favoriteTeam: string | null) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { upsertPost } = useCheerStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showTeamRequiredDialog, setShowTeamRequiredDialog] = useState(false);

  const newFilePreviews = useMemo(() => {
    return newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [newFiles]);

  useEffect(() => {
    return () => {
      newFilePreviews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [newFilePreviews]);

  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; teamId: string | null; files: File[] }) => {
      const newPost = await createPost({
        title: payload.title,
        content: payload.content,
        teamId: payload.teamId,
        postType: 'NORMAL',
      });

      if (payload.files.length > 0) {
        await uploadPostImages(newPost.id, payload.files);
      }

      return newPost;
    },
    onSuccess: (newPost) => {
      upsertPost(newPost);
      queryClient.invalidateQueries({ queryKey: ['cheerPosts'] });
      toast.success('게시글이 성공적으로 등록되었습니다.');
      navigate(`/cheer/detail/${newPost.id}`);
    },
    onError: (error: any) => {
      // 403 에러 (응원팀 미선택) 처리
      if (error.response?.status === 403 || error.response?.data?.message?.includes('마이팀')) {
        setShowTeamRequiredDialog(true);
      } else {
        toast.error(error.message || '게시글 등록 중 문제가 발생했습니다.');
      }
    },
  });

  const processFiles = (files: File[]) => {
    const totalImages = newFiles.length;

    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name} 파일이 ${MAX_FILE_SIZE_MB}MB 제한을 초과했습니다.`);
        return false;
      }
      return true;
    });

    if (totalImages + validFiles.length > MAX_IMAGES) {
      toast.error(`이미지는 최대 ${MAX_IMAGES}개까지 선택할 수 있습니다.`);
      return;
    }

    setNewFiles((prev) => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };
  
  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    if (!favoriteTeam) {
      setShowTeamRequiredDialog(true);
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      teamId: favoriteTeam,
      files: newFiles,
    });
  };

  const handleCancel = () => {
    const confirmed = window.confirm('작성을 취소하시겠습니까? 작성 중인 내용은 저장되지 않습니다.');
    if (confirmed) {
      navigate('/cheer');
    }
  };

  return {
    title,
    setTitle,
    content,
    setContent,
    newFiles,
    newFilePreviews,
    isDragging,
    isSubmitting: createMutation.isPending,
    showTeamRequiredDialog,
    setShowTeamRequiredDialog,
    handleFileSelect,
    handleRemoveNewFile,
    handleSubmit,
    handleCancel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};