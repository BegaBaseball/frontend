// CheerEdit.tsx
import { ArrowLeft, Image as ImageIcon, MessageSquare, X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { useNavigate, useParams } from 'react-router-dom';
import { getTeamNameById } from '../api/cheerApi';
import { useAuthStore } from '../store/authStore';
import { useCheerEdit } from '../hooks/useCheerEdit';

export default function CheerEdit() {
  const navigate = useNavigate();
  const { postId: postIdParam } = useParams();
  const postId = Number(postIdParam);
  const favoriteTeam = useAuthStore((state) => state.user?.favoriteTeam) ?? null;

  const {
    post,
    isLoading,
    isError,
    hasAccess,
    // title, // Removed
    // setTitle, // Removed
    content,
    setContent,
    existingImages,
    newFilePreviews,
    deletingImageId,
    isDragging,
    isSubmitting,
    handleFileSelect,
    handleDeleteExistingImage,
    handleRemoveNewFile,
    handleSubmit,
    handleCancel,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useCheerEdit(postId, favoriteTeam);

  // Redirect if invalid postId
  if (isNaN(postId) || postId === 0) {
    navigate('/cheer');
    return null;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-red-600">
          게시글 정보를 불러오는 중 문제가 발생했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
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
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? '수정 중...' : '수정 완료'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          </div>
        )}

        {/* Content */}
        {!isLoading && post && (
          <>
            {/* No Access */}
            {!hasAccess ? (
              <Card className="rounded-xl bg-white p-12 text-center shadow-sm">
                <div className="mx-auto w-20 rounded-full bg-red-100 p-6">
                  <MessageSquare className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="mt-6 mb-4 text-gray-900">수정 권한이 없습니다</h2>
                <p className="mb-6 text-gray-600 leading-relaxed">
                  이 게시글은{' '}
                  <span className="font-bold" style={{ color: post.teamColor ?? '#2d5f4f' }}>
                    {post.team}
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
              /* Edit Form */
              <div className="space-y-6">
                <div className="space-y-2">
                  {/* Title Input Removed */}
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
                    className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-gray-500 transition-colors ${isDragging ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-gray-400'
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
                  {(existingImages.length > 0 || newFilePreviews.length > 0) && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {/* Existing Images */}
                      {existingImages.map((image, idx) => {
                        const imageUrl = image.url;
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
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div
                              className={`absolute inset-0 z-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${imageUrl ? 'hidden' : ''
                                }`}
                            >
                              <ImageIcon className="h-8 w-8" />
                              <span className="mt-1 text-xs">로딩 중...</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(image.id)}
                              className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white shadow-sm transition-all hover:bg-black/75 disabled:opacity-60"
                              disabled={isSubmitting || deletingImageId === image.id}
                              title="이미지 삭제"
                            >
                              {deletingImageId === image.id ? (
                                <span className="text-[10px] font-semibold">삭제</span>
                              ) : (
                                <X className="h-4 w-4" strokeWidth={3} />
                              )}
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 px-2 py-1 text-center text-xs text-white">
                              이미지 {idx + 1}
                            </div>
                          </div>
                        );
                      })}

                      {/* New Files */}
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
                            className="absolute right-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white shadow-sm transition-all hover:bg-black/75"
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" strokeWidth={3} />
                          </button>
                          <div className="absolute top-1.5 left-1.5 z-10 rounded bg-green-600 px-2 py-0.5 text-xs text-white">
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
