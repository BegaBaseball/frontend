import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { buildLoginPath } from '../utils/loginRedirect';
import { isAdminRole, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';

export default function AdminRoute() {
  const { isLoggedIn } = useAuthSession();
  const { userRole } = useAuthProfileSnapshot();
  const isAdmin = isAdminRole(userRole);
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
