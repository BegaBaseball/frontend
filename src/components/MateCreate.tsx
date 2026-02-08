import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from './common/OptimizedImage';
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
import { useAuthStore } from '../store/authStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { api } from '../utils/api';
import { STADIUMS, TEAMS, TEAM_COLORS_MAP } from '../utils/constants';
import { mapBackendPartyToFrontend } from '../utils/mate';
import VerificationRequiredDialog from './VerificationRequiredDialog';
// import { getMatchesForDate, MatchInfo } from '../utils/mockSchedule';
export interface MatchInfo {
  id: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
}
import { SEAT_CATEGORIES, SeatCategory, KBO_STADIUMS } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import { getEstimatedPrice } from '../utils/priceHelper';
import { format } from 'date-fns';

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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<MatchInfo[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Price Automation
  useEffect(() => {
    if (createStep === 3 && formData.stadium && formData.seatCategory && formData.gameDate) {
      const estimated = getEstimatedPrice(formData.stadium, formData.seatCategory as SeatCategory, formData.gameDate);
      if (estimated) {
        updateFormData({ ticketPrice: estimated });
      }
    }
  }, [createStep, formData.stadium, formData.seatCategory, formData.gameDate]);


  const fetchCurrentUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setCurrentUserName(userData.data.name);

      const userIdResponse = await api.getUserIdByEmail(userData.data.email);
      const id = userIdResponse.data;
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
    } catch (error: any) {
      console.error('사용자 정보 가져오기 실패:', error);
      if (error.status === 401) {
        useAuthStore.getState().logout();
        useAuthStore.getState().setShowLoginRequiredDialog(true);
      }
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

      const aiServiceUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:8001';
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
          const ocrSeat = [ticketInfo.section, ticketInfo.row, ticketInfo.seat]
            .filter(Boolean)
            .join(' ');
          updates.section = ocrSeat;
          updates.seatDetail = ocrSeat;
        }
        if (ticketInfo.peopleCount) {
          updates.maxParticipants = ticketInfo.peopleCount;
        }
        if (ticketInfo.price) {
          updates.ticketPrice = ticketInfo.price;
        }
        if (ticketInfo.reservationNumber) {
          updates.reservationNumber = ticketInfo.reservationNumber;
        }

        updateFormData(updates);

        // 자동으로 다음 단계로 이동
        setTimeout(() => {
          setCreateStep(2);
        }, 500);
      }
    } catch (error) {
      console.error('Ticket OCR error:', error);
      setFormError('ticketFile', '이미지 분석에 실패했습니다. 직접 입력해주세요.');
      // 실패해도 isScanning이 false가 되면 수동으로 다음 단계로 이동 가능
    } finally {
      setIsScanning(false);
    }
  };

  const canProceedToStep = (targetStep: number) => {
    // 스캔 중이면 이동 불가
    if (isScanning) return false;

    if (targetStep === 2) {
      return formData.ticketFile !== null;
    }
    if (targetStep === 3) {
      return formData.gameDate && formData.homeTeam && formData.awayTeam && formData.stadium;
    }
    if (targetStep === 4) {
      return (formData.seatDetail || formData.section) && formData.maxParticipants > 0 && formData.ticketPrice > 0;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!formData.ticketFile) {
      setFormError('ticketFile', '예매내역 인증이 필요합니다.');
      return;
    }

    if (!currentUserId) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!formData.description || formData.description.length < 10) {
      setFormError('description', '소개글을 10자 이상 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Compose section from structured fields
      const composedSection = formData.seatDetail
        ? [
          formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
          formData.seatCategory,
          formData.seatDetail,
        ].filter(Boolean).join(' ')
        : formData.section; // Fallback to raw section (from OCR)

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
        section: composedSection,
        maxParticipants: formData.maxParticipants,
        description: formData.description,
        ticketImageUrl: null, // Never send blob: URLs to backend
        ticketPrice: formData.ticketPrice,
        reservationNumber: formData.reservationNumber,
      };

      const createdParty = await api.createParty(partyData);
      const mappedParty = mapBackendPartyToFrontend(createdParty);

      addParty(mappedParty);
      setSelectedParty(mappedParty);
      resetForm();
      toast.success('파티가 생성되었습니다!');
      navigate(`/mate/${mappedParty.id}`);
    } catch (error: any) {
      if (error.status === 403 || error.response?.status === 403 || error.message?.includes('403')) {
        console.warn('Verification required (403)');
        setShowVerificationDialog(true);
      } else {
        console.error('파티 생성 중 오류:', error);
        toast.error(error.message || '파티 생성 중 오류가 발생했습니다.');
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

  const handleSkipTicket = () => {
    // Clear ticket file but proceed
    updateFormData({ ticketFile: null });
    setCreateStep(2);
  };

  const selectMatch = (match: MatchInfo) => {
    updateFormData({
      gameTime: match.gameTime,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      stadium: match.stadium
    });
  };

  const mapTeamId = (backendId: string): string => {
    if (!backendId) return '';
    const code = backendId.toUpperCase();
    const mapping: Record<string, string> = {
      'LG': 'lg',
      'KT': 'kt',
      'NC': 'nc',
      'SSG': 'ssg',
      'SK': 'ssg',
      'OB': 'doosan',
      'SS': 'samsung',
      'LT': 'lotte',
      'HT': 'kia',
      'KIA': 'kia',
      'HH': 'hanwha',
      'WO': 'kiwoom',
      'KW': 'kiwoom',
    };
    return mapping[code] || backendId.toLowerCase();
  };

  useEffect(() => {
    const fetchMatches = async () => {
      if (createStep === 2 && formData.gameDate) {
        setIsLoadingMatches(true);
        try {
          const response = await api.getKboSchedule(formData.gameDate);
          // HomePageGameDto를 MatchInfo 형식으로 변환
          const matches: MatchInfo[] = (response || []).map((game) => ({
            id: game.gameId,
            gameTime: game.time,
            stadium: game.stadium,
            homeTeam: mapTeamId(game.homeTeam),
            awayTeam: mapTeamId(game.awayTeam)
          }));
          setAvailableMatches(matches);
        } catch (error) {
          console.error('Failed to fetch matches:', error);
          setAvailableMatches([]);
        } finally {
          setIsLoadingMatches(false);
        }
      }
    };

    fetchMatches();
  }, [createStep, formData.gameDate]);


  const getAvailableCategoryKeys = (): SeatCategory[] => {
    const stadiumConfig = Object.values(KBO_STADIUMS).find(
      (s) => s.name === formData.stadium
    );

    if (stadiumConfig) {
      return Array.from(new Set(stadiumConfig.zones.map((z) => z.category)));
    }

    return ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING', 'COMFORT', 'SPECIAL', 'OUTFIELD'];
  };

  const availableCategoryKeys = getAvailableCategoryKeys();

  const progressValue = (createStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <OptimizedImage
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
                    ? 'border-primary bg-slate-50 dark:bg-slate-900/50'
                    : formData.ticketFile
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                >
                  <input
                    type="file"
                    id="ticketFile"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isScanning}
                    aria-label="티켓 이미지 업로드"
                  />
                  <label
                    htmlFor="ticketFile"
                    tabIndex={isScanning ? -1 : 0}
                    role="button"
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isScanning) {
                        e.preventDefault();
                        document.getElementById('ticketFile')?.click();
                      }
                    }}
                    className={`cursor-pointer block focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] focus:ring-offset-2 rounded-lg ${isScanning ? 'pointer-events-none' : ''}`}
                  >
                    {isScanning ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
                        <p className="text-primary font-bold text-lg">AI가 티켓을 분석 중...</p>
                        <p className="text-muted-foreground">경기 정보를 자동으로 추출합니다</p>
                      </div>
                    ) : formData.ticketFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <p className="text-green-700 dark:text-green-400 font-bold text-lg">
                          {formData.ticketFile.name}
                        </p>
                        <p className="text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
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

              {/* Skip Button */}
              <div className="flex flex-col items-center gap-3 mt-4 border-t pt-4 border-dashed border-gray-200">
                <Button
                  variant="ghost"
                  className="text-gray-500 hover:text-[#2d5f4f] font-medium text-sm"
                  onClick={handleSkipTicket}
                >
                  티켓이 아직 없으신가요? <span className="underline ml-1">직접 입력하기</span>
                </Button>

                {/* Dev Only: Test Data Button */}
                {import.meta.env.DEV && (
                  <button
                    onClick={() => {
                      const testData = {
                        gameDate: '2026-05-23',
                        gameTime: '17:00',
                        homeTeam: 'doosan',
                        awayTeam: 'lg',
                        stadium: '잠실야구장',
                        section: '',
                        cheeringSide: 'HOME' as const,
                        seatCategory: '일반/시야',
                        seatDetail: '1루 네이비석 305블록 12열 15번',
                        maxParticipants: 1,
                        ticketPrice: 25000,
                        reservationNumber: 'T-1234567890',
                        ticketFile: new File([""], "test-ticket.jpg", { type: "image/jpeg" })
                      };
                      updateFormData(testData);
                      setCreateStep(2);
                    }}
                    className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    (테스트 데이터로 채우기)
                  </button>
                )}
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-6">
              <h2 className="mb-2" style={{ color: '#2d5f4f' }}>
                경기 선택
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                관람하실 경기를 선택해주세요
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="gameDate">경기 날짜 *</Label>
                  <Input
                    id="gameDate"
                    type="date"
                    value={formData.gameDate}
                    onChange={(e) => updateFormData({ gameDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                {/* Match List */}
                {formData.gameDate && (
                  <div className="grid gap-3 pt-2">
                    {isLoadingMatches ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#2d5f4f] mb-2" />
                        <p className="text-sm text-gray-500">경기를 불러오는 중입니다...</p>
                      </div>
                    ) : availableMatches.length > 0 ? (
                      availableMatches.map((match) => {
                        const isSelected = formData.homeTeam === match.homeTeam && formData.awayTeam === match.awayTeam;
                        const homeColor = TEAM_COLORS_MAP[match.homeTeam.toLowerCase()] || '#333';
                        const awayColor = TEAM_COLORS_MAP[match.awayTeam.toLowerCase()] || '#333';

                        return <div
                          key={match.id}
                          onClick={() => selectMatch(match)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden ${isSelected
                            ? 'border-[#2d5f4f] bg-green-50 dark:bg-green-900/20 ring-2 ring-[#2d5f4f] ring-offset-1 dark:ring-offset-gray-900'
                            : 'border-gray-200 dark:border-gray-700 hover:border-[#2d5f4f] hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                          <div className="flex justify-between items-center relative z-10">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="text-center w-16 text-sm font-bold text-gray-500 dark:text-gray-400">
                                {match.gameTime}
                              </div>
                              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                              <div className="flex items-center gap-3 flex-1 justify-center">
                                <span className="font-bold flex items-center gap-2 dark:text-gray-200">
                                  <TeamLogo teamId={match.awayTeam} size="sm" />
                                  {TEAMS.find(t => t.id === match.awayTeam)?.name}
                                </span>
                                <span className="text-gray-400 text-xs">VS</span>
                                <span className="font-bold flex items-center gap-2 dark:text-gray-200">
                                  {TEAMS.find(t => t.id === match.homeTeam)?.name}
                                  <TeamLogo teamId={match.homeTeam} size="sm" />
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 ml-4 min-w-[60px] text-right">
                              {match.stadium}
                            </div>
                          </div>
                          {/* Background Gradient for selected state */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#2d5f4f]/5 dark:bg-[#2d5f4f]/20 pointer-events-none"></div>
                          )}
                        </div>

                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        경기가 없는 날입니다 😴 <br />
                        <span className="text-xs">다른 날짜를 선택해주세요</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 좌석 정보 */}
          {createStep === 3 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold mb-6" style={{ color: '#2d5f4f' }}>
                좌석 정보
              </h2>

              {/* 1. Cheering Side Selection (Visual Blocks) */}
              <div className="space-y-3">
                <Label className="text-lg font-bold">응원 진영 선택 *</Label>
                <div className="grid grid-cols-3 gap-3 h-28">
                  {/* Home Team */}
                  <button
                    onClick={() => updateFormData({ cheeringSide: 'HOME' })}
                    className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${formData.cheeringSide === 'HOME'
                      ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    style={{
                      backgroundColor: formData.cheeringSide === 'HOME' ? (TEAM_COLORS_MAP[mapTeamId(formData.homeTeam)] || '#2d5f4f') : 'transparent',
                      borderColor: TEAM_COLORS_MAP[mapTeamId(formData.homeTeam)] || '#2d5f4f',
                      borderWidth: formData.cheeringSide === 'HOME' ? 0 : 2,
                      color: formData.cheeringSide === 'HOME' ? 'white' : (TEAM_COLORS_MAP[mapTeamId(formData.homeTeam)] || 'inherit'),
                    }}
                  >
                    <div className="mb-2">
                      <TeamLogo teamId={mapTeamId(formData.homeTeam)} size={44} />
                    </div>
                    <span className="font-bold text-lg leading-tight">
                      {TEAMS.find(t => t.id === mapTeamId(formData.homeTeam))?.name || '홈팀'}
                    </span>
                    <div className="text-[11px] font-medium opacity-80 mt-1">홈 팀 응원</div>
                  </button>

                  {/* Neutral */}
                  <button
                    onClick={() => updateFormData({ cheeringSide: 'NEUTRAL' })}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 ${formData.cheeringSide === 'NEUTRAL'
                      ? 'bg-gray-500 text-white ring-4 ring-gray-300 ring-offset-2 scale-[1.02] border-transparent shadow-md'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                  >
                    <span className="text-3xl mb-1">😐</span>
                    <span className="font-bold text-lg">상관없음</span>
                    <div className="text-[11px] font-medium opacity-80 mt-1">중립</div>
                  </button>

                  {/* Away Team */}
                  <button
                    onClick={() => updateFormData({ cheeringSide: 'AWAY' })}
                    className={`relative flex flex-col items-center justify-center rounded-xl transition-all duration-200 ${formData.cheeringSide === 'AWAY'
                      ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    style={{
                      backgroundColor: formData.cheeringSide === 'AWAY' ? (TEAM_COLORS_MAP[mapTeamId(formData.awayTeam)] || '#d1d5db') : 'transparent',
                      borderColor: TEAM_COLORS_MAP[mapTeamId(formData.awayTeam)] || '#d1d5db',
                      borderWidth: formData.cheeringSide === 'AWAY' ? 0 : 2,
                      color: formData.cheeringSide === 'AWAY' ? 'white' : (TEAM_COLORS_MAP[mapTeamId(formData.awayTeam)] || 'inherit'),
                    }}
                  >
                    <div className="mb-2">
                      <TeamLogo teamId={mapTeamId(formData.awayTeam)} size={44} />
                    </div>
                    <span className="font-bold text-lg leading-tight">
                      {TEAMS.find(t => t.id === mapTeamId(formData.awayTeam))?.name || '원정팀'}
                    </span>
                    <div className="text-[11px] font-medium opacity-80 mt-1">원정 팀 응원</div>
                  </button>
                </div>
              </div>

              {/* 2. Seat Category (Grid with Descriptions) */}
              <div className="space-y-3">
                <Label className="text-lg font-bold">좌석 종류 (선택)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(SEAT_CATEGORIES)
                    .filter(([k]) => availableCategoryKeys.includes(k as SeatCategory))
                    .map(([k, v]) => {
                      const isSelected = formData.seatCategory === v.label;
                      const descriptions: Record<string, string> = {
                        '응원석': '치어리더와 함께 열정 응원! 🔥',
                        '테이블석': '음식을 편하게 먹을 수 있어요 🍗',
                        '프리미엄': '최고의 시야와 편안함 💎',
                        '익사이팅': '선수들과 가장 가까운 곳 ⚡',
                        '일반/시야': '가성비 좋게 관람해요 👀',
                        '이색좌석': '특별한 경험을 원한다면 ⛺',
                        '외야석': '홈런볼을 잡을 기회! ⚾',
                      };

                      return (
                        <button
                          key={k}
                          onClick={() => updateFormData({ seatCategory: isSelected ? '' : v.label })}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 hover:shadow-sm ${isSelected
                            ? 'border-[#2d5f4f] bg-[#2d5f4f]/5 ring-1 ring-[#2d5f4f]'
                            : 'border-gray-100 hover:border-[#2d5f4f]/50 bg-white dark:bg-gray-800 dark:border-gray-700'
                            }`}
                        >
                          <div className={`p-2 rounded-full text-2xl shrink-0 flex items-center justify-center w-12 h-12 ${isSelected ? 'bg-white' : 'bg-gray-50 dark:bg-gray-700'}`}>
                            {SEAT_ICONS[k as SeatCategory]}
                          </div>
                          <div>
                            <div className={`font-bold ${isSelected ? 'text-[#2d5f4f]' : 'text-gray-900 dark:text-gray-100'}`}>
                              {v.label}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 leading-snug">
                              {descriptions[v.label] || '편안한 관람'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* 3. Seat Detail (Structured Inputs) */}
              <div className="space-y-3">
                <Label className="text-lg font-bold" htmlFor="seatDetail">좌석 상세 *</Label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">구역/블록</label>
                    <div className="relative">
                      <Input
                        placeholder="예: 305"
                        value={formData.seatDetail.split(' ')[0]?.replace('블록', '') || ''}
                        onChange={(e) => {
                          const parts = formData.seatDetail.split(' ');
                          const block = e.target.value;
                          const row = parts[1] || '';
                          const seat = parts[2] || '';
                          updateFormData({ seatDetail: `${block}${block ? '블록' : ''} ${row} ${seat}`.trim() });
                        }}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">블록</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">열</label>
                    <div className="relative">
                      <Input
                        placeholder="예: 12"
                        value={formData.seatDetail.split(' ')[1]?.replace('열', '') || ''}
                        onChange={(e) => {
                          const parts = formData.seatDetail.split(' ');
                          const block = parts[0] || '';
                          const row = e.target.value;
                          const seat = parts[2] || '';
                          updateFormData({ seatDetail: `${block} ${row}${row ? '열' : ''} ${seat}`.trim() });
                        }}
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">열</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">번 (선택)</label>
                    <div className="relative">
                      <Input
                        placeholder="예: 15"
                        value={formData.seatDetail.split(' ')[2]?.replace('번', '') || ''}
                        onChange={(e) => {
                          const parts = formData.seatDetail.split(' ');
                          const block = parts[0] || '';
                          const row = parts[1] || '';
                          const seat = e.target.value;
                          updateFormData({ seatDetail: `${block} ${row} ${seat}${seat ? '번' : ''}`.trim() });
                        }}
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">번</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {(formData.cheeringSide || formData.seatCategory || formData.seatDetail) && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-gray-500">미리보기</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      {[
                        formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                        formData.seatCategory,
                        formData.seatDetail,
                      ].filter(Boolean).join(' ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label id="participants-label" className="text-lg font-bold">모집 인원 *</Label>
                <Select
                  value={formData.maxParticipants.toString()}
                  onValueChange={(value: string) =>
                    updateFormData({ maxParticipants: parseInt(value) })
                  }
                >
                  <SelectTrigger aria-labelledby="participants-label" className="h-12">
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
                <Label htmlFor="ticketPrice" className="text-lg font-bold">티켓 가격 (1인당) *</Label>
                <div className="relative">
                  <Input
                    id="ticketPrice"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.ticketPrice || ''}
                    onChange={(e) => updateFormData({ ticketPrice: parseInt(e.target.value) || 0 })}
                    placeholder="예: 12000"
                    className="pr-12 h-12 text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    원
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 px-1">
                  * 선택하신 <span className="font-bold text-[#2d5f4f]">{formData.seatCategory}</span> 기준 예상 가격입니다. 실제 예매 가격과 다를 수 있습니다.
                </p>
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
                  aria-describedby="description-hint description-count"
                />
                {/* Style Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {['#열정응원🔥', '#공격때_기립🧍', '#조용한관람🤫', '#먹방진심🍗', '#유니폼필수👕', '#직관승요🧚'].map((tag) => (
                    <button
                      key={tag}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-300 hover:bg-[#2d5f4f]/10 dark:hover:bg-[#2d5f4f]/30 hover:text-[#2d5f4f] transition-colors"
                      onClick={() => {
                        if (!formData.description.includes(tag)) {
                          handleDescriptionChange(`${formData.description} ${tag}`.trim());
                        }
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-sm">
                  <span
                    id="description-hint"
                    className={formErrors.description ? 'text-red-500' : 'text-gray-500'}
                  >
                    {formErrors.description || '10자 이상 200자 이하'}
                  </span>
                  <span
                    id="description-count"
                    className="text-gray-500"
                    aria-live="polite"
                    aria-atomic="true"
                  >
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
                onClick={() => setShowConfirmationModal(true)}
                disabled={!formData.description || formData.description.length < 10 || isSubmitting}
                className="flex-1 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                파티 만들기
              </Button>
            )}
          </div>
        </Card>
      </div >

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: '#2d5f4f' }}>파티 생성 확인</DialogTitle>
            <DialogDescription>
              아래 내용을 확인하고 파티를 생성하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Game Info */}
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <TeamLogo teamId={formData.awayTeam} size="sm" />
                <span className="font-bold text-sm">
                  {TEAMS.find(t => t.id === formData.awayTeam)?.name}
                </span>
              </div>
              <span className="text-gray-400 text-xs font-bold">VS</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  {TEAMS.find(t => t.id === formData.homeTeam)?.name}
                </span>
                <TeamLogo teamId={formData.homeTeam} size="sm" />
              </div>
            </div>

            {/* Date/Time/Stadium */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">경기 일시</span>
                <span className="font-medium">
                  {formData.gameDate} {formData.gameTime || '18:30'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">경기장</span>
                <span className="font-medium">{formData.stadium}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">좌석</span>
                <span className="font-medium">
                  {formData.seatDetail
                    ? [
                      formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                      formData.seatCategory,
                      formData.seatDetail,
                    ].filter(Boolean).join(' ')
                    : formData.section}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">모집 인원</span>
                <span className="font-medium">{formData.maxParticipants}명 (본인 포함)</span>
              </div>
            </div>

            {/* Price Info */}
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">티켓 가격</span>
                <span className="font-medium">{formData.ticketPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">보증금</span>
                <span className="font-medium">10,000원</span>
              </div>
              <div className="flex justify-between font-bold" style={{ color: '#2d5f4f' }}>
                <span>총 결제 금액</span>
                <span>{(formData.ticketPrice + 10000).toLocaleString()}원</span>
              </div>
            </div>

            {/* Description Preview */}
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-1">소개글</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {formData.description}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmationModal(false)}
              disabled={isSubmitting}
            >
              수정하기
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              {isSubmitting ? '생성 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VerificationRequiredDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
      />
    </div >
  );
}