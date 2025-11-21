import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/cheer';
import { uploadPostImages } from '../api/images';
import { useAuthStore } from '../store/authStore';
import { getFallbackTeamColor, useCheerStore } from '../store/cheerStore';
import { toast } from 'sonner';

export const useCheerWrite = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedPostId, upsertPost } = useCheerStore();
  const user = useAuthStore((state) => state.user);
  const favoriteTeam = user?.favoriteTeam ?? null;

  // ========== States ==========
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // ========== Mutation ==========
  const createMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; files: File[] }) => {
      if (!favoriteTeam) {
        throw new Error('응원 구단을 먼저 설정해주세요.');
      }

      const created = await createPost({
        teamId: favoriteTeam,
        title: payload.title,
        content: payload.content,
      });

      if (payload.files.length > 0) {
        await uploadPostImages(created.id, payload.files);
      }

      return created;
    },
    onSuccess: (createdPost) => {
      toast.success('게시글이 작성되었습니다.');
      setSelectedPostId(createdPost.id);
      upsertPost({
        ...createdPost,
        teamColor: createdPost.teamColor ?? getFallbackTeamColor(createdPost.teamId ?? createdPost.team),
      });
      queryClient.invalidateQueries({ queryKey: ['cheerPosts'] });
      queryClient.invalidateQueries({ queryKey: ['cheerPost', createdPost.id] });
      setTitle('');
      setContent('');
      setSelectedFiles([]);
      navigate(`/cheer/detail/${createdPost.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || '게시글 작성에 실패했습니다.');
    },
  });

  // ========== Handlers ==========
  const handleImagesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    if (!favoriteTeam) {
      toast.error('마이페이지에서 응원 구단을 설정한 후 게시글을 작성할 수 있습니다.');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      files: selectedFiles,
    });
  };

  const handleCancel = () => {
    navigate('/cheer');
  };

  return {
    // Data
    favoriteTeam,
    
    // Form State
    title,
    setTitle,
    content,
    setContent,
    selectedFiles,
    
    // Mutation
    isSubmitting: createMutation.isPending,
    
    // Handlers
    handleImagesSelected,
    handleRemoveFile,
    handleSubmit,
    handleCancel,
  };
};