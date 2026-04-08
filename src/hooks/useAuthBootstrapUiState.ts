import { useLocation } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

import { useAuthStore } from '../store/authStore';
import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  resolveAuthBootstrapMode,
} from '../utils/authBootstrap';

export const useAuthBootstrapUiState = () => {
  const location = useLocation();
  const {
    isAuthLoading,
    isLoggedIn,
    publicAuthBootstrapPhase,
    userId,
  } = useAuthStore(
    useShallow((state) => ({
      isAuthLoading: state.isAuthLoading,
      isLoggedIn: Boolean(state.user),
      publicAuthBootstrapPhase: state.publicAuthBootstrapPhase,
      userId: state.user?.id ?? null,
    })),
  );
  const authBootstrapMode = resolveAuthBootstrapMode(location.pathname, {
    isLoggedIn,
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  });

  return {
    authBootstrapMode,
    isAuthBootstrapPending: !isLoggedIn && publicAuthBootstrapPhase !== 'idle',
    isAuthLoading,
    isLoggedIn,
    userId,
  };
};
