import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { CheckCircle, MapPin, Calendar, Users, ChevronLeft, Loader2 } from 'lucide-react';
import { useMatePartyFromRoute } from '../hooks/useMatePartyFromRoute';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import LoadingSpinner from './LoadingSpinner';
import { api } from '../utils/api';
import { CheckIn } from '../types/mate';
import { useAuthStore } from '../store/authStore';
import { getApiErrorMessage } from '../utils/errorUtils';

export default function MateCheckIn() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    party: selectedParty,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);

  const [isChecking, setIsChecking] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<CheckIn[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [userRetryCount, setUserRetryCount] = useState(0);
  const qrSessionId = searchParams.get('sessionId')?.trim() || undefined;

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      setIsLoadingUser(true);
      setUserLoadError(null);

      if (authUserId && authUserId > 0) {
        if (isMounted) {
          setCurrentUserId(authUserId);
          setIsLoadingUser(false);
        }
        return;
      }

      try {
        const userData = await api.getCurrentUser();
        const profileId = Number(userData?.data?.id);
        if (Number.isFinite(profileId) && profileId > 0) {
          if (isMounted) {
            setCurrentUserId(profileId);
          }
          return;
        }
        throw new Error('사용자 ID를 확인할 수 없습니다.');
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        if (isMounted) {
          setCurrentUserId(null);
          setUserLoadError(getApiErrorMessage(error, '사용자 정보를 확인하지 못했습니다. 다시 시도해주세요.'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    void fetchUser();

    return () => {
      isMounted = false;
    };
  }, [authUserId, userRetryCount]);

  // 체크인 현황 불러오기
  useEffect(() => {
    if (!selectedParty) return;
    let isMounted = true;

    const fetchCheckInStatus = async () => {
      try {
        const data = await api.getCheckInsByParty(selectedParty.id);
        if (isMounted) setCheckInStatus(data);
      } catch (error) {
        if (isMounted) console.error('체크인 현황 불러오기 실패:', error);
      }
    };

    fetchCheckInStatus();
    // 5초마다 체크인 현황 갱신
    const interval = setInterval(fetchCheckInStatus, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedParty]);

  if ((isPartyLoading && !selectedParty) || isLoadingUser) {
    return <LoadingSpinner text="파티 정보를 불러오는 중입니다..." />;
  }

  if (partyError || !selectedParty || !currentUserId) {
    const resolvedError = partyError || userLoadError || '파티 정보를 찾을 수 없습니다.';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <Alert>
            <AlertDescription>{resolvedError}</AlertDescription>
          </Alert>
          {userLoadError && (
            <Button
              variant="outline"
              onClick={() => setUserRetryCount((count) => count + 1)}
              className="mt-4 mr-2"
            >
              다시 시도
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate('/mate')}
            className="mt-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
        </div>
      </div>
    );
  }

  const isHost = selectedParty.hostId === currentUserId;
  const myCheckIn = checkInStatus.find(c => c.userId === currentUserId);
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
        partyId: selectedParty.id,
        userId: currentUserId,
        location: selectedParty.stadium,
        ...(qrSessionId ? { qrSessionId } : {}),
      };

      await api.createCheckIn(checkInData);

      // 체크인 현황 다시 불러오기
      const data = await api.getCheckInsByParty(selectedParty.id);
      setCheckInStatus(data);

      toast.success('체크인이 완료되었습니다!');
    } catch (error) {
      console.error('체크인 중 오류:', error);
      toast.error(getApiErrorMessage(error, '체크인 중 오류가 발생했습니다.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = () => {
    toast.success('경기 관람이 완료되었습니다!');
    navigate('/mate');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          뒤로
        </Button>

        <h1 className="mb-2 text-primary">
          체크인
        </h1>
        <p className="text-gray-600 mb-8">
          경기장에 도착하셨나요? 체크인하여 참여를 인증하세요
        </p>
        {isPartyRevalidating && (
          <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              최신 파티 정보를 다시 확인하고 있습니다.
            </AlertDescription>
          </Alert>
        )}
        {qrSessionId && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 text-sm">
              QR 코드로 체크인 링크가 연결되었습니다.
            </AlertDescription>
          </Alert>
        )}

        {/* Party Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <TeamLogo teamId={selectedParty.teamId} size="lg" />
            <div className="flex-1">
              <h3 className="mb-1 text-primary">
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
                  <MapPin className="w-12 h-12 text-primary" />
                </div>
                <h3 className="mb-2 text-primary">
                  체크인 준비 완료
                </h3>
                <p className="text-gray-600">
                  경기장에 도착하셨다면 체크인해주세요
                </p>
              </div>

              <Button
                onClick={handleCheckIn}
                disabled={isChecking}
                className="w-full text-white bg-primary"
                size="lg"
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
                    모든 참여자가 체크인을 완료했습니다!<br />
                    보증금이 정산되었습니다.
                  </AlertDescription>
                </Alert>
              )}
            </Card>

            {/* Participant Status */}
            <Card className="p-6 mb-6">
              <h3 className="mb-4 text-primary">
                참여자 체크인 현황
              </h3>
              <div className="space-y-3">
                {/* 호스트 */}
                <div className={`flex items-center justify-between p-3 rounded-lg ${checkInStatus.some(c => c.userId === selectedParty.hostId)
                    ? 'bg-green-50'
                    : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-3">
                    {checkInStatus.some(c => c.userId === selectedParty.hostId) ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                    <span>{selectedParty.hostName} (호스트)</span>
                  </div>
                  <span className={`text-sm ${checkInStatus.some(c => c.userId === selectedParty.hostId)
                      ? 'text-green-600'
                      : 'text-gray-500'
                    }`}>
                    {checkInStatus.some(c => c.userId === selectedParty.hostId)
                      ? '체크인 완료'
                      : '대기 중'}
                  </span>
                </div>

                {/* 본인 */}
                {!isHost && (
                  <div className={`flex items-center justify-between p-3 rounded-lg ${isCheckedIn ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      {isCheckedIn ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span>나 (본인)</span>
                    </div>
                    <span className={`text-sm ${isCheckedIn ? 'text-green-600' : 'text-gray-500'
                      }`}>
                      {isCheckedIn ? '체크인 완료' : '대기 중'}
                    </span>
                  </div>
                )}

                {/* 다른 참여자들 */}
                {checkInStatus
                  .filter(c =>
                    c.userId !== currentUserId &&
                    c.userId !== selectedParty.hostId
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
