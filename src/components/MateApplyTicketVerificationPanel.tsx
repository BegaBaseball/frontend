import { useState, type ChangeEvent } from 'react';

import { toast } from 'sonner';

import { analyzeTicket, type TicketInfo } from '../api/ticket';
import { getApiErrorMessage } from '../utils/errorUtils';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import {
  MateCheckCircleIcon,
  MateLoaderIcon,
  MateShieldIcon,
  MateTicketIcon,
} from './MateIcons';
import { Button } from './ui/button';

interface MateApplyTicketVerificationPanelProps {
  gameDate: string;
  ticketVerified: boolean;
  ticketInfo: TicketInfo | null;
  onVerified: (ticketInfo: TicketInfo) => void;
  onReset: () => void;
}

const sanitizeUserFacingMessage = (message: string, fallback: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return fallback;
  }
  if (/^[a-z0-9_:-]+$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
};

export default function MateApplyTicketVerificationPanel({
  gameDate,
  ticketVerified,
  ticketInfo,
  onVerified,
  onReset,
}: MateApplyTicketVerificationPanelProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleTicketUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsScanning(true);
    try {
      const result = await analyzeTicket(file);
      onVerified(result);

      if (result.verificationToken) {
        if (result.date && result.date !== gameDate) {
          toast.warning('티켓의 날짜가 파티의 경기 날짜와 다릅니다. 확인해주세요.');
        }
        toast.success('티켓 인증이 완료되었습니다! 🎫');
      } else {
        toast.warning('티켓에서 충분한 정보를 추출하지 못했습니다. 더 선명한 사진으로 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Ticket OCR error:', error);
      const fallbackMessage = '티켓 분석에 실패했습니다. 다시 시도해주세요.';
      toast.error(sanitizeUserFacingMessage(getApiErrorMessage(error, fallbackMessage), fallbackMessage));
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <MateTicketIcon className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-primary">티켓 인증 (선택)</h3>
        {ticketVerified && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-body font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-300">
            <MateCheckCircleIcon className="w-3.5 h-3.5" />
            인증 완료
          </span>
        )}
      </div>
      <p className="mb-4 text-body text-gray-500 dark:text-white">
        티켓 사진을 올리면 호스트에게 인증 배지가 표시되어 승인율이 높아집니다.
      </p>

      {ticketVerified ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-2 flex items-center gap-2">
              <MateShieldIcon className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">티켓 인증 완료</span>
            </div>
            {ticketInfo && (
              <div className="space-y-1.5 text-body text-green-600 dark:text-green-300">
                {ticketInfo.date && <p>📅 {ticketInfo.date}</p>}
                {ticketInfo.stadium && <p>🏟️ {formatStadiumDisplayName(ticketInfo.stadium)}</p>}
                {(ticketInfo.section || ticketInfo.row || ticketInfo.seat) && (
                  <p>💺 {[ticketInfo.section, ticketInfo.row, ticketInfo.seat].filter(Boolean).join(' ')}</p>
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className="text-body text-gray-500 dark:text-white"
            onClick={onReset}
          >
            다시 인증하기
          </Button>
        </div>
      ) : (
        <div
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors sm:p-6 ${isScanning
            ? 'border-primary bg-slate-50 dark:bg-card/60'
            : 'border-slate-300 dark:border-border hover:border-primary hover:bg-slate-50 dark:hover:bg-secondary'
            }`}
        >
          <input
            type="file"
            id="ticketVerifyFile"
            accept="image/*"
            onChange={handleTicketUpload}
            className="hidden"
            disabled={isScanning}
          />
          <label htmlFor="ticketVerifyFile" className={`block cursor-pointer ${isScanning ? 'pointer-events-none' : ''}`}>
            {isScanning ? (
              <div className="flex flex-col items-center gap-2">
                <MateLoaderIcon className="w-10 h-10 text-primary animate-spin" />
                <p className="font-semibold text-primary">AI가 티켓을 분석 중...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <MateTicketIcon className="w-10 h-10 text-primary" />
                <p className="font-semibold text-primary">티켓 사진 업로드</p>
                <p className="text-body text-gray-400">JPG, PNG (최대 10MB)</p>
              </div>
            )}
          </label>
        </div>
      )}
    </>
  );
}
