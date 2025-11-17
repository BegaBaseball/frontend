import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getFallbackTeamColor, useCheerStore } from '../store/cheerStore';
import ImagePicker from './ImagePicker';
import { uploadPostImages } from '../api/images';
import { createPost } from '../api/cheer';
import { toast } from 'sonner';

export default function CheerWrite() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedPostId, upsertPost } = useCheerStore();
  const user = useAuthStore((state) => state.user);
  const favoriteTeam = user?.favoriteTeam ?? null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  return (
    <div className="min-h-screen bg-white">

      <div className="border-b bg-gray-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cheer')}
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h2 style={{ color: '#2d5f4f' }}>응원글 작성</h2>
          </div>
          <Button
            onClick={handleSubmit}
            className="text-white"
            style={{ backgroundColor: '#2d5f4f' }}
            disabled={
              createMutation.isPending || 
              !favoriteTeam || 
              !title.trim() || 
              !content.trim()
            }
          >
            {createMutation.isPending ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
              이미지 (선택사항)
            </label>
            <ImagePicker
              maxImages={10}
              maxSizeMB={5}
              onImagesSelected={handleImagesSelected}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              disabled={createMutation.isPending}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
