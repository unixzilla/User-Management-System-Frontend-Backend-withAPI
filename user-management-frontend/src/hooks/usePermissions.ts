import { useAuth } from '@/context/AuthContext';
import {
  hasPermission,
  hasRole,
  isAdmin,
  canViewUser,
  canEditUser,
  canDeleteUser,
  canViewUsers,
  canEditUsers,
  canDeleteUsers,
  canViewRoles,
  canManageRoles,
  canDeleteRoles,
  canViewGroups,
  canManageGroups,
  canDeleteGroups,
  canViewPermissions,
  canManagePermissions,
  canDeletePermissions,
  canViewResources,
  canManageResources,
  canDeleteResources,
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
    canViewUsers: () => canViewUsers(user),
    canEditUsers: () => canEditUsers(user),
    canDeleteUsers: () => canDeleteUsers(user),
    canViewRoles: () => canViewRoles(user),
    canManageRoles: () => canManageRoles(user),
    canDeleteRoles: () => canDeleteRoles(user),
    canViewGroups: () => canViewGroups(user),
    canManageGroups: () => canManageGroups(user),
    canDeleteGroups: () => canDeleteGroups(user),
    canViewPermissions: () => canViewPermissions(user),
    canManagePermissions: () => canManagePermissions(user),
    canDeletePermissions: () => canDeletePermissions(user),
    canViewResources: () => canViewResources(user),
    canManageResources: () => canManageResources(user),
    canDeleteResources: () => canDeleteResources(user),
  };
}
