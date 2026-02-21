import { useSearchParams, useNavigate } from 'react-router-dom';
import { clearPendingPayment, loadPendingPayment } from '../utils/payment';
import { Button } from './ui/button';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');
  const displayMessage = message ?? '결제가 취소되었거나 오류가 발생했습니다.';

  const pending = loadPendingPayment();

  // 현재 실패한 결제의 orderId와 일치할 때만 세션 클리어
  if (pending && pending.orderId === orderId) {
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
      <div className="text-5xl">❌</div>
      <h2 className="text-xl font-bold text-gray-800">결제에 실패했습니다</h2>
      <p className="text-gray-600 text-center">{displayMessage}</p>
      {code && (
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
