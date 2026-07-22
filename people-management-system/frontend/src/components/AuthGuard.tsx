import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AuthGuard({ children, role }: { children: JSX.Element, role?: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}
