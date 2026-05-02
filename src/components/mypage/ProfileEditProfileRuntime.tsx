import { lazy, Suspense, useState } from 'react';
import {
  MyPageAlertCircleIcon,
  MyPageCheckCircleIcon,
  MyPageLockIcon,
  MyPageSaveIcon,
  MyPageSparklesIcon,
} from './MyPageIcons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../ui/alert';
import TeamLogo from '../TeamLogo';
import PlainDialog from '../ui/plain-dialog';
import { FRANCHISE_TEAM_IDS, TEAM_DATA } from '../../constants/teams';
import type { NicknameCheckState } from '../../types/profile';

const TEAM_TEST_HINT = '구단 테스트로 나에게 맞는 응원스타일을 확인해 보세요.';
const LazyTeamRecommendationTest = lazy(() => import('../TeamRecommendationTest'));

const getNicknameClassName = (state: NicknameCheckState): string => {
  switch (state) {
    case 'available':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'taken':
      return 'text-red-500 dark:text-red-400';
    case 'error':
      return 'text-orange-500 dark:text-orange-400';
    default:
      return 'text-muted-foreground';
  }
};

const getTeamLabel = (teamId: string): string => {
  return TEAM_DATA[teamId]?.name || '응원하는 팀을 선택하세요';
};

interface ProfileEditProfileRuntimeProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  bio: string;
  setBio: (value: string) => void;
  userRole?: string;
  editingFavoriteTeam: string;
  setEditingFavoriteTeam: (teamId: string) => void;
  selectableTeamIds?: string[];
  isDesktop: boolean;
  isLoading: boolean;
  fieldErrors: {
    name?: string;
    bio?: string;
  };
  nicknameCheckState: NicknameCheckState;
  nicknameCheckMessage?: string | null;
  saveAttempted: boolean;
  hasValidationErrors: boolean;
  hasChanges: boolean;
  canSubmit: boolean;
  lastSavedAt?: Date | null;
  saveMessage?: string | null;
  showTeamTest: boolean;
  setShowTeamTest: (value: boolean) => void;
  handleSave: () => void;
  handleCancelRequest: () => void;
  handleTeamSelect: (teamId: string) => void;
}

