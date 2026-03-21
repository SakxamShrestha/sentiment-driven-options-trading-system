import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { Spinner } from '../shared/Spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
