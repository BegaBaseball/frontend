import { useNotificationSocket } from '../hooks/useNotificationSocket';

export default function AuthenticatedNotificationSocketBridge() {
  useNotificationSocket(true);
  return null;
}
