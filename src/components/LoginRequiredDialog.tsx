// components/LoginRequiredDialog.tsx
import { useNavigate } from 'react-router-dom';
import { buildLoginPath } from '../utils/loginRedirect';
import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';

interface LoginRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
  redirectPath?: string | null;
}

export const LoginRequiredDialog = ({ 
  open, 
  onOpenChange,
  onCancel,
  redirectPath,
}: LoginRequiredDialogProps) => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    onOpenChange(false);
    navigate(buildLoginPath(redirectPath));
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate('/home');
  };

  return (
    <PlainDialog
      open={open}
      onClose={handleCancel}
      contentTestId="prediction-login-required-dialog"
      title="로그인 필요"
      hideCloseButton={true}
      className="max-w-md"
      footer={
        <>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button
            onClick={handleGoToLogin}
            className="bg-primary-dark text-white hover:bg-primary"
          >
            로그인하러 가기
          </Button>
        </>
      }
    >
      <p className="text-base text-muted-foreground">
        로그인이 필요한 서비스입니다.
        <br />
        로그인 페이지로 이동하시겠습니까?
      </p>
    </PlainDialog>
  );
};
