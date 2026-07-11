import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import type { TrustedDeviceItem } from '../../types/profile';
import MyPageSeasonEmptyState from './MyPageSeasonEmptyState';
import {
  MyPageAlertTriangleIcon,
  MyPageEyeIcon,
  MyPageEyeOffIcon,
  MyPageFingerprintIcon,
  MyPageShieldAlertIcon,
  MyPageTrashIcon,
} from './MyPageFlowIcons';

interface AccountSettingsAdvancedRuntimeProps {
  showAdvancedSettingsDialog: boolean;
  showDeleteDialog: boolean;
  onAdvancedDialogClose: () => void;
  onDeleteDialogClose: () => void;
  onDeleteOtherSessions: () => void;
  onTrustedDeviceRemove: (deviceId: number) => void;
  onOpenDeleteDialog: () => void;
  onDeleteConfirm: () => void;
  isDeleteOtherSessionsPending: boolean;
  hasOtherDeviceSessions: boolean;
  otherDeviceSessionCount: number;
  trustedDevices: TrustedDeviceItem[];
  isTrustedDevicesLoading: boolean;
  isRemoveTrustedDevicePending: boolean;
  isDeletePending: boolean;
  isLocalUser: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  deleteConfirmText: string;
  onDeleteConfirmTextChange: (value: string) => void;
  deleteConfirmTextPlaceholder: string;
  isDeleteConfirmMatched: boolean;
  deletePasswordInputClass: string;
  error: string;
  formatSessionTime: (value?: string) => string;
}

