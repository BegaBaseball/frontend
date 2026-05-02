import type { ChangeEvent } from 'react';

import {
  MateAlertCircleIcon,
  MateCheckCircleIcon,
  MateLoaderIcon,
  MateTicketIcon,
} from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateTicketStepProps {
  isScanning: boolean;
  ticketFile: File | null;
  fileErrorMessage: string;
  errorType: 'scan' | 'matches' | 'submit' | null;
  retry: () => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  goNext: () => void;
}

export default function MateCreateTicketStep({
  isScanning,
  ticketFile,
  fileErrorMessage,
  errorType,
  retry,
  onFileUpload,
  updateFormData,
  goNext,
}: MateCreateTicketStepProps) {
  const isScanFailed = errorType === 'scan' && Boolean(ticketFile);

  return (
    <div className="space-y-6">
      <h2 className="mb-4 text-xl text-primary sm:mb-6 sm:text-2xl">
        티켓 인증
      </h2>

      <div className="space-y-4">
        <FieldLabel>예매내역 스크린샷</FieldLabel>
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors sm:p-8 ${isScanning
            ? 'border-primary bg-slate-50 dark:bg-card/60'
            : isScanFailed
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : ticketFile
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-300 dark:border-border bg-slate-50 dark:bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
        >
          <input
            type="file"
            id="ticketFile"
            accept="image/*"
            onChange={onFileUpload}
            className="hidden"
            disabled={isScanning}
            aria-label="티켓 이미지 업로드"
          />
          <label
            htmlFor="ticketFile"
            tabIndex={isScanning ? -1 : 0}
            role="button"
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !isScanning) {
                event.preventDefault();
                document.getElementById('ticketFile')?.click();
              }
            }}
            className={`cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg ${isScanning ? 'pointer-events-none' : ''}`}
          >
            {isScanning ? (
              <div className="flex flex-col items-center gap-3">
                <MateLoaderIcon className="h-12 w-12 animate-spin text-primary sm:h-16 sm:w-16" />
                <p className="text-base font-bold text-primary sm:text-lg">AI가 티켓을 분석 중...</p>
                <p className="text-[16px] text-muted-foreground sm:text-base">경기 정보를 자동으로 추출합니다</p>
              </div>
            ) : isScanFailed ? (
              <div className="flex flex-col items-center gap-3">
                <MateAlertCircleIcon className="h-12 w-12 text-red-500 sm:h-16 sm:w-16" />
                <p className="break-all text-base font-bold text-red-700 dark:text-red-300 sm:text-lg">
                  {ticketFile?.name}
                </p>
                <p className="text-[16px] font-semibold text-red-600 dark:text-red-400 sm:text-base">
                  파일 업로드 완료, AI 분석 실패
                </p>
                <p className="text-[16px] text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
              </div>
            ) : ticketFile ? (
              <div className="flex flex-col items-center gap-3">
                <MateCheckCircleIcon className="h-12 w-12 text-green-500 sm:h-16 sm:w-16" />
                <p className="break-all text-base font-bold text-green-700 dark:text-green-400 sm:text-lg">
                  {ticketFile.name}
                </p>
                <p className="text-[16px] text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <MateTicketIcon className="h-12 w-12 text-primary sm:h-16 sm:w-16" />
                <p className="text-base font-bold text-primary sm:text-lg">티켓 사진으로 자동 입력</p>
                <p className="text-[16px] text-gray-500">JPG, PNG (최대 10MB)</p>
              </div>
            )}
          </label>
        </div>
        {fileErrorMessage && (
          <div
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-[16px] font-semibold text-red-700 dark:text-red-300">
              {fileErrorMessage}
            </p>
          </div>
        )}
        {errorType === 'scan' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={isScanning}
          >
            다시 시도
          </Button>
        )}
      </div>

      <Alert>
        <MateAlertCircleIcon className="w-4 h-4" />
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 text-[16px]">
            <li>티켓 사진을 올리면 AI가 경기 정보를 자동으로 입력합니다</li>
            <li>예매번호와 좌석 정보가 명확히 보여야 합니다</li>
            <li>개인정보는 가려서 업로드해주세요</li>
            <li className="font-semibold text-primary">티켓 업로드는 파티 생성 필수 조건입니다</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col items-center gap-3 mt-4 border-t pt-4 border-dashed border-gray-200">
        <p className="text-[16px] text-gray-500">OCR이 실패하면 같은 파일 또는 다른 파일로 다시 시도해주세요.</p>
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              updateFormData({
                gameDate: '2026-05-23',
                gameTime: '17:00',
                homeTeam: 'doosan',
                awayTeam: 'lg',
                stadium: '잠실야구장',
                section: '',
                cheeringSide: 'HOME',
                seatCategory: '일반/시야',
                seatDetail: '1루 네이비석 305블록 12열 15번',
                maxParticipants: 1,
                ticketPrice: 25000,
                reservationNumber: 'T-1234567890',
                ticketFile: new File([''], 'test-ticket.jpg', { type: 'image/jpeg' }),
              });
              goNext();
            }}
            className="text-[16px] text-gray-300 hover:text-gray-500 transition-colors"
          >
            (테스트 데이터로 채우기)
          </button>
        )}
      </div>
    </div>
  );
}
