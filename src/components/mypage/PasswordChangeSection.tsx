import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ERROR_MESSAGES } from '../../constants/validation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import '../common/autofill-input.css';
import { changePassword } from '../../api/profile';
import { toast } from 'sonner';
import { useAuthAccessActions } from '../../store/authStore';
import { buildLoginPath } from '../../utils/loginRedirect';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { sanitizeLoginPasswordText } from '../../utils/validation';
import {
  MyPageAlertCircleIcon,
  MyPageCheckCircleIcon,
  MyPageEyeIcon,
  MyPageEyeOffIcon,
  MyPageLockIcon,
  MyPageSaveIcon,
} from './MyPageIcons';

interface PasswordChangeSectionProps {
    onCancel: () => void;
    onSuccess: () => void;
    hasPassword?: boolean;
}

export default function PasswordChangeSection({ onCancel, onSuccess, hasPassword = true }: PasswordChangeSectionProps) {
    const navigate = useNavigate();
    const { logout } = useAuthAccessActions();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');

    const passwordInputClass = 'auth-autofill-input pr-10';
    const sanitizePassword = (value: string) => sanitizeLoginPasswordText(value);

    const mutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('비밀번호가 변경되어 다시 로그인해주세요.');
            logout(true);
            onSuccess();
            navigate(buildLoginPath('/mypage'), { replace: true });
        },
        onError: (error: unknown) => {
            setError(getApiErrorMessage(error, '비밀번호 변경에 실패했습니다.'));
        },
    });

    const validatePassword = (password: string): string | null => {
        if (sanitizePassword(password) !== password) {
            return ERROR_MESSAGES.ENCODE.INVALID;
        }
        if (password.length < 8) {
            return '비밀번호는 8자 이상이어야 합니다.';
        }
        return null;
    };

    const handleSubmit = () => {
        setError('');

        // Validation
        if (hasPassword && !currentPassword) {
            setError('현재 비밀번호를 입력해주세요.');
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
            return;
        }

        if (hasPassword && currentPassword === newPassword) {
            setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
            return;
        }

        mutation.mutate({ currentPassword, newPassword, confirmPassword });
    };

    return (
        <div className="bg-card rounded-2xl shadow-lg border-2 border-border p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <MyPageLockIcon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold text-primary">
                    {hasPassword ? '비밀번호 변경' : '비밀번호 설정'}
                </h2>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <MyPageAlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>오류</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {/* Current Password (Only show if user has password) */}
                {hasPassword && (
                    <div className="space-y-2">
                        <label htmlFor="currentPassword" className="text-[16px] font-semibold text-muted-foreground">
                            현재 비밀번호 *
                        </label>
                        <div className="relative">
                            <Input
                                id="currentPassword"
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => {
                                    setCurrentPassword(sanitizePassword(e.target.value));
                                    setError('');
                                }}
                                placeholder="현재 비밀번호를 입력하세요"
                                className={passwordInputClass}
                                disabled={mutation.isPending}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showCurrentPassword ? <MyPageEyeOffIcon className="w-4 h-4" /> : <MyPageEyeIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}

                {/* New Password */}
                <div className="space-y-2">
                        <label htmlFor="newPassword" className="text-[16px] font-semibold text-muted-foreground">
                        새 비밀번호 *
                    </label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(sanitizePassword(e.target.value));
                                setError('');
                            }}
                            placeholder="새 비밀번호를 입력하세요"
                            className={passwordInputClass}
                            disabled={mutation.isPending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showNewPassword ? <MyPageEyeOffIcon className="w-4 h-4" /> : <MyPageEyeIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[16px] text-muted-foreground">비밀번호는 8자 이상이어야 합니다.</p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="text-[16px] font-semibold text-muted-foreground">
                        비밀번호 확인 *
                    </label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(sanitizePassword(e.target.value));
                                setError('');
                            }}
                            placeholder="새 비밀번호를 다시 입력하세요"
                            className={passwordInputClass}
                            disabled={mutation.isPending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showConfirmPassword ? <MyPageEyeOffIcon className="w-4 h-4" /> : <MyPageEyeIcon className="w-4 h-4" />}
                        </button>
                    </div>
                    {confirmPassword && newPassword === confirmPassword && (
                        <div className="flex items-center gap-1 text-green-600 text-[16px]">
                            <MyPageCheckCircleIcon className="w-3 h-3" />
                            비밀번호가 일치합니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onCancel}
                    disabled={mutation.isPending}
                >
                    취소
                </Button>
                <Button
                    onClick={handleSubmit}
                    className="flex-1 text-primary-foreground bg-primary flex items-center justify-center gap-2"
                    disabled={mutation.isPending || (hasPassword && !currentPassword) || !newPassword || !confirmPassword}
                >
                    <MyPageSaveIcon className="w-5 h-5" />
                    {mutation.isPending ? '저장 중...' : (hasPassword ? '비밀번호 변경' : '비밀번호 설정')}
                </Button>
            </div>
        </div>
    );
}
