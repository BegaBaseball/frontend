import { useEffect } from 'react';

import { isAdminRole, useAuthProfileSnapshot, useAuthSession } from '../../store/authStore';

export type HomeAuthSnapshot = {
  userId: number | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
};

interface HomeAuthBridgeProps {
  onSnapshotChange: (snapshot: HomeAuthSnapshot) => void;
}

export default function HomeAuthBridge({ onSnapshotChange }: HomeAuthBridgeProps) {
  const { userId, userRole } = useAuthProfileSnapshot();
  const { isLoggedIn } = useAuthSession();

  useEffect(() => {
    onSnapshotChange({
      userId: userId ?? null,
      isLoggedIn,
      isAdmin: isAdminRole(userRole),
    });
  }, [isLoggedIn, onSnapshotChange, userId, userRole]);

  return null;
}
