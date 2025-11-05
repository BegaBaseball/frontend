import { useRef } from 'react';
import { X, Upload } from 'lucide-react';

interface ImagePickerProps {
  maxImages?: number;
  maxSizeMB?: number;
  selectedFiles: File[];
  onImagesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
}

export default function ImagePicker({
  maxImages = 10,
  maxSizeMB = 5,
  selectedFiles,
  onImagesSelected,
  onRemoveFile,
  disabled,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (!files) return;

    const nextFiles = Array.from(files).filter((file) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`${file.name} 파일이 ${maxSizeMB}MB 제한을 초과했습니다.`);
        return false;
      }
      return true;
    });

    if (selectedFiles.length + nextFiles.length > maxImages) {
      alert(`이미지는 최대 ${maxImages}개까지 선택할 수 있습니다.`);
      return;
    }

    onImagesSelected(nextFiles);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          이미지 최대 {maxImages}개, 파일당 {maxSizeMB}MB 이하
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
          이미지 선택
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
          {selectedFiles.map((file, index) => {
            const preview = URL.createObjectURL(file);
            return (
              <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border">
                <img src={preview} alt={file.name} className="h-32 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveFile(index)}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

