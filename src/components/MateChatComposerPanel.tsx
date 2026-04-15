import type { ChangeEvent, FormEvent, RefObject } from 'react';

import {
  MateCloseIcon,
  MateImageIcon,
  MateInfoIcon,
  MateLoaderIcon,
  MateSendIcon,
} from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  mateSectionCardClass,
} from '../utils/mateFlowUi';

interface MateChatComposerPanelProps {
  chatImageInputId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  messageText: string;
  imagePreviewUrl: string | null;
  isUploadingImage: boolean;
  isConnected: boolean;
  onMessageTextChange: (value: string) => void;
  onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenImagePicker: () => void;
  onCancelImageSelection: () => void;
  onSubmit: (event: FormEvent) => void;
}

export default function MateChatComposerPanel({
  chatImageInputId,
  fileInputRef,
  messageText,
  imagePreviewUrl,
  isUploadingImage,
  isConnected,
  onMessageTextChange,
  onImageSelect,
  onOpenImagePicker,
  onCancelImageSelection,
  onSubmit,
}: MateChatComposerPanelProps) {
  return (
    <>
      <Card className={`mt-4 p-3 sm:p-4 ${mateSectionCardClass}`}>
        {imagePreviewUrl && (
          <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-border dark:bg-secondary/80">
            <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
            {isUploadingImage ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <MateLoaderIcon className="h-6 w-6 animate-spin text-white" />
              </div>
            ) : (
              <button
                type="button"
                onClick={onCancelImageSelection}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
              >
                <MateCloseIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <input
            id={chatImageInputId}
            type="file"
            accept="image/*"
            className="sr-only"
            ref={fileInputRef}
            onChange={onImageSelect}
            onClick={(event) => {
              event.currentTarget.value = '';
            }}
            disabled={isUploadingImage}
            aria-label="채팅 이미지 업로드"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isUploadingImage}
            onClick={onOpenImagePicker}
            className="shrink-0"
            aria-label="이미지 업로드"
          >
            <MateImageIcon className="h-4 w-4" />
          </Button>
          <Input
            value={messageText}
            onChange={(event) => onMessageTextChange(event.target.value)}
            placeholder={isConnected ? '메시지를 입력하세요...' : '연결 재시도 중... (전송은 가능합니다)'}
            className="min-w-0 flex-1"
            disabled={isUploadingImage}
          />
          <Button
            type="submit"
            disabled={(!messageText.trim() && !imagePreviewUrl) || isUploadingImage}
            className="shrink-0 bg-primary px-4 text-white sm:px-6"
          >
            {isUploadingImage ? (
              <MateLoaderIcon className="h-4 w-4 animate-spin" />
            ) : (
              <MateSendIcon className="h-4 w-4" />
            )}
          </Button>
        </form>
      </Card>

      <Alert className={`mt-4 ${mateSectionCardClass}`}>
        <MateInfoIcon className="h-4 w-4" />
        <AlertDescription className="text-[16px]">
          <ul className="list-disc list-inside space-y-1">
            <li>경기 당일까지 채팅에서 만날 위치와 시간을 확정해두세요.</li>
            <li>개인정보나 결제 민감 정보는 과도하게 공유하지 마세요.</li>
            <li>체크인 단계가 열리면 이 화면 위의 체크인 버튼으로 바로 이어질 수 있습니다.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </>
  );
}
