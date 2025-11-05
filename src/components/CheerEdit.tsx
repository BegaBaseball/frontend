import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Card } from './ui/card';
import Navbar from './Navbar';
import { useNavigationStore } from '../store/navigationStore';
import { getTeamNameById, useCheerStore } from '../store/cheerStore';
import { useAuthStore } from '../store/authStore';
import { getPost, updatePost } from '../api/cheer';
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
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content ?? '');
      setImages(post.images ?? []);
    }
  }, [post]);

  const hasAccess = post
    ? favoriteTeam
      ? (post.teamId ? post.teamId === favoriteTeam : (post.team ?? '') === favoriteTeam)
      : false
    : false;

  const updateMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) =>
      updatePost(post!.id, payload),
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleSubmit = () => {
    if (!post) return;
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }
    updateMutation.mutate({ title: title.trim(), content: content.trim() });
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
                  <label className="block text-sm" style={{ color: '#2d5f4f' }}>
                    첨부 이미지
                  </label>
                  <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400">
                    <ImageIcon className="h-6 w-6" />
                    이미지 추가 (미리보기용)
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`preview-${index}`}
                          className="h-24 w-full rounded-lg object-cover"
                        />
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

