'use client';

import React from 'react';
import { Navigate } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from '@/components/common/FullPageLoader/FullPageLoader';
import { isAdmin } from '@/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin(user)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
