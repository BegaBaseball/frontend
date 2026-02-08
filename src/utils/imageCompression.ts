import imageCompression from 'browser-image-compression';

/**
 * 이미지 압축 옵션
 */
export interface CompressionOptions {
  /** 최대 파일 크기 (MB) - 기본값: 1MB */
  maxSizeMB?: number;
  /** 최대 너비/높이 (px) - 기본값: 1920px */
  maxWidthOrHeight?: number;
  /** 압축 품질 (0~1) - 기본값: 0.8 */
  initialQuality?: number;
  /** WebWorker 사용 여부 - 기본값: true */
  useWebWorker?: boolean;
}

/** 기본 압축 설정 */
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  initialQuality: 0.8,
  useWebWorker: true,
};

/**
 * 단일 이미지 압축
 * @param file 원본 이미지 파일
 * @param options 압축 옵션
 * @returns 압축된 이미지 파일
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // 이미 충분히 작은 파일은 압축 건너뛰기
  const maxSizeMB = options.maxSizeMB ?? DEFAULT_OPTIONS.maxSizeMB;
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  const compressionOptions = {
    maxSizeMB: options.maxSizeMB ?? DEFAULT_OPTIONS.maxSizeMB,
    maxWidthOrHeight: options.maxWidthOrHeight ?? DEFAULT_OPTIONS.maxWidthOrHeight,
    initialQuality: options.initialQuality ?? DEFAULT_OPTIONS.initialQuality,
    useWebWorker: options.useWebWorker ?? DEFAULT_OPTIONS.useWebWorker,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  };

  try {
    const originalSize = file.size;
    const compressedFile = await imageCompression(file, compressionOptions);
    const compressedSize = compressedFile.size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    // 압축된 파일에 원본 파일명 유지
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error(`[ImageCompression] ${file.name} 압축 실패:`, error);
    // 압축 실패 시 원본 반환
    return file;
  }
}

/**
 * 여러 이미지 일괄 압축 (병렬 처리)
 * @param files 원본 이미지 파일 배열
 * @param options 압축 옵션
 * @param onProgress 진행 상황 콜백 (선택)
 * @returns 압축된 이미지 파일 배열
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const total = files.length;
  let completed = 0;

  // 병렬 처리로 성능 개선 (최대 3개 동시 처리)
  const CONCURRENCY = 3;
  const results: File[] = new Array(files.length);

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (file, idx) => {
        const compressed = await compressImage(file, options);
        completed++;
        onProgress?.(completed, total);
        return { index: i + idx, file: compressed };
      })
    );
    batchResults.forEach(({ index, file }) => {
      results[index] = file;
    });
  }

  return results;
}

/**
 * 파일 크기를 읽기 쉬운 형식으로 변환
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * 이미지 파일인지 확인
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 지원되는 이미지 형식인지 확인
 */
export function isSupportedImageType(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return supportedTypes.includes(file.type);
}