export default function ProfileEditProfileRuntime({
  name,
  setName,
  email,
  bio,
  setBio,
  userRole,
  editingFavoriteTeam,
  setEditingFavoriteTeam,
  selectableTeamIds = ['없음', ...FRANCHISE_TEAM_IDS],
  isDesktop,
  isLoading,
  fieldErrors,
  nicknameCheckState,
  nicknameCheckMessage,
  saveAttempted,
  hasValidationErrors,
  hasChanges,
  canSubmit,
  lastSavedAt,
  saveMessage,
  showTeamTest,
  setShowTeamTest,
  handleSave,
  handleCancelRequest,
  handleTeamSelect,
}: ProfileEditProfileRuntimeProps) {
  const [showTeamSheet, setShowTeamSheet] = useState(false);
  const isNameChecking = nicknameCheckState === 'checking';
  const isNameBlocked = nicknameCheckState === 'taken' || nicknameCheckState === 'error';
  const hasFieldErrors = Boolean(fieldErrors.name || fieldErrors.bio || isNameBlocked);
  const hideBottomActions = showTeamSheet;

  const renderNameStatus = () => {
    if (!name || name.length <= 1 || nicknameCheckState === 'idle') {
      if (fieldErrors.name) {
        return (
          <p className="text-[16px] text-red-500 dark:text-red-400">
            {fieldErrors.name}
          </p>
        );
      }
      return null;
    }

    if (nicknameCheckState === 'checking') {
      return <p className="text-[16px] text-muted-foreground">{nicknameCheckMessage}</p>;
    }

    if (fieldErrors.name) {
      return <p className="text-[16px] text-red-500 dark:text-red-400">{fieldErrors.name}</p>;
    }

    if (nicknameCheckMessage) {
      const colorClass = getNicknameClassName(nicknameCheckState);
      return (
        <p className={`text-[16px] font-semibold ${colorClass}`}>
          {nicknameCheckMessage}
        </p>
      );
    }

    return null;
  };

  return (
    <>
      <div className="space-y-6 p-1 md:p-0">
        {saveAttempted && hasValidationErrors && (
          <Alert variant="destructive" className="animate-in fade-in">
            <MyPageAlertCircleIcon className="h-4 w-4" />
            <AlertTitle>입력값을 확인해주세요</AlertTitle>
            <AlertDescription>필드 아래 오류 메시지를 수정한 뒤 저장해 주세요.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="space-y-2 p-4">
            <label htmlFor="name" className="text-[16px] font-semibold text-muted-foreground">
              이름
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40 ${fieldErrors.name ? 'border-red-500 dark:border-red-400' : ''}`}
              placeholder="이름을 입력하세요"
              maxLength={21}
              disabled={isLoading}
              aria-invalid={!!fieldErrors.name}
              aria-describedby="name-error"
            />
            <div className="flex items-center justify-between">
              <p className="text-[16px] text-muted-foreground">닉네임은 2~20자</p>
              <p className={`text-[16px] font-semibold ${name.length > 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {name.length}/20
              </p>
            </div>
            <div id="name-error" className="min-h-[18px]">
              {renderNameStatus()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <label htmlFor="email" className="text-[16px] font-semibold text-muted-foreground">
              이메일
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  className="auth-autofill-input w-full border-border bg-card pr-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/40 disabled:opacity-100"
                  placeholder="이메일을 입력하세요"
                  disabled
                  readOnly
                />
                <MyPageLockIcon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <span className="whitespace-nowrap text-[16px] text-muted-foreground">
                수정 불가
              </span>
            </div>
            <p className="text-[16px] text-emerald-600 dark:text-emerald-400">이메일은 본인 확인에 사용되므로 변경할 수 없습니다.</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <label htmlFor="bio" className="text-[16px] font-semibold text-muted-foreground">
              자기소개
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`flex min-h-[90px] w-full rounded-md border border-border bg-card px-3 py-2 text-[16px] text-foreground ring-offset-background transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.bio ? 'border-red-500 dark:border-red-400' : ''}`}
              placeholder="자기소개를 입력하세요 (500자 이내)"
              maxLength={500}
              disabled={isLoading}
              aria-invalid={!!fieldErrors.bio}
              aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
            />
            <div className="flex justify-between">
              <p className="text-[16px] text-muted-foreground">자기소개는 중요 정보입니다.</p>
              <p className={`text-[16px] font-semibold ${bio.length > 500 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {bio.length}/500
              </p>
            </div>
            {fieldErrors.bio && (
              <p id="bio-error" className="text-[16px] text-red-500 dark:text-red-400">
                {fieldErrors.bio}
              </p>
            )}
          </CardContent>
        </Card>

        {userRole === 'ROLE_USER' && (
          <Card>
            <CardContent className="space-y-3 p-4">
            <label htmlFor="team" className="text-[16px] font-semibold text-muted-foreground">
                응원구단
              </label>

              {isDesktop ? (
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-card px-3">
                      {editingFavoriteTeam !== '없음' ? (
                        <div className="h-6 w-6 shrink-0">
                          <TeamLogo team={editingFavoriteTeam} size="sm" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                      )}
                      <select
                        id="team"
                        value={editingFavoriteTeam}
                        onChange={(event) => setEditingFavoriteTeam(event.target.value)}
                        className="h-10 w-full appearance-none bg-transparent text-[16px] text-foreground outline-none"
                        disabled={isLoading}
                      >
                        {selectableTeamIds.map((teamId) => (
                          <option key={teamId} value={teamId}>
                            {TEAM_DATA[teamId].name}
                          </option>
                        ))}
                      </select>
                      <span className="shrink-0 text-[16px] text-muted-foreground" aria-hidden="true">
                        ▾
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowTeamTest(true)}
                      className="flex h-10 items-center justify-center px-3 text-[16px] text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                      title={TEAM_TEST_HINT}
                      disabled={isLoading}
                    >
                      <MyPageSparklesIcon className="mr-1.5 h-4 w-4" />
                      구단 테스트 해보기
                    </Button>
                  </div>

                  <p className="text-[16px] text-muted-foreground">응원구단은 응원석에서 사용됩니다. {TEAM_TEST_HINT}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex min-h-[40px] items-center justify-between rounded-md border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      {editingFavoriteTeam !== '없음' && (
                        <div className="h-5 w-5">
                          <TeamLogo team={editingFavoriteTeam} size="sm" />
                        </div>
                      )}
                      <span className="text-[16px] text-foreground">
                        {getTeamLabel(editingFavoriteTeam)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 text-[16px]"
                        onClick={() => setShowTeamSheet(true)}
                        disabled={isLoading}
                      >
                        변경
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowTeamTest(true)}
                        className="h-8 px-2 text-[16px]"
                        title={TEAM_TEST_HINT}
                        disabled={isLoading}
                      >
                        <MyPageSparklesIcon className="mr-1.5 h-4 w-4" />
                        구단 테스트 해보기
                      </Button>
                    </div>
                  </div>
                  <p className="text-[16px] text-muted-foreground">
                    앱처럼 빠르게 열어서 응원구단을 선택할 수 있습니다. {TEAM_TEST_HINT}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className={`${hideBottomActions ? 'hidden' : 'sticky'} bottom-0 z-10 rounded-xl border border-border bg-card p-2`}>
          <div className="space-y-2 rounded-lg p-3">
            <p className={`text-[16px] font-semibold ${hasChanges ? 'text-primary dark:text-primary-light' : 'text-muted-foreground'}`}>
              {hasChanges ? '저장되지 않은 변경사항이 있습니다.' : '변경사항 없음'}
            </p>
            <p className="text-[16px] leading-5 text-muted-foreground">
              {lastSavedAt ? `마지막 저장: ${lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '아직 저장 기록이 없습니다.'}
              {lastSavedAt && saveMessage ? ` · ${saveMessage}` : ''}
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleCancelRequest} disabled={isLoading} className="w-full sm:flex-1">
                취소
              </Button>
              <Button
                onClick={handleSave}
                className={`flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground sm:flex-1 ${!canSubmit && 'opacity-70'}`}
                disabled={isLoading || !canSubmit || isNameChecking || hasFieldErrors}
              >
                <MyPageSaveIcon className="h-5 w-5" />
                {isLoading ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showTeamSheet && (
        <PlainDialog
          open={showTeamSheet}
          onClose={() => setShowTeamSheet(false)}
          placement="bottom"
          title="응원구단 선택"
          description="원하는 응원구단을 선택하면 즉시 반영됩니다."
          className="h-[70vh] max-w-2xl rounded-b-none rounded-t-3xl border-none"
          bodyClassName="flex max-h-[calc(70vh-81px)] flex-col overflow-hidden bg-white p-0 dark:bg-card"
          footer={(
            <Button variant="outline" className="w-full" onClick={() => setShowTeamSheet(false)}>
              닫기
            </Button>
          )}
        >
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4 pt-4">
            {selectableTeamIds.map((teamId) => (
              <Button
                key={teamId}
                variant="outline"
                className="w-full justify-between"
                onClick={() => {
                  handleTeamSelect(teamId);
                  setShowTeamSheet(false);
                }}
                disabled={isLoading}
                >
                  <span className="flex items-center gap-2">
                  {teamId !== '없음' && (
                    <div className="h-6 w-6">
                      <TeamLogo team={teamId} size="sm" />
                    </div>
                  )}
                  {teamId === '없음' && <div className="h-6 w-6 rounded-full bg-muted" />}
                  <span className="truncate">{TEAM_DATA[teamId].name}</span>
                  </span>
                <MyPageCheckCircleIcon className={`h-4 w-4 ${editingFavoriteTeam === teamId ? 'text-primary' : 'text-transparent'}`} />
              </Button>
            ))}
          </div>
        </PlainDialog>
      )}

      {showTeamTest && (
        <Suspense
          fallback={(
            <PlainDialog
              open={showTeamTest}
              onClose={() => setShowTeamTest(false)}
              ariaLabel="응원구단 추천 테스트 불러오는 중"
              hideHeader
              className="max-w-md"
            >
              <div className="py-8 text-center text-[16px] text-muted-foreground">
                응원구단 추천 테스트를 불러오는 중입니다...
              </div>
            </PlainDialog>
          )}
        >
          <LazyTeamRecommendationTest
            isOpen={showTeamTest}
            onClose={() => setShowTeamTest(false)}
            onSelectTeam={handleTeamSelect}
          />
        </Suspense>
      )}
    </>
  );
}
