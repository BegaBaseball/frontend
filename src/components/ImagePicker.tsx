import { useRef, useEffect, useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { compressImages, CompressionOptions } from '../utils/imageCompression';

interface ImagePickerProps {
  maxImages?: number;
  maxSizeMB?: number;
  selectedFiles: File[];
  onImagesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
  /** 이미지 압축 활성화 여부 - 기본값: true */
  enableCompression?: boolean;
  /** 압축 옵션 */
  compressionOptions?: CompressionOptions;
}

export default function ImagePicker({
  maxImages = 10,
  maxSizeMB = 5,
  selectedFiles,
  onImagesSelected,
  onRemoveFile,
  disabled,
  enableCompression = true,
  compressionOptions,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 });

  // 현재 preview URLs를 ref로 관리 (cleanup에서 최신값 접근용)
  const previewUrlsRef = useRef<string[]>([]);

  // selectedFiles가 변경될 때 preview URLs 업데이트
  useEffect(() => {
    // 기존 URLs 정리
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));

    // 새로운 URLs 생성
    const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(newUrls);
    previewUrlsRef.current = newUrls;

    // 컴포넌트 언마운트 시 정리
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleSelectFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (!files) return;

    // 원본 파일 크기 제한 (압축 전 최대 10MB까지 허용)
    const maxOriginalSizeMB = enableCompression ? 10 : maxSizeMB;
    const nextFiles = Array.from(files).filter((file) => {
      if (file.size > maxOriginalSizeMB * 1024 * 1024) {
        alert(`${file.name} 파일이 ${maxOriginalSizeMB}MB 제한을 초과했습니다.`);
        return false;
      }
      return true;
    });

    if (selectedFiles.length + nextFiles.length > maxImages) {
      alert(`이미지는 최대 ${maxImages}개까지 선택할 수 있습니다.`);
      return;
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    // 압축이 비활성화된 경우 바로 전달
    if (!enableCompression) {
      onImagesSelected(nextFiles);
      return;
    }

    // 이미지 압축
    setIsCompressing(true);
    setCompressionProgress({ current: 0, total: nextFiles.length });

    try {
      const compressedFiles = await compressImages(
        nextFiles,
        {
          maxSizeMB: 1, // 압축 후 최대 1MB
          maxWidthOrHeight: 1920, // 최대 해상도 1920px
          initialQuality: 0.8,
          ...compressionOptions,
        },
        (current, total) => setCompressionProgress({ current, total })
      );
      onImagesSelected(compressedFiles);
    } catch (error) {
      console.error('이미지 압축 중 오류 발생:', error);
      // 압축 실패 시 원본 전달
      onImagesSelected(nextFiles);
    } finally {
      setIsCompressing(false);
      setCompressionProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          이미지 최대 {maxImages}개{enableCompression ? ' (자동 압축)' : `, 파일당 ${maxSizeMB}MB 이하`}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isCompressing}
        >
          {isCompressing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              압축 중 ({compressionProgress.current}/{compressionProgress.total})
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              이미지 선택
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleSelectFiles}
      />

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {selectedFiles.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border">
              <img src={previewUrls[index]} alt={file.name} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

