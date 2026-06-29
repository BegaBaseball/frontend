import { MateCheckCircleIcon, MateCloseIcon } from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MateGuidePanelRuntimeProps {
  onClose: () => void;
}

export default function MateGuidePanelRuntime({ onClose }: MateGuidePanelRuntimeProps) {
  return (
    <Card className="mb-7 animate-in slide-in-from-top-2 border border-gray-200/80 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-[#000000] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <MateCheckCircleIcon aria-hidden="true" className="h-4 w-4 text-primary" />
            안전한 직관을 위한 체크포인트
          </h3>
          <ul className="space-y-2 text-body font-bold text-gray-500 dark:text-white">
            <li className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-white">•</span>
              거래 방식과 취소 규칙을 먼저 확인하세요.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-white">•</span>
              티켓 인증 여부와 호스트 평점을 함께 확인하세요.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 dark:text-white">•</span>
              승인 후에는 채팅에서 만남 시간과 장소를 먼저 확정하세요.
            </li>
          </ul>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="이용 가이드 닫기"
          className="text-gray-500 hover:bg-primary/10 hover:text-primary dark:text-white dark:hover:bg-primary/15 dark:hover:text-primary"
          onClick={onClose}
        >
          <MateCloseIcon aria-hidden="true" className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  );
}
