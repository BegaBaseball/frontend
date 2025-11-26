// components/LoginRequiredDialog.tsx
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

interface LoginRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
}

export const LoginRequiredDialog = ({ 
  open, 
  onOpenChange,
  onCancel 
}: LoginRequiredDialogProps) => {
  const navigate = useNavigate();

  const handleGoToLogin = () => {
    onOpenChange(false);
    navigate('/login');
  };

  const handleCancel = () => {
    onOpenChange(false);
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: '#2d5f4f' }}>
            로그인 필요
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            로그인이 필요한 서비스입니다.<br />
            로그인 페이지로 이동하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleGoToLogin}
            className="text-white"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            로그인하러 가기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};