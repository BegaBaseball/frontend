import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { ChevronLeft, MessageSquare, CreditCard, Shield, AlertTriangle } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateApply() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { 
    selectedParty, 
    applyToParty, 
    applicationForm, 
    updateApplicationForm,
    resetApplicationForm,
  } = useMateStore();

  if (!selectedParty) {
    return null;
  }

  const isSelling = selectedParty.status === 'SELLING';
  const baseDeposit = 10000;
  const fullPrice = selectedParty.price || 50000;

  const handleSubmit = () => {
    const application = {
      id: Date.now().toString(),
      partyId: selectedParty.id,
      applicantId: 'currentUser',
      applicantName: '나',
      applicantBadge: 'new' as const,
      applicantRating: 5.0,
      message: applicationForm.message,
      depositAmount: applicationForm.paymentType === 'deposit' ? baseDeposit : fullPrice,
      isPaid: false,
      isApproved: false,
      isRejected: false,
      createdAt: new Date().toISOString(),
    };

    applyToParty(application);
    resetApplicationForm();

    alert('신청이 완료되었습니다! 호스트의 승인을 기다려주세요.');
    setCurrentView('mateDetail');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="mate" />

      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => setCurrentView('mateDetail')}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <h1 style={{ color: '#2d5f4f' }} className="mb-2">
          {isSelling ? '티켓 구매' : '파티 참여 신청'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isSelling
            ? '결제 정보를 입력하고 티켓을 구매하세요'
            : '호스트에게 전달할 메시지를 작성해주세요'}
        </p>

        {/* Party Summary */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <TeamLogo teamId={selectedParty.teamId} size="md" />
            <div className="flex-1">
              <h3 className="mb-1" style={{ color: '#2d5f4f' }}>
                {selectedParty.stadium}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedParty.gameDate} {selectedParty.gameTime}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">좌석</p>
              <p>{selectedParty.section}</p>
            </div>
            <div>
              <p className="text-gray-500">호스트</p>
              <p>{selectedParty.hostName}</p>
            </div>
          </div>
        </Card>

        {/* Message Section */}
        {!isSelling && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <h3 style={{ color: '#2d5f4f' }}>소개 메시지</h3>
            </div>
            <Label htmlFor="message" className="mb-2 block">
              호스트에게 전달할 메시지
            </Label>
            <Textarea
              id="message"
              value={applicationForm.message}
              onChange={(e) => updateApplicationForm({ message: e.target.value })}
              placeholder="자기소개와 함께 야구를 즐기고 싶은 마음을 전해주세요..."
              className="min-h-[120px] mb-2"
            />
            <p className="text-sm text-gray-500">
              {applicationForm.message.length}/200
            </p>
          </Card>
        )}

        {/* Payment Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5" style={{ color: '#2d5f4f' }} />
            <h3 style={{ color: '#2d5f4f' }}>결제 방식</h3>
          </div>

          <RadioGroup
            value={applicationForm.paymentType}
            onValueChange={(value: 'deposit' | 'full') =>
              updateApplicationForm({ paymentType: value })
            }
          >
            {!isSelling && (
              <div className="flex items-start space-x-3 mb-4 p-4 border rounded-lg">
                <RadioGroupItem value="deposit" id="deposit" />
                <div className="flex-1">
                  <Label htmlFor="deposit" className="cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span>보증금</span>
                      <span style={{ color: '#2d5f4f' }}>{baseDeposit.toLocaleString()}원</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      매칭 시 전액 환불됩니다
                    </p>
                  </Label>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-4 border rounded-lg">
              <RadioGroupItem value="full" id="full" />
              <div className="flex-1">
                <Label htmlFor="full" className="cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <span>{isSelling ? '티켓 구매' : '전액 결제'}</span>
                    <span style={{ color: '#2d5f4f' }}>{fullPrice.toLocaleString()}원</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {isSelling ? '티켓을 바로 구매합니다' : '즉시 매칭됩니다'}
                  </p>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </Card>

        {/* Security Notice */}
        <Alert className="mb-6">
          <Shield className="w-4 h-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>결제는 BEGA 안전거래를 통해 진행됩니다</li>
              <li>호스트 승인 후 채팅으로 소통할 수 있습니다</li>
              <li>노쇼 시 패널티가 부여될 수 있습니다</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Warning for selling tickets */}
        {isSelling && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              티켓 구매 후 환불이 불가능합니다. 경기 날짜와 좌석을 확인해주세요.
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isSelling && applicationForm.message.length < 10}
          className="w-full text-white"
          size="lg"
          style={{ backgroundColor: '#2d5f4f' }}
        >
          {applicationForm.paymentType === 'deposit'
            ? `보증금 ${baseDeposit.toLocaleString()}원 결제하기`
            : `${fullPrice.toLocaleString()}원 결제하기`}
        </Button>

        {!isSelling && applicationForm.message.length < 10 && (
          <p className="text-sm text-gray-500 text-center mt-2">
            메시지를 10자 이상 입력해주세요
          </p>
        )}
      </div>
    </div>
  );
}
