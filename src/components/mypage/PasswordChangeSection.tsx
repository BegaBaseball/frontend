import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { changePassword } from '../../api/profile';
import { toast } from 'sonner';

interface PasswordChangeSectionProps {
    onCancel: () => void;
    onSuccess: () => void;
}

export default function PasswordChangeSection({ onCancel, onSuccess }: PasswordChangeSectionProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: changePassword,
        onSuccess: () => {
            toast.success('비밀번호가 성공적으로 변경되었습니다.');
            onSuccess();
        },
        onError: (error: Error) => {
            setError(error.message);
        },
    });

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return '비밀번호는 8자 이상이어야 합니다.';
        }
        return null;
    };

    const handleSubmit = () => {
        setError('');

        // Validation
        if (!currentPassword) {
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

        if (currentPassword === newPassword) {
            setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
            return;
        }

        mutation.mutate({ currentPassword, newPassword, confirmPassword });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6" style={{ color: '#2d5f4f' }} />
                <h2 className="text-xl font-bold" style={{ color: '#2d5f4f' }}>비밀번호 변경</h2>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>오류</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {/* Current Password */}
                <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-gray-700 dark:text-gray-300">
                        현재 비밀번호 *
                    </Label>
                    <div className="relative">
                        <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호를 입력하세요"
                            className="pr-10"
                            disabled={mutation.isPending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-gray-700 dark:text-gray-300">
                        새 비밀번호 *
                    </Label>
                    <div className="relative">
                        <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새 비밀번호를 입력하세요"
                            className="pr-10"
                            disabled={mutation.isPending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">비밀번호는 8자 이상이어야 합니다.</p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                        비밀번호 확인 *
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="새 비밀번호를 다시 입력하세요"
                            className="pr-10"
                            disabled={mutation.isPending}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {confirmPassword && newPassword === confirmPassword && (
                        <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle className="w-3 h-3" />
                            비밀번호가 일치합니다.
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    className="flex-1 text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#2d5f4f' }}
                    disabled={mutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                >
                    <Save className="w-5 h-5" />
                    {mutation.isPending ? '변경 중...' : '비밀번호 변경'}
                </Button>
            </div>
        </div>
    );
}
