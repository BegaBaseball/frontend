import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, MessageSquare, X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Card } from './ui/card';
import Navbar from './Navbar';
import { useNavigationStore } from '../store/navigationStore';
import { getTeamNameById, useCheerStore } from '../store/cheerStore';
import { useAuthStore } from '../store/authStore';
import { getPost, updatePost } from '../api/cheer';
import { listPostImages, deleteImage, uploadPostImages, renewSignedUrl, PostImageInfo } from '../api/images';
import { toast } from 'sonner';

export default function CheerEdit() {
  const queryClient = useQueryClient();
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedPostId, upsertPost } = useCheerStore();
  const favoriteTeam = useAuthStore((state) => state.user?.favoriteTeam) ?? null;

  const {
    data: post,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['cheerPost', selectedPostId],
    queryFn: () => getPost(selectedPostId!),
    enabled: !!selectedPostId,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingImages, setExistingImages] = useState<PostImageInfo[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map()); // 이미지 ID -> 서명된 URL
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  useEffect(() => {
    if (!post || !selectedPostId) return;

    let cancelled = false;

    (async () => {
      setTitle(post.title);
      setContent(post.content ?? '');
      setLoadingImages(true);

      try {
        console.log('[CheerEdit] 이미지 목록 로드 시작, postId:', selectedPostId);
        const images = await listPostImages(selectedPostId);
        console.log('[CheerEdit] 이미지 목록 조회 완료:', images.length, '개');

        if (cancelled) return;
        setExistingImages(images);

        if (images.length === 0) {
          console.log('[CheerEdit] 이미지가 없습니다');
          if (!cancelled) setLoadingImages(false);
          return;
        }

        // 병렬로 서명된 URL 가져오기
        const entries = await Promise.all(
          images.map(async (img) => {
            try {
              console.log(`[CheerEdit] 이미지 ${img.id} URL 생성 시도...`);
              const { signedUrl } = await renewSignedUrl(img.id);
              console.log(`[CheerEdit] 이미지 ${img.id} URL 생성 성공:`, signedUrl?.substring(0, 50) + '...');
              return [img.id, signedUrl] as const;
            } catch (error) {
              console.error(`[CheerEdit] 이미지 ${img.id} URL 생성 실패:`, error);
              return [img.id, ''] as const;
            }
          })
        );

        if (!cancelled) {
          setImageUrls(new Map(entries.filter(([, url]) => url)));
        }
      } catch (error) {
        console.error('[CheerEdit] 이미지 로드 실패:', error);
        toast.error('이미지 로드 실패');
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post, selectedPostId]);

  const hasAccess = post
    ? favoriteTeam
      ? (post.teamId ? post.teamId === favoriteTeam : (post.team ?? '') === favoriteTeam)
      : false
    : false;

  const updateMutation = useMutation({
    mutationFn: async (payload: { title: string; content: string; files: File[] }) => {
      // 1. 게시글 내용 업데이트
      const updated = await updatePost(post!.id, {
        title: payload.title,
        content: payload.content
      });

      // 2. 이미지 삭제/업로드 병렬 처리
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
      setCurrentView('cheerDetail', { postId: updated.id });
    },
    onError: (error: Error) => {
      toast.error(error.message || '게시글 수정 중 문제가 발생했습니다.');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const totalImages = existingImages.length + newFiles.length;
    const maxImages = 10;
    const maxSizeMB = 5;

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} 파일이 ${maxSizeMB}MB 제한을 초과했습니다.`);
        return false;
      }
      return true;
    });

    if (totalImages + validFiles.length > maxImages) {
      toast.error(`이미지는 최대 ${maxImages}개까지 선택할 수 있습니다.`);
      return;
    }

    setNewFiles((prev) => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!post) return;
    const confirmed = window.confirm('이 이미지를 즉시 삭제할까요? 삭제하면 복구할 수 없습니다.');
    if (!confirmed) {
      return;
    }

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

  // 새로 추가된 파일 미리보기 URL 관리
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
    if (selectedPostId) {
      setCurrentView('cheerDetail', { postId: selectedPostId });
    } else {
      setCurrentView('cheer');
    }
  };

  if (!selectedPostId) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar currentPage="cheer" />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-500">
          수정할 게시글이 선택되지 않았습니다.
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar currentPage="cheer" />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-red-600">
          게시글 정보를 불러오는 중 문제가 발생했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="cheer" />

      <div className="border-b bg-gray-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 style={{ color: '#2d5f4f' }}>응원글 수정</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-gray-300"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
              disabled={updateMutation.isPending || !title.trim() || !content.trim()}
            >
              {updateMutation.isPending ? '수정 중...' : '수정 완료'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && (
          <div className="space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}

        {!isLoading && post && (
          <>
            {!hasAccess ? (
              <Card className="rounded-xl bg-white p-12 text-center shadow-sm">
                <div className="mx-auto w-20 rounded-full bg-red-100 p-6">
                  <MessageSquare className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="mt-6 mb-4 text-gray-900">수정 권한이 없습니다</h2>
                <p className="mb-6 text-gray-600 leading-relaxed">
                  이 게시글은{' '}
                  <span className="font-bold" style={{ color: post.teamColor ?? '#2d5f4f' }}>
                    {post.teamName ?? post.team}
                  </span>{' '}
                  팀 게시글입니다.
                  <br />
                  {favoriteTeam ? (
                    <>
                      회원님의 응원팀(
                      <span className="font-bold" style={{ color: '#2d5f4f' }}>
                        {getTeamNameById(favoriteTeam)}
                      </span>
                      )만 수정이 가능합니다.
                    </>
                  ) : (
                    <>응원 구단을 설정하지 않으셨습니다. 마이페이지에서 응원 구단을 등록한 후 수정할 수 있습니다.</>
                  )}
                </p>
                <Button
                  onClick={handleCancel}
                  className="px-8 text-white"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  돌아가기
                </Button>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm" style={{ color: '#2d5f4f' }}>
                    제목 *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력하세요"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm" style={{ color: '#2d5f4f' }}>
                    내용 *
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="응원 메시지를 작성하세요"
                    className="min-h-[300px] w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm" style={{ color: '#2d5f4f' }}>
                      첨부 이미지
                    </label>
                    <span className="text-xs text-gray-500">
                      최대 10개, 파일당 5MB 이하
                    </span>
                  </div>

                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400">
                    <Upload className="h-6 w-6" />
                    <span>이미지 추가</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={updateMutation.isPending}
                    />
                  </label>

                  {loadingImages && (
                    <div className="text-center py-4 text-gray-500">
                      이미지를 불러오는 중...
                    </div>
                  )}

                  {!loadingImages && existingImages.length === 0 && newFiles.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      첨부된 이미지가 없습니다
                    </div>
                  )}

                  {!loadingImages && (existingImages.length > 0 || newFiles.length > 0) && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {/* 기존 이미지 (서버에서 불러온 것) */}
                      {existingImages.map((image, idx) => {
                        const imageUrl = imageUrls.get(image.id);
                        return (
                          <div
                            key={`existing-${image.id}`}
                            className="group relative h-32 w-full overflow-hidden rounded-lg border border-gray-300"
                          >
                            {imageUrl && (
                              <img
                                src={imageUrl}
                                alt={`이미지 ${idx + 1}`}
                                className="absolute inset-0 z-0 h-full w-full select-none object-cover pointer-events-none"
                                onError={(e) => {
                                  console.warn('[CheerEdit] 이미지 로드 실패 URL:', imageUrl);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div
                              className={`absolute inset-0 z-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${
                                imageUrl ? 'hidden' : ''
                              }`}
                            >
                              <ImageIcon className="h-8 w-8" />
                              <span className="mt-1 text-xs">로딩 중...</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(image.id)}
                              className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                              disabled={updateMutation.isPending || deletingImageId === image.id}
                              title="이미지 삭제"
                            >
                              {deletingImageId === image.id ? (
                                <span className="text-[10px] font-semibold">삭제</span>
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 px-2 py-1 text-center text-xs text-white">
                              이미지 {idx + 1}
                            </div>
                          </div>
                        );
                      })}

                      {/* 새로 추가된 파일 (아직 업로드 안 됨) */}
                      {newFilePreviews.map(({ file, url }, index) => (
                        <div
                          key={`new-${index}`}
                          className="group relative h-32 w-full overflow-hidden rounded-lg border border-green-300"
                        >
                          <img
                            src={url}
                            alt={file.name}
                            className="absolute inset-0 z-0 h-full w-full select-none object-cover pointer-events-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(index)}
                            className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition hover:bg-red-700"
                            disabled={updateMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute top-2 left-2 z-10 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
                            새 이미지
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
