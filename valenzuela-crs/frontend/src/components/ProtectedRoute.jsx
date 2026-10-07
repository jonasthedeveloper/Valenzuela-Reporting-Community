import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './Feedback';

const HOME_FOR = { resident: '/dashboard', staff: '/staff/tasks', admin: '/admin' };

export const homeFor = (role) => HOME_FOR[role] || '/dashboard';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loading label="Restoring your session…" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loading label="Loading…" />
      </div>
    );
  }
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
