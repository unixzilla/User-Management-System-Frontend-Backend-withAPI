import { useAuth } from '@/context/AuthContext';
import { hasRole, isAdmin, canViewUser, canEditUser, canDeleteUser, canManageRoles } from '@/utils/permissions';

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  return {
    user,
    isAuthenticated,
    hasRole: (role: string) => hasRole(user, role),
    isAdmin: () => isAdmin(user),
    canViewUser: (userId: string) => canViewUser(user, userId),
    canEditUser: (userId: string) => canEditUser(user, userId),
    canDeleteUser: () => canDeleteUser(user),
    canManageRoles: () => canManageRoles(user),
  };
}
