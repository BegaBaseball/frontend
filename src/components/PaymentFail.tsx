import { useSearchParams, useNavigate } from 'react-router-dom';
import { clearPendingPayment, loadPendingPayment } from '../utils/payment';
import { isDirectTradeMode } from '../utils/paymentMode';
import { Button } from './ui/button';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const directTradeMode = isDirectTradeMode();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');
  const displayMessage = directTradeMode
    ? '직거래 모드에서는 앱 내 결제 실패 화면을 사용하지 않습니다. 신청 화면에서 다시 진행해주세요.'
    : (message ?? '결제가 취소되었거나 오류가 발생했습니다.');

  const pending = loadPendingPayment();

  // 결제 모드에서는 현재 실패한 결제 orderId와 일치할 때만 세션 클리어
  // 직거래 모드에서는 남아있는 결제 세션을 항상 정리
  if (pending && (directTradeMode || pending.orderId === orderId)) {
    clearPendingPayment();
  }

  const handleRetry = () => {
    if (pending) {
      navigate(`/mate/${pending.partyId}/apply`);
    } else {
      navigate('/mate');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <div className="text-5xl">{directTradeMode ? 'ℹ️' : '❌'}</div>
      <h2 className="text-xl font-bold text-gray-800">
        {directTradeMode ? '직거래 모드 안내' : '결제에 실패했습니다'}
      </h2>
      <p className="text-gray-600 text-center">{displayMessage}</p>
      {code && !directTradeMode && (
        <p className="text-sm text-gray-400">오류 코드: {code}</p>
      )}
      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={() => navigate('/mate')}>
          목록으로
        </Button>
        <Button onClick={handleRetry}>다시 시도</Button>
      </div>
    </div>
  );
}
