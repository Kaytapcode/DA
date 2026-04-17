import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];       // allowed roles, e.g. ['SysAdmin'] or ['OrgAdmin', 'SysAdmin']
  requireOrg?: boolean;   // require org context (orgId set)
}

const LoadingScreen: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  requireOrg = false,
}) => {
  const { isAuthenticated, isLoading, user, orgId } = useAuthContext();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireOrg && !orgId) {
    return <Navigate to="/user/organizations" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && user) {
    const userRole = user.isSystemAdmin ? 'SysAdmin' : user.role;
    const hasRole = roles.includes(userRole);
    if (!hasRole) {
      // Redirect to appropriate dashboard based on actual role
      const dashboardByRole: Record<string, string> = {
        SysAdmin: '/sysadmin/dashboard',
        OrgAdmin: '/admin/dashboard',
        Teacher: '/admin/dashboard',
        Student: '/user/home',
      };
      return <Navigate to={dashboardByRole[userRole] ?? '/user/home'} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
