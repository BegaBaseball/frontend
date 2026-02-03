import { useAuthStore } from '../store/authStore';
import { LoginRequiredDialog } from '../components/LoginRequiredDialog';

export const useLoginRequired = () => {
  const {
    isLoggedIn,
    requireLogin
  } = useAuthStore();

  return {
    isLoggedIn,
    requireLogin,
  };
};