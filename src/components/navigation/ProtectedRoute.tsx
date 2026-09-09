import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type CashierRole } from '../../store/authStore';

export interface ProtectedRouteProps {
  requiredRole: CashierRole;
  children?: React.ReactNode;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole,
  children,
  fallbackPath = '/',
}) => {
  const hasRole = useAuthStore((state) => state.hasRole);
  const isAuthorized = hasRole(requiredRole);

  if (!isAuthorized) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
