import { useLocation } from 'react-router-dom';

import { useAuthSession } from '../store/authStore';
import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  shouldHoldAuthUiDuringBootstrap,
} from '../utils/authBootstrap';

export const useAuthBootstrapUiState = () => {
  const location = useLocation();
  const { isAuthLoading, isLoggedIn, userId } = useAuthSession();

  return {
    isAuthBootstrapPending: shouldHoldAuthUiDuringBootstrap(location.pathname, {
      isLoggedIn,
      hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
      authBootstrapMeta: getPersistedAuthBootstrapMeta(),
    }),
    isAuthLoading,
    isLoggedIn,
    userId,
  };
};