export default function AccountSettingsAdvancedRuntime({
  showAdvancedSettingsDialog,
  showDeleteDialog,
  onAdvancedDialogClose,
  onDeleteDialogClose,
  onDeleteOtherSessions,
  onTrustedDeviceRemove,
  onOpenDeleteDialog,
  onDeleteConfirm,
  isDeleteOtherSessionsPending,
  hasOtherDeviceSessions,
  otherDeviceSessionCount,
  trustedDevices,
  isTrustedDevicesLoading,
  isRemoveTrustedDevicePending,
  isDeletePending,
  isLocalUser,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  deleteConfirmText,
  onDeleteConfirmTextChange,
  deleteConfirmTextPlaceholder,
  isDeleteConfirmMatched,
  deletePasswordInputClass,
  error,
  formatSessionTime,
}: AccountSettingsAdvancedRuntimeProps) {
  return (
    <>
      <PlainDialog
        open={showAdvancedSettingsDialog}
        onClose={onAdvancedDialogClose}
        title="고급 설정"
        description="평소에는 자주 쓰지 않지만, 계정 보호나 정리가 필요할 때 사용하는 기능입니다. 일부 작업은 현재 로그인 상태와 다른 기기에 영향을 줄 수 있습니다."
        className="sm:max-w-2xl"
        footer={(
          <Button variant="outline" className="w-full sm:w-auto" onClick={onAdvancedDialogClose}>
            닫기
          </Button>
        )}
      >
        <div className="space-y-4 pt-1">
          <div className="rounded-xl border border-border bg-card/80 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MyPageShieldAlertIcon className="w-4 h-4 text-primary" />
                <p className="text-body font-semibold">보안 정리</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-body text-muted-foreground">
                {hasOtherDeviceSessions ? `${otherDeviceSessionCount}대 정리 가능` : '추가 정리 없음'}
              </span>
            </div>
            <p className="mb-4 text-body text-muted-foreground">
              현재 사용 중인 기기를 제외한 나머지 로그인 세션을 정리합니다. 공용 기기나 더 이상 쓰지 않는 기기에서 로그인한 적이 있다면 사용하세요.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteOtherSessions}
              disabled={isDeleteOtherSessionsPending || !hasOtherDeviceSessions}
              className="w-full"
            >
              {isDeleteOtherSessionsPending ? '세션 정리 중...' : '다른 기기에서 로그아웃'}
            </Button>
            {!hasOtherDeviceSessions && (
              <p className="mt-2 text-body text-muted-foreground">지금은 정리할 다른 기기 세션이 없습니다.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card/80 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MyPageFingerprintIcon className="w-4 h-4 text-primary" />
                <p className="text-body font-semibold">신뢰 기기 관리</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-body text-muted-foreground">
                {trustedDevices.length}대 등록됨
              </span>
            </div>
            <p className="mb-4 text-body text-muted-foreground">
              로그인 성공 시 자동 등록된 기기 목록입니다. 해제해도 현재 로그인 세션은 유지되며, 다음 로그인부터 새 기기로 다시 감지됩니다.
            </p>
            {isTrustedDevicesLoading ? (
              <p className="text-body text-muted-foreground">신뢰 기기 정보를 불러오는 중입니다.</p>
            ) : trustedDevices.length > 0 ? (
              <div className="space-y-2">
                {trustedDevices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-lg border border-border bg-background/80 px-3 py-3"
                  >
                    <div className="space-y-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-body font-semibold text-foreground">{device.deviceLabel}</p>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-body font-semibold text-primary">
                            신뢰 중
                          </span>
                        </div>
                        <p className="mt-1 text-body text-muted-foreground">
                          {[device.browser, device.os].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      <div className="grid gap-2 text-body text-muted-foreground sm:grid-cols-2">
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                        <p className="font-semibold text-foreground/90">최근 확인</p>
                          <p className="mt-1">{formatSessionTime(device.lastSeenAt)}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                        <p className="font-semibold text-foreground/90">기기 정보</p>
                          <p className="mt-1">{[device.browser, device.os].filter(Boolean).join(' · ') || '정보 없음'}</p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTrustedDeviceRemove(device.id)}
                        disabled={isRemoveTrustedDevicePending}
                        className="w-full sm:w-auto"
                      >
                        이 기기 신뢰 해제
                      </Button>
                      {device.lastIp && (
                        <p className="text-body text-muted-foreground/80">마지막 IP: {device.lastIp}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MyPageSeasonEmptyState
                className="mypage-season-empty--flush"
                icon={<MyPageFingerprintIcon className="h-5 w-5" />}
                title="등록된 신뢰 기기가 없습니다."
                description="신뢰 기기로 확인된 로그인 환경이 생기면 이곳에서 해제할 수 있습니다."
              />
            )}
          </div>

          <div className="rounded-xl border border-destructive/35 bg-destructive/12 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MyPageTrashIcon className="h-4 w-4 text-destructive" />
                <p className="text-body font-semibold text-destructive">탈퇴 예약</p>
              </div>
              <span className="rounded-full bg-destructive/20 px-2.5 py-1 text-body text-destructive">
                7일 유예
              </span>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-destructive/35 bg-destructive/15 px-2.5 py-1 text-body text-destructive">
                즉시 로그아웃
              </span>
              <span className="rounded-full border border-destructive/35 bg-destructive/15 px-2.5 py-1 text-body text-destructive">
                이메일 링크로 취소 가능
              </span>
            </div>
            <p className="mb-4 text-body text-destructive">
              정말 필요한 경우에만 진행하세요. 예약 즉시 로그아웃되며, 7일 동안은 이메일 복구 링크로 취소할 수 있습니다. 유예 기간이 지나면 최종 삭제 절차가 진행됩니다.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={onOpenDeleteDialog}
              className="w-full"
              disabled={isDeletePending}
            >
              <MyPageTrashIcon className="w-4 h-4 mr-2" />
              탈퇴 예약
            </Button>
          </div>
        </div>
      </PlainDialog>

      <PlainDialog
        open={showDeleteDialog}
        onClose={onDeleteDialogClose}
        title={(
          <span className="flex items-center gap-2 text-destructive">
            <MyPageAlertTriangleIcon className="w-5 h-5" />
            탈퇴 예약 확인
          </span>
        )}
        className="sm:max-w-lg"
        hideCloseButton={isDeletePending}
        footer={(
          <>
            <Button variant="outline" onClick={onDeleteDialogClose} disabled={isDeletePending}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirm}
              disabled={isDeletePending || !isDeleteConfirmMatched}
            >
              {isDeletePending ? '예약 중...' : '탈퇴 예약'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3 text-body text-muted-foreground">
          <p>탈퇴 예약을 진행하면 즉시 로그아웃되며, 7일 후 최종 삭제 절차가 진행됩니다.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>유예 기간 동안 로그인과 토큰 재발급이 차단됩니다.</li>
            <li>이메일로 전달된 복구 링크로 7일 안에 예약을 취소할 수 있습니다.</li>
            <li>유예 기간이 지나면 기존과 동일한 데이터 정리 절차가 시작됩니다.</li>
          </ul>
          <p>본인이 직접 요청한 경우에만 아래 확인을 진행해 주세요.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="my-4">
            <MyPageAlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLocalUser && (
          <div className="my-4 space-y-2">
            <label htmlFor="deletePassword" className="text-body font-semibold text-foreground">
              비밀번호 확인
            </label>
            <div className="relative">
              <Input
                id="deletePassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className={deletePasswordInputClass}
                disabled={isDeletePending}
              />
              <button
                type="button"
                onClick={onToggleShowPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <MyPageEyeOffIcon className="w-4 h-4" /> : <MyPageEyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="my-2 space-y-2">
            <label htmlFor="deleteConfirmText" className="text-body font-semibold text-foreground">
            확인 문구 입력
          </label>
            <Input
              id="deleteConfirmText"
              value={deleteConfirmText}
              onChange={(event) => onDeleteConfirmTextChange(event.target.value)}
              placeholder={deleteConfirmTextPlaceholder}
              className="font-semibold"
              disabled={isDeletePending}
            />
          <p className="text-body text-muted-foreground">위 문구를 정확히 입력하면 탈퇴 예약이 진행됩니다.</p>
        </div>
      </PlainDialog>
    </>
  );
}
