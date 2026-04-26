import { User } from '@/types';

export const hasPermission = (user: User | null, permission: string): boolean =>
  !!user?.permissions?.includes(permission) || !!user?.permissions?.includes('admin');

export const hasRole = (user: User | null, role: string): boolean =>
  !!user?.roles?.includes(role);

export const isAdmin = (user: User | null): boolean =>
  hasPermission(user, 'admin');

// Granular permission checks
export const canViewUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.read');

export const canEditUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.write');

export const canDeleteUsers = (user: User | null): boolean =>
  hasPermission(user, 'users.delete');

export const canManageRoles = (user: User | null): boolean =>
  hasPermission(user, 'roles.write');

export const canManagePermissions = (user: User | null): boolean =>
  hasPermission(user, 'permissions.write');

export const canManageGroups = (user: User | null): boolean =>
  hasPermission(user, 'groups.write');

// Composite checks
export const canViewUser = (currentUser: User | null, targetUserId: string): boolean =>
  !!currentUser && (currentUser.id === targetUserId || canViewUsers(currentUser));

export const canEditUser = canViewUser;

export const canDeleteUser = (user: User | null): boolean => canDeleteUsers(user);
