import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { CheckCircle, MapPin, Calendar, Users, ChevronLeft, Loader2, User } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';

export default function MateCheckIn() {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { selectedParty } = useMateStore();

  const [isChecking, setIsChecking] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userResponse = await fetch('http://localhost:8080/api/auth/mypage', {
          credentials: 'include',
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setCurrentUserName(userData.data.name);
          
          const userIdResponse = await fetch(
            `http://localhost:8080/api/users/email-to-id?email=${encodeURIComponent(userData.data.email)}`,
            { credentials: 'include' }
          );
          
          if (userIdResponse.ok) {
            const userIdData = await userIdResponse.json();
            setCurrentUserId(userIdData.data || userIdData);
          }
        }
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
      }
    };

    fetchUser();
  }, []);

  // 체크인 현황 불러오기
  useEffect(() => {
    if (!selectedParty) return;

    const fetchCheckInStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8080/api/checkin/party/${selectedParty.id}`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          setCheckInStatus(data);
        }
      } catch (error) {
        console.error('체크인 현황 불러오기 실패:', error);
      }
    };

    fetchCheckInStatus();
    // 5초마다 체크인 현황 갱신
    const interval = setInterval(fetchCheckInStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedParty]);

  if (!selectedParty || !currentUserId) {
    return null;
  }

  const isHost = String(selectedParty.hostId) === String(currentUserId);
  const myCheckIn = checkInStatus.find(c => String(c.userId) === String(currentUserId));
  const isCheckedIn = !!myCheckIn;

  // 전체 참여자 수 계산 (호스트 + 승인된 참여자)
  const totalParticipants = selectedParty.currentParticipants;
  const checkedInCount = checkInStatus.length;
  const allCheckedIn = checkedInCount === totalParticipants;

  const handleCheckIn = async () => {
    setIsChecking(true);

    try {
      // 위치 확인 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const checkInData = {
        partyId: parseInt(selectedParty.id),
        userId: currentUserId,
        userName: currentUserName,
        location: selectedParty.stadium,
      };


      const response = await fetch('http://localhost:8080/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(checkInData),
      });

      if (response.ok) {
        const result = await response.json();
        
        // 체크인 현황 다시 불러오기
        const statusResponse = await fetch(
          `http://localhost:8080/api/checkin/party/${selectedParty.id}`,
          { credentials: 'include' }
        );

        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setCheckInStatus(data);
        }

        alert('체크인이 완료되었습니다!');
      } else {
        const error = await response.text();
        console.error('체크인 실패:', error);
        alert('체크인에 실패했습니다.');
      }
    } catch (error) {
      console.error('체크인 중 오류:', error);
      alert('체크인 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = () => {
    alert('경기 관람이 완료되었습니다!');
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
                  {checkedInCount}/{totalParticipants}명 체크인 완료
                </p>
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
                  <li>모든 참여자가 체크인해야 보증금이 정산됩니다</li>
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
                  체크인 시간: {new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR')}
                </p>
              </div>

              {allCheckedIn && (
                <Alert className="mb-6 border-green-200 bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-800">
                    모든 참여자가 체크인을 완료했습니다!<br/>
                    보증금이 정산되었습니다.
                  </AlertDescription>
                </Alert>
              )}
            </Card>

            {/* Participant Status */}
            <Card className="p-6 mb-6">
              <h3 className="mb-4" style={{ color: '#2d5f4f' }}>
                참여자 체크인 현황
              </h3>
              <div className="space-y-3">
                {/* 호스트 */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  checkInStatus.some(c => String(c.userId) === String(selectedParty.hostId))
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {checkInStatus.some(c => String(c.userId) === String(selectedParty.hostId)) ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>{selectedParty.hostName} (호스트)</span>
                  </div>
                  <span className={`text-sm ${
                    checkInStatus.some(c => String(c.userId) === String(selectedParty.hostId))
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {checkInStatus.some(c => String(c.userId) === String(selectedParty.hostId))
                      ? '체크인 완료'
                      : '대기 중'}
                  </span>
                </div>

                {/* 본인 */}
                {!isHost && (
                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    isCheckedIn ? 'bg-green-50' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {isCheckedIn ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span>나 (본인)</span>
                    </div>
                    <span className={`text-sm ${
                      isCheckedIn ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {isCheckedIn ? '체크인 완료' : '대기 중'}
                    </span>
                  </div>
                )}

                {/* 다른 참여자들 */}
                {checkInStatus
                  .filter(c => 
                    String(c.userId) !== String(currentUserId) && 
                    String(c.userId) !== String(selectedParty.hostId)
                  )
                  .map((checkIn, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span>{checkIn.userName}</span>
                      </div>
                      <span className="text-sm text-green-600">체크인 완료</span>
                    </div>
                  ))}
              </div>
            </Card>

            {allCheckedIn && (
              <Button
                onClick={handleComplete}
                variant="outline"
                className="w-full"
                size="lg"
              >
                확인
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}