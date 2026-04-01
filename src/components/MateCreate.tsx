import { type ChangeEvent, type ComponentPropsWithoutRef, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { OptimizedImage } from './common/OptimizedImage';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Ticket, Loader2 } from 'lucide-react';
import { useAuthAccessActions, useAuthSession } from '../store/authStore';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { api, getApiErrorStatus } from '../utils/api';
import { TEAMS } from '../utils/constants';
import { getTeamColorByAnyKey } from '../constants/teams';
import VerificationRequiredDialog from './VerificationRequiredDialog';
import { useMateCreateMachine, type MatchInfo } from '../hooks/useMateCreateMachine';
import { SEAT_CATEGORIES, SeatCategory, KBO_STADIUMS } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import { getEstimatedPrice } from '../utils/priceHelper';
import { validateMateDescription } from '../utils/mateValidation';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { cn } from '../lib/utils';

function FieldLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      className={cn('flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  );
}

export default function MateCreate() {
  const navigate = useNavigate();
  const requireSocialVerification = import.meta.env.VITE_MATE_REQUIRE_SOCIAL_VERIFICATION !== 'false';
  const {
    createStep,
    canGoNext,
    canGoPrev,
    isScanning,
    isSubmitting,
    isLoadingMatches,
    isConfirming,
    isSubmittingError,
    isMatchLoadError,
    availableMatches,
    errorMessage,
    submitErrorStatus,
    errorType,
    createdPartyId,
    formData,
    formErrors,
    uploadTicket,
    updateFormData,
    setFormError,
    goNext,
    goPrev,
    loadMatches,
    submit,
    confirmSubmit,
    cancelSubmit,
    reset,
    retry,
  } = useMateCreateMachine();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const { logout } = useAuthAccessActions();

  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const lastSubmitErrorRef = useRef('');
  const loadedMatchDateRef = useRef('');

  const redirectToLogin = (replace = false) => {
    logout(true);
    navigate(buildLoginPath(getCurrentRelativeUrl()), replace ? { replace: true } : undefined);
  };

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!currentUserId) {
      redirectToLogin(true);
      return;
    }

    if (!requireSocialVerification) {
      return;
    }

    let isMounted = true;

    const verifySocialAccount = async () => {
      try {
        const socialResult = await api.checkSocialVerified(currentUserId);
        if (isMounted && socialResult.data === false) {
          setShowVerificationDialog(true);
        }
      } catch (error: unknown) {
        if (getApiErrorStatus(error) === 401) {
          redirectToLogin(true);
        }
      }
    };

    void verifySocialAccount();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, isAuthLoading, requireSocialVerification]);

  // Price Automation
  useEffect(() => {
    if (createStep === 3 && formData.stadium && formData.seatCategory && formData.gameDate) {
      const estimated = getEstimatedPrice(formData.stadium, formData.seatCategory as SeatCategory, formData.gameDate);
      if (estimated) {
        updateFormData({ ticketPrice: estimated });
      }
    }
  }, [createStep, formData.stadium, formData.seatCategory, formData.gameDate]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [createStep]);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelSubmit();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelSubmit, isConfirming]);

  const handleDescriptionChange = (text: string) => {
    updateFormData({ description: text });
    const error = validateMateDescription(text);
    setFormError('description', error);
  };

  // Step 1: 티켓 업로드 + OCR
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadTicket(file);
  };

  const handleBack = () => {
    if (createStep === 1) {
      reset();
      navigate('/mate');
    } else {
      goPrev();
    }
  };

  const handleSubmit = () => {
    if (!currentUserId) {
      redirectToLogin();
      return;
    }

    submit();
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
      'DB': 'doosan',
      'OB': 'doosan',
      'DO': 'doosan',
      'SS': 'samsung',
      'LT': 'lotte',
      'KIA': 'kia',
      'HT': 'kia',
      'HH': 'hanwha',
      'KH': 'kiwoom',
      'WO': 'kiwoom',
      'KI': 'kiwoom',
      'NX': 'kiwoom',
      'KW': 'kiwoom',
    };
    return mapping[code] || backendId.toLowerCase();
  };

  const fileErrorMessage = errorType === 'scan' ? errorMessage : formErrors.ticketFile;
  const isScanFailed = errorType === 'scan' && Boolean(formData.ticketFile);
  const matchLoadErrorMessage = isMatchLoadError ? errorMessage : '';
  const knownStadiumNames = Array.from(new Set(Object.values(KBO_STADIUMS).map((stadium) => stadium.name)));
  const shouldShowManualMatchInput = createStep === 2
    && Boolean(formData.gameDate)
    && !isLoadingMatches
    && (isMatchLoadError || availableMatches.length === 0);

  useEffect(() => {
    if (createStep !== 2 || !formData.gameDate) {
      if (createStep !== 2) {
        loadedMatchDateRef.current = '';
      } else if (!formData.gameDate) {
        loadedMatchDateRef.current = '';
      }
      return;
    }

    if (loadedMatchDateRef.current === formData.gameDate) {
      return;
    }

    loadedMatchDateRef.current = formData.gameDate;
    loadMatches();
  }, [createStep, formData.gameDate]);

  useEffect(() => {
    if (createdPartyId) {
      toast.success('파티가 생성되었습니다!');
      navigate(`/mate/${createdPartyId}`);
      return;
    }

    if (!isSubmittingError) {
      if (lastSubmitErrorRef.current) {
        lastSubmitErrorRef.current = '';
      }
      return;
    }

    if (submitErrorStatus === 403) {
      setShowVerificationDialog(true);
      return;
    }

    if (submitErrorStatus === 401) {
      redirectToLogin();
      return;
    }

    if (submitErrorStatus && submitErrorStatus !== 403) {
      const errorKey = `${submitErrorStatus}:${errorMessage}`;
      if (lastSubmitErrorRef.current !== errorKey) {
        lastSubmitErrorRef.current = errorKey;
        console.error('파티 생성 중 오류:', errorMessage || 'unknown');
        toast.error(errorMessage || '파티 생성 중 오류가 발생했습니다.');
      }
      return;
    }

    if (errorMessage && lastSubmitErrorRef.current !== errorMessage) {
      lastSubmitErrorRef.current = errorMessage;
      toast.error(errorMessage);
    }
  }, [createdPartyId, isSubmittingError, errorMessage, submitErrorStatus, navigate]);


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
  const isSubmitDisabled = isSubmitting || !formData.description || formData.description.length < 10 || !formData.ticketFile;

  const blockedStepMessage = (() => {
    if (createStep === 1 && !formData.ticketFile) {
      return '티켓 이미지를 업로드해야 다음 단계로 진행할 수 있습니다.';
    }
    if (createStep === 2 && !canGoNext) {
      if (!formData.gameDate) {
        return '경기 날짜를 선택해주세요.';
      }
      if (shouldShowManualMatchInput) {
        return '경기 정보(시간/팀/구장)를 수동 입력해주세요.';
      }
      return '경기 목록에서 관람할 경기를 선택해주세요.';
    }
    if (createStep === 3 && !canGoNext) {
      if (!(formData.seatDetail || formData.section)) {
        return '좌석 상세 정보를 입력해주세요.';
      }
      if (formData.maxParticipants <= 0) {
        return '모집 인원을 선택해주세요.';
      }
      if (formData.ticketPrice <= 0) {
        return '티켓 가격을 입력해주세요.';
      }
      return '필수 항목을 모두 입력해주세요.';
    }
    if (createStep === 4 && isSubmitDisabled) {
      if (!formData.ticketFile) {
        return '티켓 이미지를 업로드해야 파티를 만들 수 있습니다.';
      }
      if (!formData.description || formData.description.length < 10) {
        return '소개글을 10자 이상 입력해주세요.';
      }
      if (formErrors.description) {
        return formErrors.description;
      }
    }
    return '';
  })();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:py-8 relative z-10">
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="-ml-2 mb-3 sm:mb-4 sm:ml-0"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          <h1 className="mb-2 text-3xl sm:text-4xl text-primary">
            직관메이트 파티 만들기
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">단계별로 파티 정보를 입력해주세요</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">단계 {createStep} / 4</span>
            <span className="text-sm text-primary">
              {progressValue.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        <Card className="p-5 sm:p-8">
          {/* Step 1: 티켓 업로드 + OCR */}
          {createStep === 1 && (
            <div className="space-y-6">
              <h2 className="mb-4 text-xl text-primary sm:mb-6 sm:text-2xl">
                티켓 인증
              </h2>

              <div className="space-y-4">
                <FieldLabel>예매내역 스크린샷</FieldLabel>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors sm:p-8 ${isScanning
                    ? 'border-primary bg-slate-50 dark:bg-card/60'
                    : isScanFailed
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : formData.ticketFile
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-slate-300 dark:border-border bg-slate-50 dark:bg-card/60 hover:bg-slate-100 dark:hover:bg-slate-900'
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
                    className={`cursor-pointer block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg ${isScanning ? 'pointer-events-none' : ''}`}
                  >
                    {isScanning ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-12 w-12 animate-spin text-primary sm:h-16 sm:w-16" />
                        <p className="text-base font-bold text-primary sm:text-lg">AI가 티켓을 분석 중...</p>
                        <p className="text-sm text-muted-foreground sm:text-base">경기 정보를 자동으로 추출합니다</p>
                      </div>
                    ) : isScanFailed ? (
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="h-12 w-12 text-red-500 sm:h-16 sm:w-16" />
                        <p className="break-all text-base font-bold text-red-700 dark:text-red-300 sm:text-lg">
                          {formData.ticketFile?.name}
                        </p>
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400 sm:text-base">
                          파일 업로드 완료, AI 분석 실패
                        </p>
                        <p className="text-sm text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
                      </div>
                    ) : formData.ticketFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="h-12 w-12 text-green-500 sm:h-16 sm:w-16" />
                        <p className="break-all text-base font-bold text-green-700 dark:text-green-400 sm:text-lg">
                          {formData.ticketFile.name}
                        </p>
                        <p className="text-sm text-gray-500">클릭 또는 Enter로 다른 파일 선택</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Ticket className="h-12 w-12 text-primary sm:h-16 sm:w-16" />
                        <p className="text-base font-bold text-primary sm:text-lg">티켓 사진으로 자동 입력</p>
                        <p className="text-sm text-gray-500">JPG, PNG (최대 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
                {fileErrorMessage && (
                  <div
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950/30"
                    role="alert"
                    aria-live="assertive"
                  >
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {fileErrorMessage}
                    </p>
                  </div>
                )}
                {errorType === 'scan' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={retry}
                    disabled={isScanning}
                  >
                    다시 시도
                  </Button>
                )}
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>티켓 사진을 올리면 AI가 경기 정보를 자동으로 입력합니다</li>
                    <li>예매번호와 좌석 정보가 명확히 보여야 합니다</li>
                    <li>개인정보는 가려서 업로드해주세요</li>
                    <li className="font-semibold text-primary">티켓 업로드는 파티 생성 필수 조건입니다</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Dev Helper */}
              <div className="flex flex-col items-center gap-3 mt-4 border-t pt-4 border-dashed border-gray-200">
                <p className="text-xs text-gray-500">OCR이 실패하면 같은 파일 또는 다른 파일로 다시 시도해주세요.</p>
                {import.meta.env.DEV && (
                  <button
                    type="button"
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
                      goNext();
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
              <h2 className="mb-2 text-xl text-primary sm:text-2xl">
                경기 선택
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                관람하실 경기를 선택해주세요
              </p>

              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="gameDate">경기 날짜 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
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
                    {matchLoadErrorMessage && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-red-500">{matchLoadErrorMessage}</p>
                        <Button variant="outline" size="sm" onClick={retry}>
                          다시 시도
                        </Button>
                      </div>
                    )}
                    {isLoadingMatches ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                        <p className="text-sm text-gray-500">경기를 불러오는 중입니다...</p>
                      </div>
                    ) : availableMatches.length > 0 ? (
                      availableMatches.map((match) => {
                        const isSelected = formData.homeTeam === match.homeTeam && formData.awayTeam === match.awayTeam;

                        return <div
                          key={match.id}
                          onClick={() => selectMatch(match)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden ${isSelected
                            ? 'border-primary bg-green-50 dark:bg-green-900/20 ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900'
                            : 'border-gray-200 dark:border-border hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
                              <div className="w-full text-left text-sm font-bold text-gray-500 dark:text-gray-300 sm:w-16 sm:text-center">
                                {match.gameTime}
                              </div>
                              <div className="hidden h-8 w-px bg-gray-200 dark:bg-secondary sm:block"></div>
                              <div className="flex items-center justify-between gap-3 sm:flex-1 sm:justify-center">
                                <span className="flex min-w-0 items-center gap-2 text-sm font-bold dark:text-gray-200 sm:text-base">
                                  <TeamLogo teamId={match.awayTeam} size="sm" />
                                  <span className="truncate">{TEAMS.find(t => t.id === match.awayTeam)?.name}</span>
                                </span>
                                <span className="text-gray-400 text-xs">VS</span>
                                <span className="flex min-w-0 items-center gap-2 text-sm font-bold dark:text-gray-200 sm:text-base">
                                  <span className="truncate">{TEAMS.find(t => t.id === match.homeTeam)?.name}</span>
                                  <TeamLogo teamId={match.homeTeam} size="sm" />
                                </span>
                              </div>
                            </div>
                            <div className="min-w-0 text-left text-xs text-gray-400 sm:ml-4 sm:min-w-[60px] sm:text-right">
                              {match.stadium}
                            </div>
                          </div>
                          {/* Background Gradient for selected state */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/5 dark:bg-primary/20 pointer-events-none"></div>
                          )}
                        </div>

                      })
                    ) : (
                      <div className="space-y-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
                        <div className="text-center py-2 text-gray-600 dark:text-gray-200">
                          경기 목록 조회 결과가 없습니다. 수동 입력으로 계속 진행할 수 있습니다.
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <FieldLabel htmlFor="manualGameTime">경기 시간</FieldLabel>
                            <Input
                              id="manualGameTime"
                              type="time"
                              value={formData.gameTime}
                              onChange={(e) => updateFormData({ gameTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel htmlFor="manualStadium">구장</FieldLabel>
                            <Input
                              id="manualStadium"
                              list="manual-stadium-options"
                              value={formData.stadium}
                              onChange={(e) => updateFormData({ stadium: e.target.value })}
                              placeholder="예: 잠실야구장"
                            />
                            <datalist id="manual-stadium-options">
                              {knownStadiumNames.map((stadiumName) => (
                                <option key={stadiumName} value={stadiumName} />
                              ))}
                            </datalist>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel htmlFor="manualAwayTeam">원정 팀</FieldLabel>
                            <select
                              id="manualAwayTeam"
                              value={formData.awayTeam}
                              onChange={(event) => updateFormData({ awayTeam: event.target.value })}
                              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-border dark:bg-input/30"
                            >
                              <option value="">원정 팀 선택</option>
                              {TEAMS.map((team) => (
                                <option key={`away-${team.id}`} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <FieldLabel htmlFor="manualHomeTeam">홈 팀</FieldLabel>
                            <select
                              id="manualHomeTeam"
                              value={formData.homeTeam}
                              onChange={(event) => updateFormData({ homeTeam: event.target.value })}
                              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-border dark:bg-input/30"
                            >
                              <option value="">홈 팀 선택</option>
                              {TEAMS.map((team) => (
                                <option key={`home-${team.id}`} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          팀/구장까지 입력하면 다음 단계로 진행할 수 있습니다.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: 좌석 정보 */}
          {createStep === 3 && (
            <div className="space-y-6 sm:space-y-8">
              <h2 className="mb-4 text-lg font-bold text-primary sm:mb-6 sm:text-xl">
                좌석 정보
              </h2>

              {/* 1. Cheering Side Selection (Visual Blocks) */}
              <div className="space-y-3">
                <FieldLabel className="text-base font-bold sm:text-lg">응원 진영 선택 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 min-h-[7rem] sm:h-28">
                  {/* Home Team */}
                  <button
                    type="button"
                    onClick={() => updateFormData({ cheeringSide: 'HOME' })}
                    className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'HOME'
                      ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    style={{
                      backgroundColor: formData.cheeringSide === 'HOME' ? getTeamColorByAnyKey(mapTeamId(formData.homeTeam)) : 'transparent',
                      borderColor: getTeamColorByAnyKey(mapTeamId(formData.homeTeam)),
                      borderWidth: formData.cheeringSide === 'HOME' ? 0 : 2,
                      color: formData.cheeringSide === 'HOME' ? 'white' : getTeamColorByAnyKey(mapTeamId(formData.homeTeam)),
                    }}
                  >
                    <div className="mb-2">
                      <TeamLogo teamId={mapTeamId(formData.homeTeam)} size={34} />
                    </div>
                    <span className="text-center text-sm font-bold leading-tight sm:text-lg">
                      {TEAMS.find(t => t.id === mapTeamId(formData.homeTeam))?.name || '홈팀'}
                    </span>
                    <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">홈 팀 응원</div>
                  </button>

                  {/* Neutral */}
                  <button
                    type="button"
                    onClick={() => updateFormData({ cheeringSide: 'NEUTRAL' })}
                    className={`flex min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'NEUTRAL'
                      ? 'bg-gray-500 text-white ring-4 ring-gray-300 ring-offset-2 scale-[1.02] border-transparent shadow-md'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-border dark:hover:bg-gray-800'
                      }`}
                  >
                    <span className="mb-1 text-2xl sm:text-3xl">😐</span>
                    <span className="text-sm font-bold sm:text-lg">상관없음</span>
                    <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">중립</div>
                  </button>

                  {/* Away Team */}
                  <button
                    type="button"
                    onClick={() => updateFormData({ cheeringSide: 'AWAY' })}
                    className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'AWAY'
                      ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    style={{
                      backgroundColor: formData.cheeringSide === 'AWAY' ? getTeamColorByAnyKey(mapTeamId(formData.awayTeam)) : 'transparent',
                      borderColor: getTeamColorByAnyKey(mapTeamId(formData.awayTeam)),
                      borderWidth: formData.cheeringSide === 'AWAY' ? 0 : 2,
                      color: formData.cheeringSide === 'AWAY' ? 'white' : getTeamColorByAnyKey(mapTeamId(formData.awayTeam)),
                    }}
                  >
                    <div className="mb-2">
                      <TeamLogo teamId={mapTeamId(formData.awayTeam)} size={34} />
                    </div>
                    <span className="text-center text-sm font-bold leading-tight sm:text-lg">
                      {TEAMS.find(t => t.id === mapTeamId(formData.awayTeam))?.name || '원정팀'}
                    </span>
                    <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">원정 팀 응원</div>
                  </button>
                </div>
              </div>

              {/* 2. Seat Category (Grid with Descriptions) */}
              <div className="space-y-3">
                <FieldLabel className="text-base font-bold sm:text-lg">좌석 종류 (선택)</FieldLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            type="button"
                            key={k}
                            onClick={() => updateFormData({ seatCategory: isSelected ? '' : v.label })}
                            className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:shadow-sm sm:p-4 ${isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-gray-100 hover:border-primary/50 bg-white dark:bg-card dark:border-border'
                            }`}
                          >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-2 text-xl sm:h-12 sm:w-12 sm:text-2xl ${isSelected ? 'bg-white' : 'bg-gray-50 dark:bg-secondary'}`}>
                            {SEAT_ICONS[k as SeatCategory]}
                          </div>
                          <div>
                            <div className={`font-bold ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                              {v.label}
                            </div>
                            <div className="mt-1 text-[11px] leading-snug text-gray-500 sm:text-xs">
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
                <FieldLabel className="text-base font-bold sm:text-lg" htmlFor="seatDetail">좌석 상세 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
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
                  <div>
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
                  <div>
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
                  <div className="mt-4 flex flex-col gap-2 rounded-lg bg-gray-50 p-3 dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <span className="text-sm text-gray-500">미리보기</span>
                    <span className="break-words text-sm font-bold text-gray-700 dark:text-gray-300 sm:text-right">
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
                <FieldLabel htmlFor="maxParticipants" className="text-base font-bold sm:text-lg">모집 인원 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
                <select
                  id="maxParticipants"
                  value={formData.maxParticipants.toString()}
                  onChange={(event) =>
                    updateFormData({ maxParticipants: parseInt(event.target.value, 10) })
                  }
                  className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-border dark:bg-input/30"
                >
                  <option value="2">2명 (본인 포함)</option>
                  <option value="3">3명 (본인 포함)</option>
                  <option value="4">4명 (본인 포함)</option>
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="ticketPrice" className="text-base font-bold sm:text-lg">티켓 가격 (1인당) <span className="text-red-500 ml-0.5">*</span></FieldLabel>
                <div className="relative">
                  <Input
                    id="ticketPrice"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.ticketPrice || ''}
                    onChange={(e) => updateFormData({ ticketPrice: parseInt(e.target.value) || 0 })}
                    placeholder="예: 12000"
                    className="h-12 pr-12 text-base sm:text-lg"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
                    원
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2 px-1">
                  * 선택하신 <span className="font-bold text-primary">{formData.seatCategory}</span> 기준 예상 가격입니다. 실제 예매 가격과 다를 수 있습니다.
                </p>
                {formData.ticketPrice > 0 && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      참여자는 호스트 승인 후 채팅에서 티켓 가격 <span className="text-primary">{formData.ticketPrice.toLocaleString()}원</span> 기준으로 직거래를 조율합니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Step 4: 소개글 + 제출 */}
          {createStep === 4 && (
            <div className="space-y-6">
              <h2 className="mb-4 text-xl text-primary sm:mb-6 sm:text-2xl">
                파티 소개
              </h2>

              <div className="space-y-2">
                <FieldLabel htmlFor="description">소개글 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  onBlur={() => {
                    const error = validateMateDescription(formData.description);
                    setFormError('description', error);
                  }}
                  placeholder="함께 야구를 즐길 메이트에게 하고 싶은 말을 작성해주세요..."
                  className="min-h-[150px]"
                  aria-describedby="description-hint description-count"
                />
                {/* Style Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {['#열정응원🔥', '#공격때_기립🧍', '#조용한관람🤫', '#먹방진심🍗', '#유니폼필수👕', '#직관승요🧚'].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-card rounded-md text-gray-600 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/30 hover:text-primary transition-colors"
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
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span
                    id="description-hint"
                    className={formErrors.description ? 'text-red-500' : 'text-gray-500'}
                  >
                    {formErrors.description || '10자 이상 200자 이하'}
                  </span>
                  <span
                    id="description-count"
                    className={
                      formData.description.length > 190
                        ? 'text-red-500 font-semibold'
                        : formData.description.length > 160
                          ? 'text-amber-500'
                          : 'text-gray-500'
                    }
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {formData.description.length}/200자
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
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            {createStep > 1 && (
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={!canGoPrev}
                className="flex-1"
              >
                이전
              </Button>
            )}
            {createStep < 4 ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex-1 text-white bg-primary"
              >
                다음
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="flex-1 text-white bg-primary"
              >
                파티 만들기
              </Button>
            )}
          </div>
          {blockedStepMessage && (
            <p className={`mt-3 text-sm text-center ${createStep === 4 ? 'text-red-500' : 'text-amber-600'}`}>
              {blockedStepMessage}
            </p>
          )}
        </Card>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={cancelSubmit} />
          <div className="absolute inset-0 flex items-center justify-center p-4" onClick={cancelSubmit}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="mate-create-confirm-title"
              aria-describedby="mate-create-confirm-description"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-6 shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 sm:max-w-md"
            >
              <div className="space-y-2">
                <h2 id="mate-create-confirm-title" className="text-lg font-semibold text-primary">
                  파티 생성 확인
                </h2>
                <p id="mate-create-confirm-description" className="text-sm text-muted-foreground">
                  아래 내용을 확인하고 파티를 생성하시겠습니까?
                </p>
              </div>

              <div className="space-y-4 py-4">
                <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 dark:bg-card sm:flex-row sm:items-center sm:justify-center">
                  <div className="flex items-center justify-center gap-2">
                    <TeamLogo teamId={formData.awayTeam} size="sm" />
                    <span className="font-bold text-sm">
                      {TEAMS.find(t => t.id === formData.awayTeam)?.name}
                    </span>
                  </div>
                  <span className="text-center text-gray-400 text-xs font-bold">VS</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-bold text-sm">
                      {TEAMS.find(t => t.id === formData.homeTeam)?.name}
                    </span>
                    <TeamLogo teamId={formData.homeTeam} size="sm" />
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">경기 일시</span>
                    <span className="break-words font-medium sm:text-right">
                      {formData.gameDate} {formData.gameTime || '18:30'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">경기장</span>
                    <span className="break-words font-medium sm:text-right">{formData.stadium}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">좌석</span>
                    <span className="break-words font-medium sm:text-right">
                      {formData.seatDetail
                        ? [
                          formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                          formData.seatCategory,
                          formData.seatDetail,
                        ].filter(Boolean).join(' ')
                        : formData.section}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">모집 인원</span>
                    <span className="font-medium sm:text-right">{formData.maxParticipants}명 (본인 포함)</span>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-gray-500">거래 기준 금액</span>
                    <span className="font-medium sm:text-right">{formData.ticketPrice.toLocaleString()}원</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    앱 내 결제 없이 승인 후 채팅으로 직거래를 진행합니다.
                  </p>
                </div>

                <div className="border-t pt-3">
                  <p className="mb-1 text-xs text-gray-500">소개글</p>
                  <p className="line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
                    {formData.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={cancelSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  수정하기
                </Button>
                <Button
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-primary text-white sm:w-auto"
                >
                  {isSubmitting ? '생성 중...' : '확인'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <VerificationRequiredDialog
        isOpen={showVerificationDialog}
        onClose={() => setShowVerificationDialog(false)}
      />
    </div>
  );
}
