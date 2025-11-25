// CheerWrite.tsx
import { ArrowLeft, X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { useAuthStore } from '../store/authStore';
import { useCheerWrite } from '../hooks/useCheerWrite';

export default function CheerWrite() {
  const favoriteTeam = useAuthStore((state) => state.user?.favoriteTeam) ?? null;

  const {
    title,
    setTitle,
    content,
    setContent,
    newFilePreviews,
    isDragging,
    isSubmitting,
    handleFileSelect,
    handleRemoveNewFile,
    handleSubmit,
    handleCancel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCheerWrite(favoriteTeam);

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
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>
      </div>

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
            <div className="flex items-center justify-between">
              <label className="block text-sm" style={{ color: '#2d5f4f' }}>
                첨부 이미지
              </label>
              <span className="text-xs text-gray-500">
                최대 10개, 파일당 5MB 이하
              </span>
            </div>

            {/* Upload Area */}
            <label
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-gray-500 transition-colors ${
                isDragging ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="h-6 w-6" />
              <span>클릭 또는 드래그하여 이미지 추가</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
            </label>

            {/* Image Grid */}
            {newFilePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {newFilePreviews.map(({ file, url }, index) => (
                  <div
                    key={`new-${index}`}
                    className="group relative h-32 w-full overflow-hidden rounded-lg border"
                  >
                    <img
                      src={url}
                      alt={file.name}
                      className="h-full w-full select-none object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(index)}
                      className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white shadow-sm transition-all hover:bg-black/75"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" strokeWidth={3} />
                    </button>
                    <div className="absolute top-1.5 left-1.5 z-10 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
                      새 이미지
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}