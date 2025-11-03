import { useState } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { CheckCircle, MapPin, Calendar, Users, ChevronLeft, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateCheckIn() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedParty, checkIn, updateParty } = useMateStore();
  const [isChecking, setIsChecking] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  if (!selectedParty) {
    return null;
  }

  const handleCheckIn = async () => {
    setIsChecking(true);

    // Simulate location verification
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const record = {
      partyId: selectedParty.id,
      userId: 'currentUser',
      checkedInAt: new Date().toISOString(),
      location: selectedParty.stadium,
    };

    checkIn(record);
    updateParty(selectedParty.id, { status: 'CHECKED_IN' });
    setIsChecking(false);
    setIsCheckedIn(true);
  };

  const handleComplete = () => {
    updateParty(selectedParty.id, { status: 'COMPLETED' });
    alert('경기 관람이 완료되었습니다! 보증금이 환불됩니다.');
    setCurrentView('mate');
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
          체크인
        </h1>
        <p className="text-gray-600 mb-8">
          경기장에 도착하셨나요? 체크인하여 참여를 인증하세요
        </p>

        {/* Party Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <TeamLogo teamId={selectedParty.teamId} size="lg" />
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

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">좌석</p>
                <p>{selectedParty.section}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">참여 인원</p>
                <p>
                  {selectedParty.currentParticipants}/{selectedParty.maxParticipants}명
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">호스트</p>
                <p>{selectedParty.hostName}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Check-in Status */}
        {!isCheckedIn ? (
          <>
            <Alert className="mb-6">
              <MapPin className="w-4 h-4" />
              <AlertDescription>
                <p className="mb-2">체크인 안내</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>경기장 근처에서만 체크인이 가능합니다</li>
                  <li>위치 정보를 확인하여 인증합니다</li>
                  <li>모든 참여자가 체크인해야 정산이 진행됩니다</li>
                  <li>체크인하지 않으면 노쇼로 처리됩니다</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Card className="p-8 text-center mb-6">
              <div className="mb-6">
                <div
                  className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#e8f5f0' }}
                >
                  <MapPin className="w-12 h-12" style={{ color: '#2d5f4f' }} />
                </div>
                <h3 className="mb-2" style={{ color: '#2d5f4f' }}>
                  체크인 준비 완료
                </h3>
                <p className="text-gray-600">
                  경기장에 도착하셨다면 체크인해주세요
                </p>
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={isChecking}
                className="w-full text-white"
                size="lg"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    위치 확인 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    체크인하기
                  </>
                )}
              </Button>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-8 text-center mb-6 border-2 border-green-500">
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-100">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="mb-2 text-green-700">
                  체크인 완료!
                </h3>
                <p className="text-gray-600 mb-4">
                  경기를 즐기고 오세요
                </p>
                <p className="text-sm text-gray-500">
                  체크인 시간: {new Date().toLocaleString('ko-KR')}
                </p>
              </div>

              <Alert className="mb-6">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <p className="text-sm">
                    모든 참여자가 체크인을 완료하면 자동으로 정산이 진행됩니다.
                    보증금은 48시간 이내에 환불됩니다.
                  </p>
                </AlertDescription>
              </Alert>
            </Card>

            {/* Participant Status */}
            <Card className="p-6 mb-6">
              <h3 className="mb-4" style={{ color: '#2d5f4f' }}>
                참여자 체크인 현황
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>나 (본인)</span>
                  </div>
                  <span className="text-sm text-green-600">체크인 완료</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    <span>{selectedParty.hostName} (호스트)</span>
                  </div>
                  <span className="text-sm text-gray-500">대기 중</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleComplete}
              variant="outline"
              className="w-full"
              size="lg"
            >
              경기 관람 완료
            </Button>
          </>
        )}

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 경기 종료 후 "경기 관람 완료" 버튼을 눌러주세요. 정산이 최종 완료됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
