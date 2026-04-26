import { useAuth } from '@/context/AuthContext';
import {
  hasPermission,
  hasRole,
  isAdmin,
  canViewUser,
  canEditUser,
  canDeleteUser,
  canManageRoles,
  canManagePermissions,
  canManageGroups,
} from '@/utils/permissions';

export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  return {
    user,
    isAuthenticated,
    hasPermission: (perm: string) => hasPermission(user, perm),
    hasRole: (role: string) => hasRole(user, role),
    isAdmin: () => isAdmin(user),
    canViewUser: (userId: string) => canViewUser(user, userId),
    canEditUser: (userId: string) => canEditUser(user, userId),
    canDeleteUser: () => canDeleteUser(user),
    canManageRoles: () => canManageRoles(user),
    canManagePermissions: () => canManagePermissions(user),
    canManageGroups: () => canManageGroups(user),
  };
}
