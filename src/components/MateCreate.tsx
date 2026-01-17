import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Ticket, Loader2 } from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { api } from '../utils/api';
import { STADIUMS, TEAMS } from '../utils/constants';
import { mapBackendPartyToFrontend } from '../utils/mate';
import VerificationRequiredDialog from './VerificationRequiredDialog';
import StadiumSeatMap from './StadiumSeatMap';

export default function MateCreate() {
  const navigate = useNavigate();
  const {
    createStep,
    formData,
    formErrors,
    setCreateStep,
    updateFormData,
    setFormError,
    resetForm,
    validateDescription,
    addParty,
    setSelectedParty,
  } = useMateStore();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setCurrentUserName(userData.data.name);

      const userId = await api.getUserIdByEmail(userData.data.email);
      const id = userId.data || userId;
      setCurrentUserId(id);

      // 소셜 연동 여부 확인 - 미연동 시 알림
      try {
        const socialResult = await api.checkSocialVerified(id);
        if (socialResult.data === false) {
          setShowVerificationDialog(true);
        }
      } catch {
        // 확인 실패 시 무시 (나중에 제출 시 다시 체크됨)
      }
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
    }
  };

  const handleDescriptionChange = (text: string) => {
    updateFormData({ description: text });
    const error = validateDescription(text);
    setFormError('description', error);
  };

  // Step 1: 티켓 업로드 + OCR
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError('ticketFile', '파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFormError('ticketFile', '이미지 파일만 업로드 가능합니다.');
      return;
    }

    updateFormData({ ticketFile: file });
    setFormError('ticketFile', '');
    setIsScanning(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${aiServiceUrl}/vision/ticket`, {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const ticketInfo = await response.json();
        const updates: any = {};

        if (ticketInfo.date) {
          updates.gameDate = ticketInfo.date;
        }
        if (ticketInfo.time) {
          // HH:MM 형식으로 변환 (HH:MM:SS 제거)
          updates.gameTime = ticketInfo.time.substring(0, 5);
        }
        if (ticketInfo.stadium) {
          const matchedStadium = STADIUMS.find(s =>
            s.includes(ticketInfo.stadium) || ticketInfo.stadium.includes(s)
          );
          if (matchedStadium) {
            updates.stadium = matchedStadium;
          } else {
            updates.stadium = ticketInfo.stadium;
          }
        }
        if (ticketInfo.homeTeam) {
          const matchedTeam = TEAMS.find(t =>
            t.name.includes(ticketInfo.homeTeam) || ticketInfo.homeTeam.includes(t.name)
          );
          if (matchedTeam) {
            updates.homeTeam = matchedTeam.id;
          }
        }
        if (ticketInfo.awayTeam) {
          const matchedTeam = TEAMS.find(t =>
            t.name.includes(ticketInfo.awayTeam) || ticketInfo.awayTeam.includes(t.name)
          );
          if (matchedTeam) {
            updates.awayTeam = matchedTeam.id;
          }
        }
        if (ticketInfo.section || ticketInfo.row || ticketInfo.seat) {
          updates.section = [ticketInfo.section, ticketInfo.row, ticketInfo.seat]
            .filter(Boolean)
            .join(' ');
        }

        updateFormData(updates);

        // 자동으로 다음 단계로 이동
        setTimeout(() => {
          setCreateStep(2);
        }, 500);
      }
    } catch (error) {
      console.error('Ticket OCR error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const canProceedToStep = (targetStep: number) => {
    if (targetStep === 2) {
      return formData.ticketFile !== null;
    }
    if (targetStep === 3) {
      return formData.gameDate && formData.homeTeam && formData.awayTeam && formData.stadium;
    }
    if (targetStep === 4) {
      return formData.section && formData.maxParticipants > 0 && formData.ticketPrice > 0;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.ticketFile) {
      setFormError('ticketFile', '예매내역 인증이 필요합니다.');
      return;
    }

    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      setFormError('description', '소개글을 10자 이상 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const partyData = {
        hostId: currentUserId,
        hostName: currentUserName,
        // hostBadge는 백엔드에서 기본값 처리
        hostRating: 5.0,
        teamId: formData.homeTeam,
        gameDate: formData.gameDate, // "YYYY-MM-DD" 형식
        gameTime: formData.gameTime || '18:30', // "HH:MM" 형식 (LocalTime으로 변환됨)
        stadium: formData.stadium,
        homeTeam: formData.homeTeam,
        awayTeam: formData.awayTeam,
        section: formData.section,
        maxParticipants: formData.maxParticipants,
        description: formData.description,
        ticketImageUrl: null,
        ticketPrice: formData.ticketPrice,
      };

      const createdParty = await api.createParty(partyData);
      const mappedParty = mapBackendPartyToFrontend(createdParty);

      addParty(mappedParty);
      setSelectedParty(mappedParty);
      resetForm();
      alert('파티가 생성되었습니다!');
      navigate(`/mate/${mappedParty.id}`);
    } catch (error: any) {
      console.error('파티 생성 중 오류:', error);
      if (error.response?.status === 403 || error.message?.includes('403')) {
        setShowVerificationDialog(true);
      } else {
        alert(error.message || '파티 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (createStep === 1) {
      resetForm();
      navigate('/mate');
    } else {
      setCreateStep(createStep - 1);
    }
  };

  const progressValue = (createStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 style={{ color: '#2d5f4f' }} className="mb-2">
            직관메이트 파티 만들기
          </h1>
          <p className="text-gray-600">단계별로 파티 정보를 입력해주세요</p>
        </div>

        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">단계 {createStep} / 4</span>
            <span className="text-sm" style={{ color: '#2d5f4f' }}>
              {progressValue.toFixed(0)}%
            </span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        <Card className="p-8">
          {/* Step 1: 티켓 업로드 + OCR */}
          {createStep === 1 && (
            <div className="space-y-6">
              <h2 className="mb-6" style={{ color: '#2d5f4f' }}>
                티켓 인증
              </h2>

              <div className="space-y-4">
                <Label>예매내역 스크린샷</Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isScanning
                    ? 'border-[#2d5f4f] bg-[#f8fcfb]'
                    : formData.ticketFile
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-[#2d5f4f] bg-[#f8fcfb] hover:bg-[#e8f5f0]'
                    }`}
                >
                  <input
                    type="file"
                    id="ticketFile"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isScanning}
                  />
                  <label htmlFor="ticketFile" className={`cursor-pointer ${isScanning ? 'pointer-events-none' : ''}`}>
                    {isScanning ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-16 h-16 text-[#2d5f4f] animate-spin" />
                        <p className="text-[#2d5f4f] font-bold text-lg">AI가 티켓을 분석 중...</p>
                        <p className="text-gray-500">경기 정보를 자동으로 추출합니다</p>
                      </div>
                    ) : formData.ticketFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <p className="text-green-700 dark:text-green-400 font-bold text-lg">
                          {formData.ticketFile.name}
                        </p>
                        <p className="text-gray-500">클릭하여 다른 파일 선택</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Ticket className="w-16 h-16 text-[#2d5f4f]" />
                        <p className="text-[#2d5f4f] font-bold text-lg">티켓 사진으로 자동 입력</p>
                        <p className="text-gray-500">JPG, PNG (최대 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
                {formErrors.ticketFile && (
                  <p className="text-sm text-red-500">{formErrors.ticketFile}</p>
                )}
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>티켓 사진을 올리면 AI가 경기 정보를 자동으로 입력합니다</li>
                    <li>예매번호와 좌석 정보가 명확히 보여야 합니다</li>
                    <li>개인정보는 가려서 업로드해주세요</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: 경기 정보 확인/수정 */}
          {createStep === 2 && (
            <div className="space-y-6">
              <h2 className="mb-2" style={{ color: '#2d5f4f' }}>
                경기 정보 확인
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                AI가 추출한 정보를 확인하고 필요시 수정하세요
              </p>

              <div className="space-y-2">
                <Label htmlFor="gameDate">경기 날짜 *</Label>
                <Input
                  id="gameDate"
                  type="date"
                  value={formData.gameDate}
                  onChange={(e) => updateFormData({ gameDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameTime">경기 시간</Label>
                <Input
                  id="gameTime"
                  type="time"
                  value={formData.gameTime}
                  onChange={(e) => updateFormData({ gameTime: e.target.value })}
                  placeholder="18:30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>홈 팀 *</Label>
                  <Select
                    value={formData.homeTeam}
                    onValueChange={(value: string) => updateFormData({ homeTeam: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="홈 팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAMS.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={team.id} size="sm" />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>원정 팀 *</Label>
                  <Select
                    value={formData.awayTeam}
                    onValueChange={(value: string) => updateFormData({ awayTeam: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="원정 팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAMS.filter((team) => team.id !== formData.homeTeam).map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamLogo teamId={team.id} size="sm" />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>구장 *</Label>
                <Select
                  value={formData.stadium}
                  onValueChange={(value: string) => updateFormData({ stadium: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="구장 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {STADIUMS.map((stadium) => (
                      <SelectItem key={stadium} value={stadium}>
                        {stadium}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: 좌석 정보 */}
          {createStep === 3 && (
            <div className="space-y-6">
              <h2 className="mb-6" style={{ color: '#2d5f4f' }}>
                좌석 정보
              </h2>

              {/* 시각적 좌석 맵 */}
              <StadiumSeatMap
                stadium={formData.stadium}
                selectedSection={formData.section}
                onSectionSelect={(section) => updateFormData({ section })}
              />

              <div className="space-y-2">
                <Label htmlFor="section">좌석 상세 (선택 또는 직접 입력) *</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => updateFormData({ section: e.target.value })}
                  placeholder="예: 블루석 A구역 5열 23번"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="participants">모집 인원 *</Label>
                <Select
                  value={formData.maxParticipants.toString()}
                  onValueChange={(value: string) =>
                    updateFormData({ maxParticipants: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2명 (본인 포함)</SelectItem>
                    <SelectItem value="3">3명 (본인 포함)</SelectItem>
                    <SelectItem value="4">4명 (본인 포함)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketPrice">티켓 가격 (1인당) *</Label>
                <div className="relative">
                  <Input
                    id="ticketPrice"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.ticketPrice || ''}
                    onChange={(e) => updateFormData({ ticketPrice: parseInt(e.target.value) || 0 })}
                    placeholder="예: 12000"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    원
                  </span>
                </div>
                {formData.ticketPrice > 0 && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      참여자는 티켓 가격 <span style={{ color: '#2d5f4f' }}>{formData.ticketPrice.toLocaleString()}원</span> + 보증금 10,000원을 결제합니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Step 4: 소개글 + 제출 */}
          {createStep === 4 && (
            <div className="space-y-6">
              <h2 className="mb-6" style={{ color: '#2d5f4f' }}>
                파티 소개
              </h2>

              <div className="space-y-2">
                <Label htmlFor="description">소개글 *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="함께 야구를 즐길 메이트에게 하고 싶은 말을 작성해주세요..."
                  className="min-h-[150px]"
                />
                <div className="flex justify-between text-sm">
                  <span className={formErrors.description ? 'text-red-500' : 'text-gray-500'}>
                    {formErrors.description || '10자 이상 200자 이하'}
                  </span>
                  <span className="text-gray-500">
                    {formData.description.length}/200
                  </span>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>금칙어나 비방 표현은 사용할 수 없습니다</li>
                    <li>전화번호, 이메일 등 연락처는 입력할 수 없습니다</li>
                    <li>매칭 후 채팅을 통해 소통할 수 있습니다</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {createStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCreateStep(createStep - 1)}
                className="flex-1"
              >
                이전
              </Button>
            )}
            {createStep < 4 ? (
              <Button
                onClick={() => setCreateStep(createStep + 1)}
                disabled={!canProceedToStep(createStep + 1)}
                className="flex-1 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!formData.description || formData.description.length < 10 || isSubmitting}
                className="flex-1 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                {isSubmitting ? '생성 중...' : '파티 만들기'}
              </Button>
            )}
          </div>
        </Card>
      </div>
      <VerificationRequiredDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
      />
    </div>
  );
}