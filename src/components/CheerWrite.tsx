import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import ImagePicker from './ImagePicker';
import { useCheerWrite } from '../hooks/useCheerWrite';

export default function CheerWrite() {
  const {
    favoriteTeam,
    title,
    setTitle,
    content,
    setContent,
    selectedFiles,
    isSubmitting,
    handleImagesSelected,
    handleRemoveFile,
    handleSubmit,
    handleCancel,
  } = useCheerWrite();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
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
            disabled={isSubmitting || !favoriteTeam || !title.trim() || !content.trim()}
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Title */}
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

          {/* Content */}
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

          {/* Images */}
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
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}