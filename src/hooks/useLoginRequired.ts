import { useAuthStore } from '../store/authStore';
import { LoginRequiredDialog } from '../components/LoginRequiredDialog';

export const useLoginRequired = () => {
  const { 
    isLoggedIn, 
    showLoginRequiredDialog, 
    setShowLoginRequiredDialog,
    requireLogin 
  } = useAuthStore();

  const LoginRequiredComponent = () => (
    <LoginRequiredDialog
      open={showLoginRequiredDialog}
      onOpenChange={setShowLoginRequiredDialog}
    />
  );

  return {
    isLoggedIn,
    requireLogin,
    LoginRequiredDialog: LoginRequiredComponent,
  };
};