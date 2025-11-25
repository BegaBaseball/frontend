// hooks/useCheerEdit.ts
import { useState, useEffect, useMemo, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPost, updatePost } from '../api/cheer';
import { listPostImages, deleteImage, uploadPostImages, renewSignedUrl, PostImageInfo } from '../api/images';
import { useCheerStore } from '../store/cheerStore';
import { toast } from 'sonner';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_MB = 5;

export const useCheerEdit = (postId: number, favoriteTeam: string | null) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { upsertPost } = useCheerStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingImages, setExistingImages] = useState<PostImageInfo[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cheerPost', postId],
    queryFn: () => getPost(postId),
    enabled: !!postId,
  });

  useEffect(() => {
    if (!post || !postId) return;
    let cancelled = false;
    (async () => {
      setTitle(post.title);
      setContent(post.content ?? '');
      setLoadingImages(true);
      try {
        const images = await listPostImages(postId);
        if (cancelled) return;
        setExistingImages(images);
        if (images.length === 0) {
          if (!cancelled) setLoadingImages(false);
          return;
        }
        const entries = await Promise.all(
          images.map(async (img) => {
            try {
              const { signedUrl } = await renewSignedUrl(img.id);
              return [img.id, signedUrl] as const;
            } catch (error) {
              return [img.id, ''] as const;
            }
          })
        );
        if (!cancelled) {
          setImageUrls(new Map(entries.filter(([, url]) => url)));
        }
      } catch (error) {
        toast.error('이미지 로드 실패');
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [post, postId]);

  const hasAccess = post
    ? favoriteTeam
      ? (post.teamId ? post.teamId === favoriteTeam : (post.team ?? '') === favoriteTeam)
      : false
    : false;

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

  const updateMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; files: File[] }) => {
      const updated = await updatePost(post!.id, {
        title: payload.title,
        content: payload.content
      });
      if (payload.files.length > 0) {
        await uploadPostImages(updated.id, payload.files);
      }
      return updated;
    },
    onSuccess: (updated) => {
      upsertPost(updated);
      queryClient.invalidateQueries({ queryKey: ['cheerPost', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['cheerPosts'] });
      toast.success('게시글이 수정되었습니다.');
      navigate(`/cheer/detail/${updated.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || '게시글 수정 중 문제가 발생했습니다.');
    },
  });

  const processFiles = (files: File[]) => {
    const totalImages = existingImages.length + newFiles.length;
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

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!post) return;
    const confirmed = window.confirm('이 이미지를 즉시 삭제할까요? 삭제하면 복구할 수 없습니다.');
    if (!confirmed) return;
    try {
      setDeletingImageId(imageId);
      await deleteImage(imageId);
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      setImageUrls((prev) => {
        const next = new Map(prev);
        next.delete(imageId);
        return next;
      });
      toast.success('이미지를 삭제했습니다.');
    } catch (error) {
      console.error('이미지 즉시 삭제 실패:', error);
      toast.error(error instanceof Error ? error.message : '이미지 삭제에 실패했습니다.');
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleRemoveNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!post) return;
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      files: newFiles,
    });
  };

  const handleCancel = () => {
    if (postId) {
      navigate(`/cheer/detail/${postId}`);
    } else {
      navigate('/cheer');
    }
  };

  return {
    post,
    isLoading,
    isError,
    hasAccess,
    title,
    setTitle,
    content,
    setContent,
    existingImages,
    imageUrls,
    newFiles,
    newFilePreviews,
    loadingImages,
    deletingImageId,
    isDragging,
    isSubmitting: updateMutation.isPending,
    handleFileSelect,
    handleDeleteExistingImage,
    handleRemoveNewFile,
    handleSubmit,
    handleCancel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
